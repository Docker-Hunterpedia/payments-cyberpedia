import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  createPaymentSchema,
  InstallmentStatus,
  Role,
  updatePaymentSchema,
  voidPaymentSchema,
  type CreatePaymentInput,
  type UpdatePaymentInput,
  type VoidPaymentInput,
} from '@cyberpedia/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../auth/auth.types';
import { PaymentsService } from './payments.service';

export function parseDateParam(
  value: string | undefined,
  name: string,
): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid date for "${name}"`);
  }
  return date;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll(
    @Query('enrollmentId') enrollmentId?: string,
    @Query('courseId') courseId?: string,
    @Query('studentId') studentId?: string,
    @Query('methodId') methodId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('includeVoided') includeVoided?: string,
  ) {
    return this.paymentsService.findAll({
      enrollmentId,
      courseId,
      studentId,
      methodId,
      from: parseDateParam(from, 'from'),
      to: parseDateParam(to, 'to'),
      includeVoided: includeVoided === 'true',
    });
  }

  @Get('next-installment')
  nextInstallment(@Query('enrollmentId') enrollmentId?: string) {
    if (!enrollmentId) {
      throw new BadRequestException('enrollmentId is required');
    }
    return this.paymentsService.nextInstallment(enrollmentId);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createPaymentSchema)) body: CreatePaymentInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.create(body, user.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePaymentSchema)) body: UpdatePaymentInput,
  ) {
    return this.paymentsService.update(id, body);
  }

  @Post(':id/void')
  @Roles(Role.ADMIN)
  void(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(voidPaymentSchema)) body: VoidPaymentInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.void(id, body.reason, user.id);
  }
}

@Controller('installments')
export class InstallmentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('unpaid')
  unpaid(
    @Query('courseId') courseId?: string,
    @Query('seq') seq?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('dueFrom') dueFrom?: string,
    @Query('dueTo') dueTo?: string,
  ) {
    let parsedStatus: InstallmentStatus | undefined;
    if (status) {
      if (
        !Object.values(InstallmentStatus).includes(status as InstallmentStatus)
      ) {
        throw new BadRequestException(
          `Invalid status — expected one of: ${Object.values(InstallmentStatus).join(', ')}`,
        );
      }
      parsedStatus = status as InstallmentStatus;
    }
    let parsedSeq: number | undefined;
    if (seq) {
      parsedSeq = Number.parseInt(seq, 10);
      if (Number.isNaN(parsedSeq) || parsedSeq < 1) {
        throw new BadRequestException('Invalid seq');
      }
    }
    return this.paymentsService.unpaid({
      courseId,
      seq: parsedSeq,
      status: parsedStatus,
      search,
      dueFrom: parseDateParam(dueFrom, 'dueFrom'),
      dueTo: parseDateParam(dueTo, 'dueTo'),
    });
  }
}
