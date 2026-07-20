import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateStudentInput,
  UpdateStudentInput,
} from '@cyberpedia/shared';
import { PrismaService } from '../prisma/prisma.service';
import { withInstallmentViews } from '../enrollments/installment-view';
import { sumPaidByInstallment } from '../payments/payment-sums';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string, page = 0) {
    return this.prisma.student.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: { _count: { select: { enrollments: true } } },
      orderBy: { createdAt: 'desc' },
      skip: page * 50,
      take: 50,
    });
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: {
            course: {
              select: {
                id: true,
                name: true,
                status: true,
                currency: {
                  select: { code: true, symbol: true, decimals: true },
                },
              },
            },
            discount: { select: { id: true, name: true } },
            planTemplate: { select: { id: true, name: true } },
            installments: { orderBy: { seq: 'asc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    const installmentIds = student.enrollments.flatMap((enrollment) =>
      enrollment.installments.map((installment) => installment.id),
    );
    const paid = await sumPaidByInstallment(this.prisma, installmentIds);
    return {
      ...student,
      enrollments: student.enrollments.map((enrollment) =>
        withInstallmentViews(enrollment, paid),
      ),
    };
  }

  async create(input: CreateStudentInput) {
    await this.ensureEmailAvailable(input.email);
    return this.prisma.student.create({ data: input });
  }

  async update(id: string, input: UpdateStudentInput) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    if (input.email && input.email !== student.email) {
      await this.ensureEmailAvailable(input.email);
    }
    return this.prisma.student.update({ where: { id }, data: input });
  }

  private async ensureEmailAvailable(email: string) {
    const existing = await this.prisma.student.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('A student with this email already exists');
    }
  }

  async remove(id: string) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    // Financial history must survive: a student with any payment rows
    // (voided ones included) cannot be hard-deleted.
    const payments = await this.prisma.paymentTransaction.count({
      where: { enrollment: { studentId: id } },
    });
    if (payments > 0) {
      throw new ConflictException(
        'This student has payment history and cannot be deleted. The records must stay for the books.',
      );
    }
    await this.prisma.$transaction([
      this.prisma.enrollment.deleteMany({ where: { studentId: id } }),
      this.prisma.student.delete({ where: { id } }),
    ]);
  }
}
