import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateDiscountInput,
  UpdateDiscountInput,
} from '@cyberpedia/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.discountDefinition.findMany({
      include: {
        currency: { select: { code: true, symbol: true, decimals: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(input: CreateDiscountInput) {
    await this.ensureNameAvailable(input.name);
    await this.ensureCurrencyUsable(input.currencyCode);
    return this.prisma.discountDefinition.create({ data: input });
  }

  async update(id: string, input: UpdateDiscountInput) {
    const discount = await this.prisma.discountDefinition.findUnique({
      where: { id },
    });
    if (!discount) {
      throw new NotFoundException('Discount not found');
    }
    if (input.name && input.name !== discount.name) {
      await this.ensureNameAvailable(input.name);
    }
    if (input.currencyCode && input.currencyCode !== discount.currencyCode) {
      await this.ensureCurrencyUsable(input.currencyCode);
    }
    return this.prisma.discountDefinition.update({
      where: { id },
      data: input,
    });
  }

  private async ensureNameAvailable(name: string) {
    const existing = await this.prisma.discountDefinition.findUnique({
      where: { name },
    });
    if (existing) {
      throw new ConflictException('A discount with this name already exists');
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
}
