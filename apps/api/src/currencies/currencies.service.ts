import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateCurrencyInput,
  UpdateCurrencyInput,
} from '@cyberpedia/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CurrenciesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.currency.findMany({
      orderBy: [{ isBase: 'desc' }, { code: 'asc' }],
    });
  }

  async create(input: CreateCurrencyInput) {
    const existing = await this.prisma.currency.findUnique({
      where: { code: input.code },
    });
    if (existing) {
      throw new ConflictException('A currency with this code already exists');
    }

    if (input.isBase) {
      const [, created] = await this.prisma.$transaction([
        this.prisma.currency.updateMany({
          where: { isBase: true },
          data: { isBase: false },
        }),
        this.prisma.currency.create({
          data: { ...input, isBase: true, ratePerBase: 1 },
        }),
      ]);
      return created;
    }

    return this.prisma.currency.create({ data: { ...input, isBase: false } });
  }

  async update(code: string, input: UpdateCurrencyInput) {
    const currency = await this.prisma.currency.findUnique({ where: { code } });
    if (!currency) {
      throw new NotFoundException('Currency not found');
    }

    if (currency.isBase) {
      if (input.isBase === false) {
        throw new BadRequestException(
          'Cannot unset the base currency — set another currency as base instead',
        );
      }
      if (input.isActive === false) {
        throw new BadRequestException('Cannot deactivate the base currency');
      }
      if (input.ratePerBase !== undefined && input.ratePerBase !== 1) {
        throw new BadRequestException('The base currency rate is always 1');
      }
    }

    if (input.isBase === true && !currency.isBase) {
      if (input.isActive === false) {
        throw new BadRequestException('The base currency must be active');
      }
      const [, updated] = await this.prisma.$transaction([
        this.prisma.currency.updateMany({
          where: { isBase: true },
          data: { isBase: false },
        }),
        this.prisma.currency.update({
          where: { code },
          data: { ...input, isBase: true, ratePerBase: 1, isActive: true },
        }),
      ]);
      return updated;
    }

    return this.prisma.currency.update({ where: { code }, data: input });
  }
}
