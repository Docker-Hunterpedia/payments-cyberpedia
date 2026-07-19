import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@cyberpedia/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { parseDateParam } from '../payments/payments.controller';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@Roles(Role.ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  dashboard(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.dashboard(
      parseDateParam(from, 'from'),
      parseDateParam(to, 'to'),
    );
  }

  @Get('courses')
  courseReport(@Query('courseId') courseId?: string) {
    return this.analyticsService.courseReport(courseId);
  }

  @Get('teachers')
  teacherReport(@Query('teacherId') teacherId?: string) {
    return this.analyticsService.teacherReport(teacherId);
  }
}
