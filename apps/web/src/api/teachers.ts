import type {
  CompensationType,
  CreateTeacherInput,
  CreateTeacherPayoutInput,
  UpdateTeacherInput,
} from '@cyberpedia/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CurrencyInfo } from '@/lib/money';

export interface TeacherListItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  _count: { courses: number };
}

export interface TeacherEarningsCourse {
  course: {
    id: string;
    name: string;
    status: string;
    sessionsCount: number;
    currency: CurrencyInfo;
  };
  compensationType: CompensationType;
  percent: string | null;
  amountMinor: number | null;
  collectedMinor: number;
  earnedMinor: number;
}

export interface TeacherPayoutRow {
  id: string;
  amountMinor: number;
  currencyCode: string;
  currency: CurrencyInfo;
  date: string;
  note: string | null;
  course: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
}

export interface CurrencyTotals {
  currencyCode: string;
  earnedMinor: number;
  paidMinor: number;
  balanceMinor: number;
}

export interface TeacherEarnings {
  teacher: { id: string; name: string };
  courses: TeacherEarningsCourse[];
  payouts: TeacherPayoutRow[];
  totals: {
    byCurrency: CurrencyTotals[];
    base: (CurrencyTotals & { currencyCode: string }) | null;
  };
}

export function useTeachers() {
  return useQuery({
    queryKey: ['teachers'],
    queryFn: () => api<TeacherListItem[]>('/teachers'),
  });
}

export function useTeacherEarnings(id: string) {
  return useQuery({
    queryKey: ['teacher', id, 'earnings'],
    queryFn: () => api<TeacherEarnings>(`/teachers/${id}/earnings`),
  });
}

export function useTeacherDetail(id: string) {
  return useQuery({
    queryKey: ['teacher', id],
    queryFn: () => api<Omit<TeacherListItem, '_count'>>(`/teachers/${id}`),
  });
}

function useTeacherInvalidation(teacherId?: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['teachers'] });
    if (teacherId) {
      void queryClient.invalidateQueries({ queryKey: ['teacher', teacherId] });
    }
  };
}

export function useCreateTeacher() {
  const invalidate = useTeacherInvalidation();
  return useMutation({
    mutationFn: (input: CreateTeacherInput) =>
      api<TeacherListItem>('/teachers', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateTeacher(teacherId: string) {
  const invalidate = useTeacherInvalidation(teacherId);
  return useMutation({
    mutationFn: (input: UpdateTeacherInput) =>
      api<TeacherListItem>(`/teachers/${teacherId}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteTeacher() {
  const invalidate = useTeacherInvalidation();
  return useMutation({
    mutationFn: (teacherId: string) =>
      api<void>(`/teachers/${teacherId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useCreatePayout(teacherId: string) {
  const invalidate = useTeacherInvalidation(teacherId);
  return useMutation({
    mutationFn: (input: CreateTeacherPayoutInput) =>
      api<TeacherPayoutRow>(`/teachers/${teacherId}/payouts`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: invalidate,
  });
}

export function useDeletePayout(teacherId: string) {
  const invalidate = useTeacherInvalidation(teacherId);
  return useMutation({
    mutationFn: (payoutId: string) =>
      api<void>(`/teachers/${teacherId}/payouts/${payoutId}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });
}
