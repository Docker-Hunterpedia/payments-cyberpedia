import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  applyDiscount,
  CourseStatus,
  type CreateEnrollmentInput,
} from '@cyberpedia/shared';
import { PrismaService } from '../prisma/prisma.service';
import { withInstallmentViews } from './installment-view';

const enrollmentInclude = {
  student: { select: { id: true, name: true, phone: true, email: true } },
  course: {
    select: {
      id: true,
      name: true,
      status: true,
      currency: { select: { code: true, symbol: true, decimals: true } },
    },
  },
  planTemplate: { select: { id: true, name: true } },
  discount: { select: { id: true, name: true } },
  freeGrantedBy: { select: { id: true, name: true } },
  installments: { orderBy: { seq: 'asc' as const } },
};

// Due dates are normalized to UTC midnight of the due day.
function dueDateFrom(enrolledAt: Date, dueDays: number): Date {
  const date = new Date(
    Date.UTC(
      enrolledAt.getUTCFullYear(),
      enrolledAt.getUTCMonth(),
      enrolledAt.getUTCDate(),
    ),
  );
  date.setUTCDate(date.getUTCDate() + dueDays);
  return date;
}

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: enrollmentInclude,
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }
    return withInstallmentViews(enrollment);
  }

  async create(input: CreateEnrollmentInput, currentUserId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: input.studentId },
    });
    if (!student) {
      throw new BadRequestException('Unknown student');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: input.courseId },
    });
    if (!course) {
      throw new BadRequestException('Unknown course');
    }
    if (course.status !== CourseStatus.ACTIVE) {
      throw new BadRequestException('Course is archived');
    }

    const existing = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: input.studentId,
          courseId: input.courseId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('Student is already enrolled in this course');
    }

    const enrolledAt = input.enrolledAt ?? new Date();
    const installments = await this.resolveInstallments(input, course.id);

    let discountAmountMinor: number | undefined;
    let amounts = installments.map((installment) => installment.amountMinor);
    if (input.discountId) {
      const discount = await this.prisma.discountDefinition.findUnique({
        where: { id: input.discountId },
      });
      if (!discount || !discount.isActive) {
        throw new BadRequestException('Unknown or inactive discount');
      }
      if (discount.currencyCode !== course.currencyCode) {
        throw new BadRequestException(
          'Discount currency does not match the course currency',
        );
      }
      discountAmountMinor = discount.amountMinor;
      amounts = applyDiscount(amounts, discount.amountMinor);
    }

    const enrollment = await this.prisma.enrollment.create({
      data: {
        studentId: input.studentId,
        courseId: input.courseId,
        planTemplateId: input.planTemplateId,
        enrolledAt,
        discountId: input.discountId,
        discountAmountMinor,
        ...(input.isFree
          ? {
              isFree: true,
              freeGrantedById: currentUserId,
              freeGrantedAt: new Date(),
              freeReason: input.freeReason,
            }
          : {}),
        installments: {
          create: installments.map((installment, index) => ({
            seq: index + 1,
            amountMinor: amounts[index],
            dueDate: dueDateFrom(enrolledAt, installment.dueDays),
          })),
        },
      },
      include: enrollmentInclude,
    });
    return withInstallmentViews(enrollment);
  }

  async grantFree(
    id: string,
    reason: string | undefined,
    currentUserId: string,
  ) {
    const enrollment = await this.getOrThrow(id);
    if (enrollment.isFree) {
      throw new ConflictException('Enrollment is already marked as free');
    }
    const updated = await this.prisma.enrollment.update({
      where: { id },
      data: {
        isFree: true,
        freeGrantedById: currentUserId,
        freeGrantedAt: new Date(),
        freeReason: reason,
      },
      include: enrollmentInclude,
    });
    return withInstallmentViews(updated);
  }

  async revokeFree(id: string) {
    const enrollment = await this.getOrThrow(id);
    if (!enrollment.isFree) {
      throw new BadRequestException('Enrollment is not marked as free');
    }
    const updated = await this.prisma.enrollment.update({
      where: { id },
      data: {
        isFree: false,
        freeGrantedById: null,
        freeGrantedAt: null,
        freeReason: null,
      },
      include: enrollmentInclude,
    });
    return withInstallmentViews(updated);
  }

  private async resolveInstallments(
    input: CreateEnrollmentInput,
    courseId: string,
  ) {
    if (input.installments?.length) {
      if (input.planTemplateId) {
        await this.getPlanOrThrow(input.planTemplateId, courseId);
      }
      return input.installments;
    }

    if (!input.planTemplateId) {
      throw new BadRequestException(
        'Provide a plan template or custom installments',
      );
    }
    const plan = await this.getPlanOrThrow(input.planTemplateId, courseId);
    return plan.installments.map((installment) => ({
      amountMinor: installment.amountMinor,
      dueDays: installment.dueDays,
    }));
  }

  private async getPlanOrThrow(planTemplateId: string, courseId: string) {
    const plan = await this.prisma.paymentPlanTemplate.findUnique({
      where: { id: planTemplateId },
      include: { installments: { orderBy: { seq: 'asc' } } },
    });
    if (!plan || plan.courseId !== courseId) {
      throw new BadRequestException(
        'Plan template does not belong to this course',
      );
    }
    return plan;
  }

  private async getOrThrow(id: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }
    return enrollment;
  }
}
