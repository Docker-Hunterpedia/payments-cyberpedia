import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  createDiscountSchema,
  Role,
  updateDiscountSchema,
  type CreateDiscountInput,
  type UpdateDiscountInput,
} from '@cyberpedia/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { DiscountsService } from './discounts.service';

@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Get()
  findAll() {
    return this.discountsService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN)
  create(
    @Body(new ZodValidationPipe(createDiscountSchema))
    body: CreateDiscountInput,
  ) {
    return this.discountsService.create(body);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDiscountSchema))
    body: UpdateDiscountInput,
  ) {
    return this.discountsService.update(id, body);
  }
}
