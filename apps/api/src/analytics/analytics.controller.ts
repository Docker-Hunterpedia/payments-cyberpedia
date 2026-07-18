import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Role } from '@cyberpedia/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { parseDateParam } from '../payments/payments.controller';
import { AnalyticsService, type Granularity } from './analytics.service';

const GRANULARITIES: Granularity[] = ['day', 'week', 'month'];
const DAY_MS = 86_400_000;

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

  @Get('timeseries')
  timeseries(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('granularity') granularity?: string,
    @Query('courseId') courseId?: string,
    @Query('methodId') methodId?: string,
    @Query('currencyCode') currencyCode?: string,
  ) {
    const parsedGranularity = (granularity ?? 'day') as Granularity;
    if (!GRANULARITIES.includes(parsedGranularity)) {
      throw new BadRequestException(
        'Invalid granularity — expected day, week, or month',
      );
    }
    const parsedTo = parseDateParam(to, 'to') ?? new Date();
    const parsedFrom =
      parseDateParam(from, 'from') ??
      new Date(parsedTo.getTime() - 30 * DAY_MS);
    if (parsedFrom >= parsedTo) {
      throw new BadRequestException('"from" must be before "to"');
    }
    return this.analyticsService.timeseries(
      parsedFrom,
      parsedTo,
      parsedGranularity,
      {
        courseId,
        methodId,
        currencyCode: currencyCode?.toUpperCase(),
      },
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
