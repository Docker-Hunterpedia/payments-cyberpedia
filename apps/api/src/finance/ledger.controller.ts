import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  createLedgerCategorySchema,
  createLedgerEntrySchema,
  LedgerEntryType,
  Role,
  updateLedgerCategorySchema,
  updateLedgerEntrySchema,
  type CreateLedgerCategoryInput,
  type CreateLedgerEntryInput,
  type UpdateLedgerCategoryInput,
  type UpdateLedgerEntryInput,
} from '@cyberpedia/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../auth/auth.types';
import { parseDateParam } from '../payments/payments.controller';
import { LedgerService } from './ledger.service';

@Controller('ledger')
@Roles(Role.ADMIN)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  // --- Categories ---

  @Get('categories')
  findCategories() {
    return this.ledgerService.findCategories();
  }

  @Post('categories')
  createCategory(
    @Body(new ZodValidationPipe(createLedgerCategorySchema))
    body: CreateLedgerCategoryInput,
  ) {
    return this.ledgerService.createCategory(body);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateLedgerCategorySchema))
    body: UpdateLedgerCategoryInput,
  ) {
    return this.ledgerService.updateCategory(id, body);
  }

  // --- Entries ---

  @Get('entries')
  findEntries(
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    let parsedType: LedgerEntryType | undefined;
    if (type) {
      if (!Object.values(LedgerEntryType).includes(type as LedgerEntryType)) {
        throw new BadRequestException(
          'Invalid type — expected INCOME or EXPENSE',
        );
      }
      parsedType = type as LedgerEntryType;
    }
    return this.ledgerService.findEntries({
      type: parsedType,
      categoryId,
      from: parseDateParam(from, 'from'),
      to: parseDateParam(to, 'to'),
    });
  }

  @Post('entries')
  createEntry(
    @Body(new ZodValidationPipe(createLedgerEntrySchema))
    body: CreateLedgerEntryInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ledgerService.createEntry(body, user.id);
  }

  @Patch('entries/:id')
  updateEntry(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateLedgerEntrySchema))
    body: UpdateLedgerEntryInput,
  ) {
    return this.ledgerService.updateEntry(id, body);
  }

  @Delete('entries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEntry(@Param('id') id: string): Promise<void> {
    await this.ledgerService.deleteEntry(id);
  }
}
