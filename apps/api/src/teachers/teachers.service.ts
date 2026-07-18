import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CompensationType,
  convertToBaseMinor,
  type CreateTeacherInput,
  type CreateTeacherPayoutInput,
  type UpdateTeacherInput,
} from '@cyberpedia/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.teacher.findMany({
      include: { _count: { select: { courses: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        courses: {
          include: {
            course: { select: { id: true, name: true, status: true } },
          },
        },
      },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
    return teacher;
  }

  create(input: CreateTeacherInput) {
    return this.prisma.teacher.create({ data: input });
  }

  async update(id: string, input: UpdateTeacherInput) {
    await this.ensureExists(id);
    return this.prisma.teacher.update({ where: { id }, data: input });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    const assignments = await this.prisma.courseTeacher.count({
      where: { teacherId: id },
    });
    if (assignments > 0) {
      throw new ConflictException(
        'Teacher is assigned to courses and cannot be deleted',
      );
    }
    await this.prisma.teacher.delete({ where: { id } });
  }

  // Earned per course, in the course's currency:
  //   PERCENTAGE     → collected (non-voided) × percent
  //   FIXED_COURSE   → the fixed amount
  //   FIXED_SESSION  → rate × course sessions count
  // Balances are netted per currency; base totals use CURRENT rates.
  async earnings(teacherId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        courses: {
          include: {
            course: {
              select: {
                id: true,
                name: true,
                status: true,
                sessionsCount: true,
                currency: {
                  select: { code: true, symbol: true, decimals: true },
                },
              },
            },
          },
        },
      },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const courseIds = teacher.courses.map((assignment) => assignment.courseId);
    const payments = courseIds.length
      ? await this.prisma.paymentTransaction.findMany({
          where: {
            voidedAt: null,
            enrollment: { courseId: { in: courseIds } },
          },
          select: {
            amountMinor: true,
            enrollment: { select: { courseId: true } },
          },
        })
      : [];
    const collectedByCourse = new Map<string, number>();
    for (const payment of payments) {
      const courseId = payment.enrollment.courseId;
      collectedByCourse.set(
        courseId,
        (collectedByCourse.get(courseId) ?? 0) + payment.amountMinor,
      );
    }

    const courses = teacher.courses.map((assignment) => {
      const collectedMinor = collectedByCourse.get(assignment.courseId) ?? 0;
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
      return {
        course: assignment.course,
        compensationType: assignment.compensationType,
        percent: assignment.percent,
        amountMinor: assignment.amountMinor,
        collectedMinor,
        earnedMinor,
      };
    });

    const payouts = await this.prisma.teacherPayout.findMany({
      where: { teacherId },
      include: {
        course: { select: { id: true, name: true } },
        currency: { select: { code: true, symbol: true, decimals: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    const earnedByCurrency = new Map<string, number>();
    for (const row of courses) {
      const code = row.course.currency.code;
      earnedByCurrency.set(
        code,
        (earnedByCurrency.get(code) ?? 0) + row.earnedMinor,
      );
    }
    const paidByCurrency = new Map<string, number>();
    for (const payout of payouts) {
      paidByCurrency.set(
        payout.currencyCode,
        (paidByCurrency.get(payout.currencyCode) ?? 0) + payout.amountMinor,
      );
    }

    const codes = [
      ...new Set([...earnedByCurrency.keys(), ...paidByCurrency.keys()]),
    ];
    const currencies = await this.prisma.currency.findMany({
      where: { OR: [{ code: { in: codes } }, { isBase: true }] },
    });
    const base = currencies.find((currency) => currency.isBase);

    const byCurrency = codes.map((code) => {
      const earnedMinor = earnedByCurrency.get(code) ?? 0;
      const paidMinor = paidByCurrency.get(code) ?? 0;
      return {
        currencyCode: code,
        earnedMinor,
        paidMinor,
        balanceMinor: earnedMinor - paidMinor,
      };
    });

    let baseTotals = null;
    if (base) {
      const convert = (code: string, amountMinor: number) => {
        const currency = currencies.find((c) => c.code === code);
        if (!currency) return 0;
        return convertToBaseMinor({
          amountMinor,
          decimals: currency.decimals,
          ratePerBase: Number(currency.ratePerBase),
          baseDecimals: base.decimals,
        });
      };
      const earnedMinor = byCurrency.reduce(
        (sum, row) => sum + convert(row.currencyCode, row.earnedMinor),
        0,
      );
      const paidMinor = byCurrency.reduce(
        (sum, row) => sum + convert(row.currencyCode, row.paidMinor),
        0,
      );
      baseTotals = {
        currencyCode: base.code,
        earnedMinor,
        paidMinor,
        balanceMinor: earnedMinor - paidMinor,
      };
    }

    return {
      teacher: { id: teacher.id, name: teacher.name },
      courses,
      payouts,
      totals: { byCurrency, base: baseTotals },
    };
  }

  async createPayout(
    teacherId: string,
    input: CreateTeacherPayoutInput,
    currentUserId: string,
  ) {
    await this.ensureExists(teacherId);

    let currencyCode: string;
    if (input.courseId) {
      const assignment = await this.prisma.courseTeacher.findUnique({
        where: { courseId_teacherId: { courseId: input.courseId, teacherId } },
        include: { course: { select: { currencyCode: true } } },
      });
      if (!assignment) {
        throw new BadRequestException('Teacher is not assigned to this course');
      }
      currencyCode = assignment.course.currencyCode;
      if (input.currencyCode && input.currencyCode !== currencyCode) {
        throw new BadRequestException('Course payouts use the course currency');
      }
    } else {
      if (!input.currencyCode) {
        throw new BadRequestException(
          'currencyCode is required when the payout is not linked to a course',
        );
      }
      currencyCode = input.currencyCode;
    }

    const currency = await this.prisma.currency.findUnique({
      where: { code: currencyCode },
    });
    if (!currency || !currency.isActive) {
      throw new BadRequestException('Unknown or inactive currency');
    }

    return this.prisma.teacherPayout.create({
      data: {
        teacherId,
        courseId: input.courseId,
        amountMinor: input.amountMinor,
        currencyCode,
        ratePerBase: currency.ratePerBase,
        date: input.date ?? new Date(),
        note: input.note,
        createdById: currentUserId,
      },
      include: {
        course: { select: { id: true, name: true } },
        currency: { select: { code: true, symbol: true, decimals: true } },
      },
    });
  }

  async deletePayout(teacherId: string, payoutId: string) {
    const payout = await this.prisma.teacherPayout.findUnique({
      where: { id: payoutId },
    });
    if (!payout || payout.teacherId !== teacherId) {
      throw new NotFoundException('Payout not found');
    }
    await this.prisma.teacherPayout.delete({ where: { id: payoutId } });
  }

  private async ensureExists(id: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id } });
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
  }
}
