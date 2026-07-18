import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreatePaymentMethodInput,
  UpdatePaymentMethodInput,
} from '@cyberpedia/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.paymentMethod.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(input: CreatePaymentMethodInput) {
    await this.ensureNameAvailable(input.name);
    return this.prisma.paymentMethod.create({ data: input });
  }

  async update(id: string, input: UpdatePaymentMethodInput) {
    const method = await this.prisma.paymentMethod.findUnique({
      where: { id },
    });
    if (!method) {
      throw new NotFoundException('Payment method not found');
    }
    if (input.name && input.name !== method.name) {
      await this.ensureNameAvailable(input.name);
    }
    return this.prisma.paymentMethod.update({ where: { id }, data: input });
  }

  private async ensureNameAvailable(name: string) {
    const existing = await this.prisma.paymentMethod.findUnique({
      where: { name },
    });
    if (existing) {
      throw new ConflictException(
        'A payment method with this name already exists',
      );
    }
  }
}
