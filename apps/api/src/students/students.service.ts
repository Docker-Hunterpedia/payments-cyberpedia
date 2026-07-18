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

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string) {
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
      take: 100,
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
            installments: { orderBy: { seq: 'asc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return {
      ...student,
      enrollments: student.enrollments.map(withInstallmentViews),
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
}
