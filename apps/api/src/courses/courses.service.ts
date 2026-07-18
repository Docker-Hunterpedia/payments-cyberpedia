import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CompensationType,
  type AssignTeacherInput,
  type CreateCourseInput,
  type PlanTemplateInput,
  type UpdateCourseInput,
  type UpdateCourseTeacherInput,
} from '@cyberpedia/shared';
import { PrismaService } from '../prisma/prisma.service';

const planInclude = {
  installments: { orderBy: { seq: 'asc' as const } },
};

const teacherInclude = {
  teacher: { select: { id: true, name: true } },
};

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.course.findMany({
      include: {
        currency: { select: { code: true, symbol: true, decimals: true } },
        _count: { select: { plans: true, teachers: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string, includeTeachers: boolean) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        currency: { select: { code: true, symbol: true, decimals: true } },
        plans: { include: planInclude, orderBy: { createdAt: 'asc' } },
        ...(includeTeachers ? { teachers: { include: teacherInclude } } : {}),
      },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return course;
  }

  async create(input: CreateCourseInput) {
    await this.ensureCurrencyUsable(input.currencyCode);

    const plans: PlanTemplateInput[] = input.plans?.length
      ? input.plans
      : [
          {
            name: 'Full payment',
            installments: [{ amountMinor: input.priceMinor, dueDays: 0 }],
          },
        ];
    this.ensureUniquePlanNames(plans.map((plan) => plan.name));

    return this.prisma.course.create({
      data: {
        name: input.name,
        description: input.description,
        priceMinor: input.priceMinor,
        currencyCode: input.currencyCode,
        sessionsCount: input.sessionsCount,
        plans: {
          create: plans.map((plan) => ({
            name: plan.name,
            installments: {
              create: plan.installments.map((installment, index) => ({
                seq: index + 1,
                amountMinor: installment.amountMinor,
                dueDays: installment.dueDays,
              })),
            },
          })),
        },
      },
      include: { plans: { include: planInclude } },
    });
  }

  async update(id: string, input: UpdateCourseInput) {
    await this.ensureCourseExists(id);
    if (input.currencyCode) {
      await this.ensureCurrencyUsable(input.currencyCode);
    }
    return this.prisma.course.update({ where: { id }, data: input });
  }

  // Expected counts non-free enrollments only; collected counts every
  // non-voided payment (money already received is real even if the
  // enrollment was later marked free). Amounts are in the course currency.
  async summary(id: string) {
    await this.ensureCourseExists(id);
    const [enrollments, freeEnrollments, expected, collected] =
      await this.prisma.$transaction([
        this.prisma.enrollment.count({ where: { courseId: id } }),
        this.prisma.enrollment.count({ where: { courseId: id, isFree: true } }),
        this.prisma.installment.aggregate({
          _sum: { amountMinor: true },
          where: { enrollment: { courseId: id, isFree: false } },
        }),
        this.prisma.paymentTransaction.aggregate({
          _sum: { appliedMinor: true },
          where: { voidedAt: null, enrollment: { courseId: id } },
        }),
      ]);
    const expectedMinor = expected._sum.amountMinor ?? 0;
    const collectedMinor = collected._sum.appliedMinor ?? 0;
    return {
      enrollments,
      freeEnrollments,
      expectedMinor,
      collectedMinor,
      outstandingMinor: Math.max(0, expectedMinor - collectedMinor),
    };
  }

  // --- Payment plan templates ---

  async addPlan(courseId: string, input: PlanTemplateInput) {
    await this.ensureCourseExists(courseId);
    await this.ensurePlanNameAvailable(courseId, input.name);

    return this.prisma.paymentPlanTemplate.create({
      data: {
        courseId,
        name: input.name,
        installments: {
          create: input.installments.map((installment, index) => ({
            seq: index + 1,
            amountMinor: installment.amountMinor,
            dueDays: installment.dueDays,
          })),
        },
      },
      include: planInclude,
    });
  }

  async replacePlan(
    courseId: string,
    planId: string,
    input: PlanTemplateInput,
  ) {
    const plan = await this.getPlanOrThrow(courseId, planId);
    if (input.name !== plan.name) {
      await this.ensurePlanNameAvailable(courseId, input.name);
    }

    const [, , updated] = await this.prisma.$transaction([
      this.prisma.installmentTemplate.deleteMany({ where: { planId } }),
      this.prisma.paymentPlanTemplate.update({
        where: { id: planId },
        data: { name: input.name },
      }),
      this.prisma.paymentPlanTemplate.update({
        where: { id: planId },
        data: {
          installments: {
            create: input.installments.map((installment, index) => ({
              seq: index + 1,
              amountMinor: installment.amountMinor,
              dueDays: installment.dueDays,
            })),
          },
        },
        include: planInclude,
      }),
    ]);
    return updated;
  }

  async removePlan(courseId: string, planId: string) {
    await this.getPlanOrThrow(courseId, planId);
    await this.prisma.paymentPlanTemplate.delete({ where: { id: planId } });
  }

  // --- Teacher assignments ---

  async assignTeacher(courseId: string, input: AssignTeacherInput) {
    await this.ensureCourseExists(courseId);

    const teacher = await this.prisma.teacher.findUnique({
      where: { id: input.teacherId },
    });
    if (!teacher) {
      throw new BadRequestException('Unknown teacher');
    }

    const existing = await this.prisma.courseTeacher.findUnique({
      where: { courseId_teacherId: { courseId, teacherId: input.teacherId } },
    });
    if (existing) {
      throw new ConflictException('Teacher is already assigned to this course');
    }

    return this.prisma.courseTeacher.create({
      data: {
        courseId,
        teacherId: input.teacherId,
        ...this.compensationData(input),
      },
      include: teacherInclude,
    });
  }

  async updateTeacherCompensation(
    courseId: string,
    teacherId: string,
    input: UpdateCourseTeacherInput,
  ) {
    await this.getAssignmentOrThrow(courseId, teacherId);
    return this.prisma.courseTeacher.update({
      where: { courseId_teacherId: { courseId, teacherId } },
      data: this.compensationData(input),
      include: teacherInclude,
    });
  }

  async removeTeacher(courseId: string, teacherId: string) {
    await this.getAssignmentOrThrow(courseId, teacherId);
    await this.prisma.courseTeacher.delete({
      where: { courseId_teacherId: { courseId, teacherId } },
    });
  }

  // --- helpers ---

  private compensationData(input: UpdateCourseTeacherInput) {
    if (input.compensationType === CompensationType.PERCENTAGE) {
      if (input.percent === undefined) {
        throw new BadRequestException(
          'percent is required for PERCENTAGE compensation',
        );
      }
      return {
        compensationType: input.compensationType,
        percent: input.percent,
        amountMinor: null,
      };
    }
    if (input.amountMinor === undefined) {
      throw new BadRequestException(
        'amountMinor is required for fixed compensation',
      );
    }
    return {
      compensationType: input.compensationType,
      percent: null,
      amountMinor: input.amountMinor,
    };
  }

  private async ensureCourseExists(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
  }

  private async ensureCurrencyUsable(currencyCode: string) {
    const currency = await this.prisma.currency.findUnique({
      where: { code: currencyCode },
    });
    if (!currency || !currency.isActive) {
      throw new BadRequestException('Unknown or inactive currency');
    }
  }

  private ensureUniquePlanNames(names: string[]) {
    if (new Set(names).size !== names.length) {
      throw new BadRequestException(
        'Plan names must be unique within a course',
      );
    }
  }

  private async ensurePlanNameAvailable(courseId: string, name: string) {
    const existing = await this.prisma.paymentPlanTemplate.findUnique({
      where: { courseId_name: { courseId, name } },
    });
    if (existing) {
      throw new ConflictException(
        'A plan with this name already exists for this course',
      );
    }
  }

  private async getPlanOrThrow(courseId: string, planId: string) {
    const plan = await this.prisma.paymentPlanTemplate.findUnique({
      where: { id: planId },
    });
    if (!plan || plan.courseId !== courseId) {
      throw new NotFoundException('Plan not found for this course');
    }
    return plan;
  }

  private async getAssignmentOrThrow(courseId: string, teacherId: string) {
    const assignment = await this.prisma.courseTeacher.findUnique({
      where: { courseId_teacherId: { courseId, teacherId } },
    });
    if (!assignment) {
      throw new NotFoundException('Teacher is not assigned to this course');
    }
    return assignment;
  }
}
