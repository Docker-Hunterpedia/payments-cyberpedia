import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  createCurrencySchema,
  Role,
  updateCurrencySchema,
  type CreateCurrencyInput,
  type UpdateCurrencyInput,
} from '@cyberpedia/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrenciesService } from './currencies.service';

@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get()
  findAll() {
    return this.currenciesService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN)
  create(
    @Body(new ZodValidationPipe(createCurrencySchema))
    body: CreateCurrencyInput,
  ) {
    return this.currenciesService.create(body);
  }

  @Patch(':code')
  @Roles(Role.ADMIN)
  update(
    @Param('code') code: string,
    @Body(new ZodValidationPipe(updateCurrencySchema))
    body: UpdateCurrencyInput,
  ) {
    return this.currenciesService.update(code.toUpperCase(), body);
  }
}
