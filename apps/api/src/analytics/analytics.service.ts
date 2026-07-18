import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CompensationType,
  convertToBaseMinor,
  LedgerEntryType,
} from '@cyberpedia/shared';
import type { Currency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 86_400_000;

export type Granularity = 'day' | 'week' | 'month';

export interface TimeseriesFilters {
  courseId?: string;
  methodId?: string;
  currencyCode?: string;
}

// Money already moved (payments, ledger, payouts) converts with the rate
// SNAPSHOT stored on each row. Money not yet moved (outstanding) converts at
// CURRENT rates — there is nothing else to snapshot.
function snapshotToBase(
  row: {
    amountMinor: number;
    ratePerBase: unknown;
    currency: { decimals: number };
  },
  base: Currency,
): number {
  return convertToBaseMinor({
    amountMinor: row.amountMinor,
    decimals: row.currency.decimals,
    ratePerBase: Number(row.ratePerBase),
    baseDecimals: base.decimals,
  });
}

function bucketStart(date: Date, granularity: Granularity): string {
  const day = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  if (granularity === 'week') {
    day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  } else if (granularity === 'month') {
    day.setUTCDate(1);
  }
  return day.toISOString().slice(0, 10);
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(from?: Date, to?: Date) {
    const base = await this.baseCurrency();
    const now = new Date();
    const periodTo = to ?? now;
    const periodFrom =
      from ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    if (periodFrom >= periodTo) {
      throw new BadRequestException('"from" must be before "to"');
    }
    const spanMs = periodTo.getTime() - periodFrom.getTime();
    const previousFrom = new Date(periodFrom.getTime() - spanMs);

    const [current, previous, outstanding] = await Promise.all([
      this.totals(periodFrom, periodTo, base),
      this.totals(previousFrom, periodFrom, base),
      this.outstanding(base),
    ]);

    return {
      period: { from: periodFrom, to: periodTo },
      baseCurrency: {
        code: base.code,
        symbol: base.symbol,
        decimals: base.decimals,
      },
      income: {
        totalMinor: current.incomeMinor,
        coursePaymentsMinor: current.coursePaymentsMinor,
        otherIncomeMinor: current.otherIncomeMinor,
        previousTotalMinor: previous.incomeMinor,
      },
      outcome: {
        totalMinor: current.outcomeMinor,
        expensesMinor: current.expensesMinor,
        teacherPayoutsMinor: current.teacherPayoutsMinor,
        previousTotalMinor: previous.outcomeMinor,
      },
      netMinor: current.incomeMinor - current.outcomeMinor,
      previousNetMinor: previous.incomeMinor - previous.outcomeMinor,
      outstandingMinor: outstanding.outstandingMinor,
      overdueMinor: outstanding.overdueMinor,
      overdueCount: outstanding.overdueCount,
    };
  }

  async timeseries(
    from: Date,
    to: Date,
    granularity: Granularity,
    filters: TimeseriesFilters,
  ) {
    const base = await this.baseCurrency();

    const [payments, entries, payouts] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where: {
          voidedAt: null,
          paidAt: { gte: from, lte: to },
          ...(filters.methodId ? { methodId: filters.methodId } : {}),
          ...(filters.currencyCode
            ? { currencyCode: filters.currencyCode }
            : {}),
          ...(filters.courseId
            ? { enrollment: { courseId: filters.courseId } }
            : {}),
        },
        select: {
          amountMinor: true,
          ratePerBase: true,
          paidAt: true,
          currency: { select: { decimals: true } },
        },
      }),
      // ledger entries are not course-related; skip them when course/method filters are on
      filters.courseId || filters.methodId
        ? Promise.resolve([])
        : this.prisma.ledgerEntry.findMany({
            where: {
              date: { gte: from, lte: to },
              ...(filters.currencyCode
                ? { currencyCode: filters.currencyCode }
                : {}),
            },
            select: {
              type: true,
              amountMinor: true,
              ratePerBase: true,
              date: true,
              currency: { select: { decimals: true } },
            },
          }),
      filters.methodId
        ? Promise.resolve([])
        : this.prisma.teacherPayout.findMany({
            where: {
              date: { gte: from, lte: to },
              ...(filters.currencyCode
                ? { currencyCode: filters.currencyCode }
                : {}),
              ...(filters.courseId ? { courseId: filters.courseId } : {}),
            },
            select: {
              amountMinor: true,
              ratePerBase: true,
              date: true,
              currency: { select: { decimals: true } },
            },
          }),
    ]);

    const buckets = new Map<
      string,
      { incomeMinor: number; outcomeMinor: number }
    >();
    const add = (date: Date, amount: number, kind: 'income' | 'outcome') => {
      const key = bucketStart(date, granularity);
      const bucket = buckets.get(key) ?? { incomeMinor: 0, outcomeMinor: 0 };
      if (kind === 'income') bucket.incomeMinor += amount;
      else bucket.outcomeMinor += amount;
      buckets.set(key, bucket);
    };

    for (const payment of payments) {
      add(payment.paidAt, snapshotToBase(payment, base), 'income');
    }
    for (const entry of entries) {
      add(
        entry.date,
        snapshotToBase(entry, base),
        entry.type === LedgerEntryType.INCOME ? 'income' : 'outcome',
      );
    }
    for (const payout of payouts) {
      add(payout.date, snapshotToBase(payout, base), 'outcome');
    }

    return {
      baseCurrency: {
        code: base.code,
        symbol: base.symbol,
        decimals: base.decimals,
      },
      granularity,
      buckets: [...buckets.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([bucket, sums]) => ({
          bucket,
          incomeMinor: sums.incomeMinor,
          outcomeMinor: sums.outcomeMinor,
          netMinor: sums.incomeMinor - sums.outcomeMinor,
        })),
    };
  }

  // Per-course, in the COURSE currency (plus a base conversion of collected
  // and margin at current rates). Teacher cost is what teachers have EARNED
  // (accrual), regardless of what has been paid out so far.
  async courseReport(courseId?: string) {
    const base = await this.baseCurrency();
    const courses = await this.prisma.course.findMany({
      where: courseId ? { id: courseId } : undefined,
      include: {
        currency: {
          select: {
            code: true,
            symbol: true,
            decimals: true,
            ratePerBase: true,
          },
        },
        teachers: true,
      },
      orderBy: { name: 'asc' },
    });

    const [enrollments, installments, payments] = await Promise.all([
      this.prisma.enrollment.findMany({
        select: { courseId: true, isFree: true },
      }),
      this.prisma.installment.findMany({
        where: { enrollment: { isFree: false } },
        select: {
          amountMinor: true,
          enrollment: { select: { courseId: true } },
        },
      }),
      this.prisma.paymentTransaction.findMany({
        where: { voidedAt: null },
        select: {
          appliedMinor: true,
          enrollment: { select: { courseId: true } },
        },
      }),
    ]);

    const enrollCount = new Map<string, number>();
    const freeCount = new Map<string, number>();
    for (const enrollment of enrollments) {
      enrollCount.set(
        enrollment.courseId,
        (enrollCount.get(enrollment.courseId) ?? 0) + 1,
      );
      if (enrollment.isFree) {
        freeCount.set(
          enrollment.courseId,
          (freeCount.get(enrollment.courseId) ?? 0) + 1,
        );
      }
    }
    const expected = new Map<string, number>();
    for (const installment of installments) {
      const id = installment.enrollment.courseId;
      expected.set(id, (expected.get(id) ?? 0) + installment.amountMinor);
    }
    const collected = new Map<string, number>();
    for (const payment of payments) {
      const id = payment.enrollment.courseId;
      collected.set(id, (collected.get(id) ?? 0) + payment.appliedMinor);
    }

    return courses.map((course) => {
      const collectedMinor = collected.get(course.id) ?? 0;
      const expectedMinor = expected.get(course.id) ?? 0;
      let teacherCostMinor = 0;
      for (const assignment of course.teachers) {
        if (assignment.compensationType === CompensationType.PERCENTAGE) {
          teacherCostMinor += Math.round(
            (collectedMinor * Number(assignment.percent)) / 100,
          );
        } else if (
          assignment.compensationType === CompensationType.FIXED_COURSE
        ) {
          teacherCostMinor += assignment.amountMinor ?? 0;
        } else {
          teacherCostMinor +=
            (assignment.amountMinor ?? 0) * course.sessionsCount;
        }
      }
      const marginMinor = collectedMinor - teacherCostMinor;
      const toBase = (amountMinor: number) =>
        convertToBaseMinor({
          amountMinor,
          decimals: course.currency.decimals,
          ratePerBase: Number(course.currency.ratePerBase),
          baseDecimals: base.decimals,
        });
      return {
        course: {
          id: course.id,
          name: course.name,
          status: course.status,
          currency: {
            code: course.currency.code,
            symbol: course.currency.symbol,
            decimals: course.currency.decimals,
          },
        },
        enrollments: enrollCount.get(course.id) ?? 0,
        freeEnrollments: freeCount.get(course.id) ?? 0,
        expectedMinor,
        collectedMinor,
        outstandingMinor: Math.max(0, expectedMinor - collectedMinor),
        teacherCostMinor,
        marginMinor,
        collectedBaseMinor: toBase(collectedMinor),
        marginBaseMinor: toBase(marginMinor),
      };
    });
  }

  // Per-teacher earned/paid/balance, netted per currency and totalled in the
  // base currency at CURRENT rates.
  async teacherReport(teacherId?: string) {
    const base = await this.baseCurrency();
    const [teachers, payments, payouts, currencies] = await Promise.all([
      this.prisma.teacher.findMany({
        where: teacherId ? { id: teacherId } : undefined,
        include: {
          courses: {
            include: {
              course: {
                select: { id: true, sessionsCount: true, currencyCode: true },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.paymentTransaction.findMany({
        where: { voidedAt: null },
        select: {
          appliedMinor: true,
          enrollment: { select: { courseId: true } },
        },
      }),
      this.prisma.teacherPayout.findMany({
        select: { teacherId: true, amountMinor: true, currencyCode: true },
      }),
      this.prisma.currency.findMany(),
    ]);

    const collectedByCourse = new Map<string, number>();
    for (const payment of payments) {
      const id = payment.enrollment.courseId;
      collectedByCourse.set(
        id,
        (collectedByCourse.get(id) ?? 0) + payment.appliedMinor,
      );
    }
    const paidByTeacher = new Map<string, Map<string, number>>();
    for (const payout of payouts) {
      const byCurrency =
        paidByTeacher.get(payout.teacherId) ?? new Map<string, number>();
      byCurrency.set(
        payout.currencyCode,
        (byCurrency.get(payout.currencyCode) ?? 0) + payout.amountMinor,
      );
      paidByTeacher.set(payout.teacherId, byCurrency);
    }

    const toBase = (currencyCode: string, amountMinor: number) => {
      const currency = currencies.find((c) => c.code === currencyCode);
      if (!currency) return 0;
      return convertToBaseMinor({
        amountMinor,
        decimals: currency.decimals,
        ratePerBase: Number(currency.ratePerBase),
        baseDecimals: base.decimals,
      });
    };

    return teachers.map((teacher) => {
      const earnedByCurrency = new Map<string, number>();
      for (const assignment of teacher.courses) {
        const collectedMinor = collectedByCourse.get(assignment.course.id) ?? 0;
        let earnedMinor: number;
        if (assignment.compensationType === CompensationType.PERCENTAGE) {
          earnedMinor = Math.round(
            (collectedMinor * Number(assignment.percent)) / 100,
          );
        } else if (
          assignment.compensationType === CompensationType.FIXED_COURSE
        ) {
          earnedMinor = assignment.amountMinor ?? 0;
        } else {
          earnedMinor =
            (assignment.amountMinor ?? 0) * assignment.course.sessionsCount;
        }
        const code = assignment.course.currencyCode;
        earnedByCurrency.set(
          code,
          (earnedByCurrency.get(code) ?? 0) + earnedMinor,
        );
      }
      const paidCurrencies =
        paidByTeacher.get(teacher.id) ?? new Map<string, number>();
      const codes = [
        ...new Set([...earnedByCurrency.keys(), ...paidCurrencies.keys()]),
      ];
      const byCurrency = codes.map((code) => {
        const earnedMinor = earnedByCurrency.get(code) ?? 0;
        const paidMinor = paidCurrencies.get(code) ?? 0;
        return {
          currencyCode: code,
          earnedMinor,
          paidMinor,
          balanceMinor: earnedMinor - paidMinor,
        };
      });
      const earnedBaseMinor = byCurrency.reduce(
        (sum, row) => sum + toBase(row.currencyCode, row.earnedMinor),
        0,
      );
      const paidBaseMinor = byCurrency.reduce(
        (sum, row) => sum + toBase(row.currencyCode, row.paidMinor),
        0,
      );
      return {
        teacher: { id: teacher.id, name: teacher.name },
        courses: teacher.courses.length,
        byCurrency,
        earnedBaseMinor,
        paidBaseMinor,
        balanceBaseMinor: earnedBaseMinor - paidBaseMinor,
      };
    });
  }

  // --- helpers ---

  private async baseCurrency() {
    const base = await this.prisma.currency.findFirst({
      where: { isBase: true },
    });
    if (!base) {
      throw new BadRequestException('No base currency configured');
    }
    return base;
  }

  private async totals(from: Date, to: Date, base: Currency) {
    const [payments, entries, payouts] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where: { voidedAt: null, paidAt: { gte: from, lte: to } },
        select: {
          amountMinor: true,
          ratePerBase: true,
          currency: { select: { decimals: true } },
        },
      }),
      this.prisma.ledgerEntry.findMany({
        where: { date: { gte: from, lte: to } },
        select: {
          type: true,
          amountMinor: true,
          ratePerBase: true,
          currency: { select: { decimals: true } },
        },
      }),
      this.prisma.teacherPayout.findMany({
        where: { date: { gte: from, lte: to } },
        select: {
          amountMinor: true,
          ratePerBase: true,
          currency: { select: { decimals: true } },
        },
      }),
    ]);

    const coursePaymentsMinor = payments.reduce(
      (sum, row) => sum + snapshotToBase(row, base),
      0,
    );
    const otherIncomeMinor = entries
      .filter((entry) => entry.type === LedgerEntryType.INCOME)
      .reduce((sum, row) => sum + snapshotToBase(row, base), 0);
    const expensesMinor = entries
      .filter((entry) => entry.type === LedgerEntryType.EXPENSE)
      .reduce((sum, row) => sum + snapshotToBase(row, base), 0);
    const teacherPayoutsMinor = payouts.reduce(
      (sum, row) => sum + snapshotToBase(row, base),
      0,
    );

    return {
      coursePaymentsMinor,
      otherIncomeMinor,
      incomeMinor: coursePaymentsMinor + otherIncomeMinor,
      expensesMinor,
      teacherPayoutsMinor,
      outcomeMinor: expensesMinor + teacherPayoutsMinor,
    };
  }

  private async outstanding(base: Currency) {
    const installments = await this.prisma.installment.findMany({
      where: { amountMinor: { gt: 0 }, enrollment: { isFree: false } },
      select: {
        id: true,
        amountMinor: true,
        dueDate: true,
        enrollment: {
          select: {
            course: {
              select: {
                currency: { select: { decimals: true, ratePerBase: true } },
              },
            },
          },
        },
      },
    });
    if (installments.length === 0) {
      return { outstandingMinor: 0, overdueMinor: 0, overdueCount: 0 };
    }

    const paidGroups = await this.prisma.paymentTransaction.groupBy({
      by: ['installmentId'],
      where: {
        voidedAt: null,
        installmentId: {
          in: installments.map((installment) => installment.id),
        },
      },
      _sum: { appliedMinor: true },
    });
    const paid = new Map(
      paidGroups.map((group) => [
        group.installmentId,
        group._sum.appliedMinor ?? 0,
      ]),
    );

    const now = Date.now();
    let outstandingMinor = 0;
    let overdueMinor = 0;
    let overdueCount = 0;
    for (const installment of installments) {
      const remaining =
        installment.amountMinor - (paid.get(installment.id) ?? 0);
      if (remaining <= 0) continue;
      const currency = installment.enrollment.course.currency;
      const remainingBase = convertToBaseMinor({
        amountMinor: remaining,
        decimals: currency.decimals,
        ratePerBase: Number(currency.ratePerBase),
        baseDecimals: base.decimals,
      });
      outstandingMinor += remainingBase;
      if (now >= installment.dueDate.getTime() + DAY_MS) {
        overdueMinor += remainingBase;
        overdueCount += 1;
      }
    }
    return { outstandingMinor, overdueMinor, overdueCount };
  }
}
