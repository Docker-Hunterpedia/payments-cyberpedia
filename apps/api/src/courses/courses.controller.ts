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
  Put,
} from '@nestjs/common';
import {
  assignTeacherSchema,
  createCourseSchema,
  planTemplateSchema,
  Role,
  updateCourseSchema,
  updateCourseTeacherSchema,
  type AssignTeacherInput,
  type CreateCourseInput,
  type PlanTemplateInput,
  type UpdateCourseInput,
  type UpdateCourseTeacherInput,
} from '@cyberpedia/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../auth/auth.types';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  findAll() {
    return this.coursesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    // teacher compensation is admin-only information
    return this.coursesService.findOne(id, user.role === Role.ADMIN);
  }

  @Get(':id/summary')
  summary(@Param('id') id: string) {
    return this.coursesService.summary(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(
    @Body(new ZodValidationPipe(createCourseSchema)) body: CreateCourseInput,
  ) {
    return this.coursesService.create(body);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCourseSchema)) body: UpdateCourseInput,
  ) {
    return this.coursesService.update(id, body);
  }

  // --- Payment plan templates ---

  @Post(':id/plans')
  @Roles(Role.ADMIN)
  addPlan(
    @Param('id') courseId: string,
    @Body(new ZodValidationPipe(planTemplateSchema)) body: PlanTemplateInput,
  ) {
    return this.coursesService.addPlan(courseId, body);
  }

  @Put(':id/plans/:planId')
  @Roles(Role.ADMIN)
  replacePlan(
    @Param('id') courseId: string,
    @Param('planId') planId: string,
    @Body(new ZodValidationPipe(planTemplateSchema)) body: PlanTemplateInput,
  ) {
    return this.coursesService.replacePlan(courseId, planId, body);
  }

  @Delete(':id/plans/:planId')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePlan(
    @Param('id') courseId: string,
    @Param('planId') planId: string,
  ): Promise<void> {
    await this.coursesService.removePlan(courseId, planId);
  }

  // --- Teacher assignments ---

  @Post(':id/teachers')
  @Roles(Role.ADMIN)
  assignTeacher(
    @Param('id') courseId: string,
    @Body(new ZodValidationPipe(assignTeacherSchema)) body: AssignTeacherInput,
  ) {
    return this.coursesService.assignTeacher(courseId, body);
  }

  @Patch(':id/teachers/:teacherId')
  @Roles(Role.ADMIN)
  updateTeacherCompensation(
    @Param('id') courseId: string,
    @Param('teacherId') teacherId: string,
    @Body(new ZodValidationPipe(updateCourseTeacherSchema))
    body: UpdateCourseTeacherInput,
  ) {
    return this.coursesService.updateTeacherCompensation(
      courseId,
      teacherId,
      body,
    );
  }

  @Delete(':id/teachers/:teacherId')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeTeacher(
    @Param('id') courseId: string,
    @Param('teacherId') teacherId: string,
  ): Promise<void> {
    await this.coursesService.removeTeacher(courseId, teacherId);
  }
}
