import { BadRequestException, Injectable } from '@nestjs/common';
import { CompensationType, LedgerEntryType } from '@cyberpedia/shared';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 86_400_000;

// Money is never converted between currencies — every figure stays in the
// currency it actually lives in, like separate cash boxes.

interface PeriodSums {
  coursePaymentsMinor: number;
  otherIncomeMinor: number;
  expensesMinor: number;
  teacherPayoutsMinor: number;
}

function emptySums(): PeriodSums {
  return {
    coursePaymentsMinor: 0,
    otherIncomeMinor: 0,
    expensesMinor: 0,
    teacherPayoutsMinor: 0,
  };
}

interface OutstandingSums {
  outstandingMinor: number;
  overdueMinor: number;
  overdueCount: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(from?: Date, to?: Date) {
    const now = new Date();
    const periodTo = to ?? now;
    const periodFrom =
      from ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    if (periodFrom >= periodTo) {
      throw new BadRequestException('"from" must be before "to"');
    }
    const spanMs = periodTo.getTime() - periodFrom.getTime();
    const previousFrom = new Date(periodFrom.getTime() - spanMs);

    const [currencies, current, previous, outstanding] = await Promise.all([
      this.prisma.currency.findMany(),
      this.periodSums(periodFrom, periodTo),
      this.periodSums(previousFrom, periodFrom),
      this.outstandingByCurrency(),
    ]);
    const info = new Map(
      currencies.map((currency) => [
        currency.code,
        {
          code: currency.code,
          symbol: currency.symbol,
          decimals: currency.decimals,
        },
      ]),
    );

    const codes = new Set([
      ...current.keys(),
      ...previous.keys(),
      ...outstanding.keys(),
    ]);
    let overdueCount = 0;
    const byCurrency = [...codes].sort().map((code) => {
      const cur = current.get(code) ?? emptySums();
      const prev = previous.get(code) ?? emptySums();
      const out = outstanding.get(code) ?? {
        outstandingMinor: 0,
        overdueMinor: 0,
        overdueCount: 0,
      };
      overdueCount += out.overdueCount;
      const incomeMinor = cur.coursePaymentsMinor + cur.otherIncomeMinor;
      const outcomeMinor = cur.expensesMinor + cur.teacherPayoutsMinor;
      const previousIncomeMinor =
        prev.coursePaymentsMinor + prev.otherIncomeMinor;
      const previousOutcomeMinor =
        prev.expensesMinor + prev.teacherPayoutsMinor;
      return {
        currency: info.get(code) ?? { code, symbol: code, decimals: 2 },
        ...cur,
        incomeMinor,
        outcomeMinor,
        netMinor: incomeMinor - outcomeMinor,
        previousIncomeMinor,
        previousOutcomeMinor,
        previousNetMinor: previousIncomeMinor - previousOutcomeMinor,
        ...out,
      };
    });

    return {
      period: { from: periodFrom, to: periodTo },
      byCurrency,
      overdueCount,
    };
  }

  private async periodSums(
    from: Date,
    to: Date,
  ): Promise<Map<string, PeriodSums>> {
    const [payments, entries, payouts] = await Promise.all([
      this.prisma.paymentTransaction.groupBy({
        by: ['currencyCode'],
        where: { voidedAt: null, paidAt: { gte: from, lte: to } },
        _sum: { amountMinor: true },
      }),
      this.prisma.ledgerEntry.groupBy({
        by: ['currencyCode', 'type'],
        where: { date: { gte: from, lte: to } },
        _sum: { amountMinor: true },
      }),
      this.prisma.teacherPayout.groupBy({
        by: ['currencyCode'],
        where: { date: { gte: from, lte: to } },
        _sum: { amountMinor: true },
      }),
    ]);

    const sums = new Map<string, PeriodSums>();
    const bucket = (code: string): PeriodSums => {
      const existing = sums.get(code) ?? emptySums();
      sums.set(code, existing);
      return existing;
    };
    for (const row of payments) {
      bucket(row.currencyCode).coursePaymentsMinor += row._sum.amountMinor ?? 0;
    }
    for (const row of entries) {
      if (row.type === LedgerEntryType.INCOME) {
        bucket(row.currencyCode).otherIncomeMinor += row._sum.amountMinor ?? 0;
      } else {
        bucket(row.currencyCode).expensesMinor += row._sum.amountMinor ?? 0;
      }
    }
    for (const row of payouts) {
      bucket(row.currencyCode).teacherPayoutsMinor += row._sum.amountMinor ?? 0;
    }
    return sums;
  }

  private async outstandingByCurrency(): Promise<Map<string, OutstandingSums>> {
    const result = new Map<string, OutstandingSums>();
    const installments = await this.prisma.installment.findMany({
      where: { amountMinor: { gt: 0 }, enrollment: { isFree: false } },
      select: {
        id: true,
        amountMinor: true,
        dueDate: true,
        enrollment: {
          select: { course: { select: { currencyCode: true } } },
        },
      },
    });
    if (installments.length === 0) return result;

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
    for (const installment of installments) {
      const remaining =
        installment.amountMinor - (paid.get(installment.id) ?? 0);
      if (remaining <= 0) continue;
      const code = installment.enrollment.course.currencyCode;
      const entry = result.get(code) ?? {
        outstandingMinor: 0,
        overdueMinor: 0,
        overdueCount: 0,
      };
      entry.outstandingMinor += remaining;
      if (now >= installment.dueDate.getTime() + DAY_MS) {
        entry.overdueMinor += remaining;
        entry.overdueCount += 1;
      }
      result.set(code, entry);
    }
    return result;
  }

  // Per-course, entirely in the COURSE currency. Teacher cost is what
  // teachers have EARNED (accrual), regardless of payouts so far.
  async courseReport(courseId?: string) {
    const courses = await this.prisma.course.findMany({
      where: courseId ? { id: courseId } : undefined,
      include: {
        currency: { select: { code: true, symbol: true, decimals: true } },
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
      return {
        course: {
          id: course.id,
          name: course.name,
          status: course.status,
          currency: course.currency,
        },
        enrollments: enrollCount.get(course.id) ?? 0,
        freeEnrollments: freeCount.get(course.id) ?? 0,
        expectedMinor,
        collectedMinor,
        outstandingMinor: Math.max(0, expectedMinor - collectedMinor),
        teacherCostMinor,
        marginMinor: collectedMinor - teacherCostMinor,
      };
    });
  }

  // Per-teacher earned/paid/balance, netted per currency — no conversion.
  async teacherReport(teacherId?: string) {
    const [teachers, payments, payouts] = await Promise.all([
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
      ].sort();
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
      return {
        teacher: { id: teacher.id, name: teacher.name },
        courses: teacher.courses.length,
        byCurrency,
      };
    });
  }
}
