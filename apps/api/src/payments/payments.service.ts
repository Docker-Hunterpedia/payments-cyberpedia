import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InstallmentStatus,
  type CreatePaymentInput,
  type UpdatePaymentInput,
} from '@cyberpedia/shared';
import { PrismaService } from '../prisma/prisma.service';
import { toInstallmentView } from '../enrollments/installment-view';
import { sumPaidByInstallment } from './payment-sums';

const paymentInclude = {
  method: { select: { id: true, name: true } },
  recordedBy: { select: { id: true, name: true } },
  voidedBy: { select: { id: true, name: true } },
  installment: {
    select: { id: true, seq: true, amountMinor: true, dueDate: true },
  },
  enrollment: {
    select: {
      id: true,
      student: { select: { id: true, name: true, phone: true } },
      course: {
        select: {
          id: true,
          name: true,
          currency: { select: { code: true, symbol: true, decimals: true } },
        },
      },
    },
  },
};

export interface PaymentListFilters {
  enrollmentId?: string;
  courseId?: string;
  studentId?: string;
  methodId?: string;
  from?: Date;
  to?: Date;
  includeVoided?: boolean;
}

export interface UnpaidFilters {
  courseId?: string;
  seq?: number;
  status?: InstallmentStatus;
  search?: string;
  dueFrom?: Date;
  dueTo?: Date;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreatePaymentInput, currentUserId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: input.enrollmentId },
      include: { course: true, installments: { orderBy: { seq: 'asc' } } },
    });
    if (!enrollment) {
      throw new BadRequestException('Unknown enrollment');
    }
    if (enrollment.isFree) {
      throw new BadRequestException(
        'This enrollment has the full-free badge — there is nothing to pay',
      );
    }

    const method = await this.prisma.paymentMethod.findUnique({
      where: { id: input.methodId },
    });
    if (!method || !method.isActive) {
      throw new BadRequestException('Unknown or inactive payment method');
    }

    const currency = await this.prisma.currency.findUnique({
      where: { code: enrollment.course.currencyCode },
    });
    if (!currency) {
      throw new BadRequestException('Course currency not found');
    }

    const paid = await sumPaidByInstallment(
      this.prisma,
      enrollment.installments.map((installment) => installment.id),
    );

    let installment;
    if (input.installmentId) {
      installment = enrollment.installments.find(
        (i) => i.id === input.installmentId,
      );
      if (!installment) {
        throw new BadRequestException(
          'Installment does not belong to this enrollment',
        );
      }
    } else {
      installment = enrollment.installments.find(
        (i) => (paid.get(i.id) ?? 0) < i.amountMinor,
      );
      if (!installment) {
        throw new BadRequestException('All installments are already paid');
      }
    }

    const remaining = installment.amountMinor - (paid.get(installment.id) ?? 0);
    if (remaining <= 0) {
      throw new BadRequestException('This installment is already fully paid');
    }
    if (input.amountMinor > remaining) {
      throw new BadRequestException(
        `Amount exceeds the remaining balance of this installment (remaining: ${remaining})`,
      );
    }

    const payment = await this.prisma.paymentTransaction.create({
      data: {
        enrollmentId: enrollment.id,
        installmentId: installment.id,
        amountMinor: input.amountMinor,
        currencyCode: enrollment.course.currencyCode,
        ratePerBase: currency.ratePerBase,
        methodId: input.methodId,
        paidAt: input.paidAt ?? new Date(),
        note: input.note,
        recordedById: currentUserId,
      },
      include: paymentInclude,
    });

    return {
      ...payment,
      installmentRemainingMinor: remaining - input.amountMinor,
    };
  }

  async nextInstallment(enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { installments: { orderBy: { seq: 'asc' } } },
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }
    if (enrollment.isFree) {
      return {
        installment: null,
        reason: 'Enrollment has the full-free badge',
      };
    }

    const paid = await sumPaidByInstallment(
      this.prisma,
      enrollment.installments.map((installment) => installment.id),
    );
    const next = enrollment.installments.find(
      (installment) =>
        (paid.get(installment.id) ?? 0) < installment.amountMinor,
    );
    if (!next) {
      return { installment: null, reason: 'All installments are paid' };
    }
    return {
      installment: toInstallmentView(next, false, paid.get(next.id) ?? 0),
    };
  }

  async update(id: string, input: UpdatePaymentInput) {
    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { id },
      include: { installment: true },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.voidedAt) {
      throw new BadRequestException('Voided payments cannot be edited');
    }

    if (
      input.amountMinor !== undefined &&
      input.amountMinor !== payment.amountMinor
    ) {
      const paid = await sumPaidByInstallment(this.prisma, [
        payment.installmentId,
      ]);
      const paidByOthers =
        (paid.get(payment.installmentId) ?? 0) - payment.amountMinor;
      if (paidByOthers + input.amountMinor > payment.installment.amountMinor) {
        throw new BadRequestException(
          `Amount exceeds the remaining balance of this installment (remaining: ${
            payment.installment.amountMinor - paidByOthers
          })`,
        );
      }
    }

    if (input.methodId) {
      const method = await this.prisma.paymentMethod.findUnique({
        where: { id: input.methodId },
      });
      if (!method || !method.isActive) {
        throw new BadRequestException('Unknown or inactive payment method');
      }
    }

    return this.prisma.paymentTransaction.update({
      where: { id },
      data: input,
      include: paymentInclude,
    });
  }

  async void(id: string, reason: string | undefined, currentUserId: string) {
    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { id },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.voidedAt) {
      throw new ConflictException('Payment is already voided');
    }
    return this.prisma.paymentTransaction.update({
      where: { id },
      data: {
        voidedAt: new Date(),
        voidedById: currentUserId,
        voidReason: reason,
      },
      include: paymentInclude,
    });
  }

  findAll(filters: PaymentListFilters) {
    return this.prisma.paymentTransaction.findMany({
      where: {
        ...(filters.includeVoided ? {} : { voidedAt: null }),
        ...(filters.enrollmentId ? { enrollmentId: filters.enrollmentId } : {}),
        ...(filters.methodId ? { methodId: filters.methodId } : {}),
        ...(filters.courseId || filters.studentId
          ? {
              enrollment: {
                ...(filters.courseId ? { courseId: filters.courseId } : {}),
                ...(filters.studentId ? { studentId: filters.studentId } : {}),
              },
            }
          : {}),
        ...(filters.from || filters.to
          ? {
              paidAt: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      include: paymentInclude,
      orderBy: { paidAt: 'desc' },
      take: 300,
    });
  }

  async studentHistory(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return this.prisma.paymentTransaction.findMany({
      where: { enrollment: { studentId } },
      include: paymentInclude,
      orderBy: { paidAt: 'desc' },
      take: 300,
    });
  }

  // The accounter's main screen: every installment that still needs money.
  async unpaid(filters: UnpaidFilters) {
    const installments = await this.prisma.installment.findMany({
      where: {
        amountMinor: { gt: 0 },
        ...(filters.seq ? { seq: filters.seq } : {}),
        ...(filters.dueFrom || filters.dueTo
          ? {
              dueDate: {
                ...(filters.dueFrom ? { gte: filters.dueFrom } : {}),
                ...(filters.dueTo ? { lte: filters.dueTo } : {}),
              },
            }
          : {}),
        enrollment: {
          isFree: false,
          ...(filters.courseId ? { courseId: filters.courseId } : {}),
          ...(filters.search
            ? {
                student: {
                  OR: [
                    { name: { contains: filters.search, mode: 'insensitive' } },
                    { phone: { contains: filters.search } },
                  ],
                },
              }
            : {}),
        },
      },
      include: {
        enrollment: {
          select: {
            id: true,
            student: { select: { id: true, name: true, phone: true } },
            course: {
              select: {
                id: true,
                name: true,
                currency: {
                  select: { code: true, symbol: true, decimals: true },
                },
              },
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 500,
    });

    const paid = await sumPaidByInstallment(
      this.prisma,
      installments.map((installment) => installment.id),
    );

    return installments
      .map((installment) => {
        const view = toInstallmentView(
          installment,
          false,
          paid.get(installment.id) ?? 0,
        );
        return {
          id: installment.id,
          seq: installment.seq,
          dueDate: installment.dueDate,
          amountDueMinor: view.amountDueMinor,
          amountPaidMinor: view.amountPaidMinor,
          remainingMinor: view.remainingMinor,
          status: view.status,
          enrollmentId: installment.enrollment.id,
          student: installment.enrollment.student,
          course: installment.enrollment.course,
        };
      })
      .filter((row) => row.status !== InstallmentStatus.PAID)
      .filter((row) => (filters.status ? row.status === filters.status : true));
  }
}
