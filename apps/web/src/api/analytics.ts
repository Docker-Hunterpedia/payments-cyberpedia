import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CurrencyInfo } from '@/lib/money';
import type { DashboardPayload } from './queries';

export interface TimeBucket {
  bucket: string;
  incomeMinor: number;
  outcomeMinor: number;
  netMinor: number;
}

export interface TimeseriesPayload {
  baseCurrency: CurrencyInfo & { symbol: string };
  granularity: 'day' | 'week' | 'month';
  buckets: TimeBucket[];
}

export interface CourseReportRow {
  course: { id: string; name: string; status: string; currency: CurrencyInfo };
  enrollments: number;
  freeEnrollments: number;
  expectedMinor: number;
  collectedMinor: number;
  outstandingMinor: number;
  teacherCostMinor: number;
  marginMinor: number;
  collectedBaseMinor: number;
  marginBaseMinor: number;
}

export interface TeacherReportRow {
  teacher: { id: string; name: string };
  courses: number;
  earnedBaseMinor: number;
  paidBaseMinor: number;
  balanceBaseMinor: number;
}

export interface TimeseriesFilters {
  courseId?: string;
  methodId?: string;
  currencyCode?: string;
}

export function useAnalyticsSummary(from: Date, to: Date) {
  return useQuery({
    queryKey: ['analytics', 'dashboard', from.toISOString(), to.toISOString()],
    queryFn: () =>
      api<DashboardPayload>(
        `/analytics/dashboard?from=${from.toISOString()}&to=${to.toISOString()}`,
      ),
  });
}

export function useTimeseries(
  from: Date,
  to: Date,
  granularity: 'day' | 'week' | 'month',
  filters: TimeseriesFilters,
) {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
    granularity,
  });
  if (filters.courseId) params.set('courseId', filters.courseId);
  if (filters.methodId) params.set('methodId', filters.methodId);
  if (filters.currencyCode) params.set('currencyCode', filters.currencyCode);
  return useQuery({
    queryKey: ['analytics', 'timeseries', params.toString()],
    queryFn: () => api<TimeseriesPayload>(`/analytics/timeseries?${params}`),
  });
}

export function useCourseReport() {
  return useQuery({
    queryKey: ['analytics', 'courses'],
    queryFn: () => api<CourseReportRow[]>('/analytics/courses'),
  });
}

export function useTeacherReport() {
  return useQuery({
    queryKey: ['analytics', 'teachers'],
    queryFn: () => api<TeacherReportRow[]>('/analytics/teachers'),
  });
}
