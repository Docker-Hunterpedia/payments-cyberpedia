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
    // Only ACTIVE payments protect a student — money that still counts must
    // stay on the books. Voided rows are mistakes already reversed; they go
    // with the student (the audit log keeps the who/what/when trail).
    const activePayments = await this.prisma.paymentTransaction.count({
      where: { enrollment: { studentId: id }, voidedAt: null },
    });
    if (activePayments > 0) {
      throw new ConflictException(
        'This student has payments on the books and cannot be deleted. Delete the payments first if they were mistakes.',
      );
    }
    await this.prisma.$transaction([
      this.prisma.paymentTransaction.deleteMany({
        where: { enrollment: { studentId: id } },
      }),
      this.prisma.enrollment.deleteMany({ where: { studentId: id } }),
      this.prisma.student.delete({ where: { id } }),
    ]);
  }
}
