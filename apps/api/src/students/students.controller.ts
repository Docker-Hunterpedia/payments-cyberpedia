import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  createStudentSchema,
  updateStudentSchema,
  type CreateStudentInput,
  type UpdateStudentInput,
} from '@cyberpedia/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PaymentsService } from '../payments/payments.service';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get()
  findAll(@Query('search') search?: string, @Query('page') page?: string) {
    const pageNumber = Math.max(0, Number.parseInt(page ?? '0', 10) || 0);
    return this.studentsService.findAll(search, pageNumber);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Get(':id/payments')
  payments(@Param('id') id: string) {
    return this.paymentsService.studentHistory(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createStudentSchema)) body: CreateStudentInput,
  ) {
    return this.studentsService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateStudentSchema)) body: UpdateStudentInput,
  ) {
    return this.studentsService.update(id, body);
  }
}
