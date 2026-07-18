import type {
  AssignTeacherInput,
  CompensationType,
  CreateCourseInput,
  PlanTemplateInput,
  UpdateCourseInput,
  UpdateCourseTeacherInput,
} from '@cyberpedia/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CurrencyInfo } from '@/lib/money';

export interface CourseListItem {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  priceMinor: number;
  sessionsCount: number;
  currency: CurrencyInfo;
  _count: { plans: number; teachers: number };
}

export interface PlanRow {
  id: string;
  name: string;
  installments: {
    id: string;
    seq: number;
    amountMinor: number;
    dueDays: number;
  }[];
}

export interface CourseTeacherRow {
  id: string;
  teacherId: string;
  compensationType: CompensationType;
  percent: string | null;
  amountMinor: number | null;
  teacher: { id: string; name: string };
}

export interface CourseFull {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  priceMinor: number;
  sessionsCount: number;
  currency: CurrencyInfo;
  plans: PlanRow[];
  // only present for admins
  teachers?: CourseTeacherRow[];
}

export interface CourseSummary {
  enrollments: number;
  freeEnrollments: number;
  expectedMinor: number;
  collectedMinor: number;
  outstandingMinor: number;
}

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => api<CourseListItem[]>('/courses'),
  });
}

export function useCourseFull(id: string) {
  return useQuery({
    queryKey: ['course', id],
    queryFn: () => api<CourseFull>(`/courses/${id}`),
  });
}

export function useCourseSummary(id: string) {
  return useQuery({
    queryKey: ['course', id, 'summary'],
    queryFn: () => api<CourseSummary>(`/courses/${id}/summary`),
  });
}

function useCourseInvalidation(courseId?: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['courses'] });
    if (courseId) {
      void queryClient.invalidateQueries({ queryKey: ['course', courseId] });
    }
  };
}

export function useCreateCourse() {
  const invalidate = useCourseInvalidation();
  return useMutation({
    mutationFn: (input: CreateCourseInput) =>
      api<CourseFull>('/courses', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateCourse(courseId: string) {
  const invalidate = useCourseInvalidation(courseId);
  return useMutation({
    mutationFn: (input: UpdateCourseInput) =>
      api<CourseFull>(`/courses/${courseId}`, { method: 'PATCH', body: input }),
    onSuccess: invalidate,
  });
}

export function useAddPlan(courseId: string) {
  const invalidate = useCourseInvalidation(courseId);
  return useMutation({
    mutationFn: (input: PlanTemplateInput) =>
      api<PlanRow>(`/courses/${courseId}/plans`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: invalidate,
  });
}

export function useReplacePlan(courseId: string) {
  const invalidate = useCourseInvalidation(courseId);
  return useMutation({
    mutationFn: ({
      planId,
      input,
    }: {
      planId: string;
      input: PlanTemplateInput;
    }) =>
      api<PlanRow>(`/courses/${courseId}/plans/${planId}`, {
        method: 'PUT',
        body: input,
      }),
    onSuccess: invalidate,
  });
}

export function useDeletePlan(courseId: string) {
  const invalidate = useCourseInvalidation(courseId);
  return useMutation({
    mutationFn: (planId: string) =>
      api<void>(`/courses/${courseId}/plans/${planId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useAssignTeacher(courseId: string) {
  const invalidate = useCourseInvalidation(courseId);
  return useMutation({
    mutationFn: (input: AssignTeacherInput) =>
      api<CourseTeacherRow>(`/courses/${courseId}/teachers`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateCourseTeacher(courseId: string) {
  const invalidate = useCourseInvalidation(courseId);
  return useMutation({
    mutationFn: ({
      teacherId,
      input,
    }: {
      teacherId: string;
      input: UpdateCourseTeacherInput;
    }) =>
      api<CourseTeacherRow>(`/courses/${courseId}/teachers/${teacherId}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: invalidate,
  });
}

export function useRemoveTeacher(courseId: string) {
  const invalidate = useCourseInvalidation(courseId);
  return useMutation({
    mutationFn: (teacherId: string) =>
      api<void>(`/courses/${courseId}/teachers/${teacherId}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });
}
