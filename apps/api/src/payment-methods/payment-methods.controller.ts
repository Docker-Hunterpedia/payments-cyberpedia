import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  createPaymentMethodSchema,
  Role,
  updatePaymentMethodSchema,
  type CreatePaymentMethodInput,
  type UpdatePaymentMethodInput,
} from '@cyberpedia/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PaymentMethodsService } from './payment-methods.service';

@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Get()
  findAll() {
    return this.paymentMethodsService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN)
  create(
    @Body(new ZodValidationPipe(createPaymentMethodSchema))
    body: CreatePaymentMethodInput,
  ) {
    return this.paymentMethodsService.create(body);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePaymentMethodSchema))
    body: UpdatePaymentMethodInput,
  ) {
    return this.paymentMethodsService.update(id, body);
  }
}
