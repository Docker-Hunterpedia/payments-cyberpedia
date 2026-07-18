import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  createEnrollmentSchema,
  grantFreeSchema,
  type CreateEnrollmentInput,
  type GrantFreeInput,
} from '@cyberpedia/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../auth/auth.types';
import { EnrollmentsService } from './enrollments.service';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.enrollmentsService.findOne(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createEnrollmentSchema))
    body: CreateEnrollmentInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.enrollmentsService.create(body, user.id);
  }

  @Post(':id/free')
  grantFree(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(grantFreeSchema)) body: GrantFreeInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.enrollmentsService.grantFree(id, body.reason, user.id);
  }

  @Delete(':id/free')
  revokeFree(@Param('id') id: string) {
    return this.enrollmentsService.revokeFree(id);
  }
}
