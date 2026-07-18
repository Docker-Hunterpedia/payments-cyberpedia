import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateUserInput,
  ResetPasswordInput,
  UpdateUserInput,
} from '@cyberpedia/shared';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: safeUserSelect,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(input: CreateUserInput) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    return this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash: await argon2.hash(input.password),
      },
      select: safeUserSelect,
    });
  }

  async update(id: string, input: UpdateUserInput, currentUserId: string) {
    if (
      id === currentUserId &&
      (input.isActive === false || input.role !== undefined)
    ) {
      throw new BadRequestException(
        'You cannot change your own role or deactivate yourself',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...input,
        // deactivation kills the refresh session immediately
        ...(input.isActive === false ? { refreshTokenHash: null } : {}),
      },
      select: safeUserSelect,
    });
  }

  async resetPassword(id: string, input: ResetPasswordInput) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: await argon2.hash(input.password),
        refreshTokenHash: null,
      },
      select: safeUserSelect,
    });
  }
}
