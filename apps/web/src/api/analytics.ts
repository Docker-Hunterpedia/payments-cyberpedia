import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CurrencyInfo } from '@/lib/money';
import type { DashboardPayload } from './queries';

export interface CourseReportRow {
  course: { id: string; name: string; status: string; currency: CurrencyInfo };
  enrollments: number;
  freeEnrollments: number;
  expectedMinor: number;
  collectedMinor: number;
  outstandingMinor: number;
  teacherCostMinor: number;
  marginMinor: number;
}

export interface TeacherReportRow {
  teacher: { id: string; name: string };
  courses: number;
  byCurrency: {
    currencyCode: string;
    earnedMinor: number;
    paidMinor: number;
    balanceMinor: number;
  }[];
}

export function useAnalyticsSummary(from: Date, to: Date, enabled = true) {
  return useQuery({
    queryKey: ['analytics', 'dashboard', from.toISOString(), to.toISOString()],
    queryFn: () =>
      api<DashboardPayload>(
        `/analytics/dashboard?from=${from.toISOString()}&to=${to.toISOString()}`,
      ),
    enabled,
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
