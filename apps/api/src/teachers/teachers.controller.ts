import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  createTeacherPayoutSchema,
  createTeacherSchema,
  Role,
  updateTeacherSchema,
  type CreateTeacherInput,
  type CreateTeacherPayoutInput,
  type UpdateTeacherInput,
} from '@cyberpedia/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../auth/auth.types';
import { TeachersService } from './teachers.service';

@Controller('teachers')
@Roles(Role.ADMIN)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  findAll() {
    return this.teachersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teachersService.findOne(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createTeacherSchema)) body: CreateTeacherInput,
  ) {
    return this.teachersService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTeacherSchema)) body: UpdateTeacherInput,
  ) {
    return this.teachersService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.teachersService.remove(id);
  }

  // --- Earnings & payouts ---

  @Get(':id/earnings')
  earnings(@Param('id') id: string) {
    return this.teachersService.earnings(id);
  }

  @Post(':id/payouts')
  createPayout(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createTeacherPayoutSchema))
    body: CreateTeacherPayoutInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.teachersService.createPayout(id, body, user.id);
  }

  @Delete(':id/payouts/:payoutId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePayout(
    @Param('id') id: string,
    @Param('payoutId') payoutId: string,
  ): Promise<void> {
    await this.teachersService.deletePayout(id, payoutId);
  }
}
