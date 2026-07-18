import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateTeacherInput,
  UpdateTeacherInput,
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

  private async ensureExists(id: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id } });
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
  }
}
