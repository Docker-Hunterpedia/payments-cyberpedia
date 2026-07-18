import type {
  CreateStudentInput,
  InstallmentStatus,
  UpdateStudentInput,
} from '@cyberpedia/shared';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CurrencyInfo } from '@/lib/money';

export interface StudentListItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  _count: { enrollments: number };
}

export interface InstallmentView {
  id: string;
  seq: number;
  amountMinor: number;
  amountDueMinor: number;
  amountPaidMinor: number;
  remainingMinor: number;
  dueDate: string;
  status: InstallmentStatus;
}

export interface EnrollmentView {
  id: string;
  enrolledAt: string;
  isFree: boolean;
  freeReason: string | null;
  discountAmountMinor: number | null;
  discount: { id: string; name: string } | null;
  planTemplate: { id: string; name: string } | null;
  course: { id: string; name: string; status: string; currency: CurrencyInfo };
  installments: InstallmentView[];
}

export interface StudentDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  enrollments: EnrollmentView[];
}

export interface PaymentView {
  id: string;
  amountMinor: number;
  currencyCode: string;
  paidAt: string;
  note: string | null;
  voidedAt: string | null;
  method: { id: string; name: string };
  recordedBy: { id: string; name: string };
  installment: { id: string; seq: number };
  enrollment: {
    id: string;
    student: { id: string; name: string; phone: string };
    course: { id: string; name: string; currency: CurrencyInfo };
  };
}

export function useStudents(search: string) {
  return useQuery({
    queryKey: ['students', { search }],
    queryFn: () =>
      api<StudentListItem[]>(
        `/students${search ? `?search=${encodeURIComponent(search)}` : ''}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: ['student', id],
    queryFn: () => api<StudentDetail>(`/students/${id}`),
  });
}

export function useStudentPayments(id: string) {
  return useQuery({
    queryKey: ['student', id, 'payments'],
    queryFn: () => api<PaymentView[]>(`/students/${id}/payments`),
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStudentInput) =>
      api<StudentDetail>('/students', { method: 'POST', body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useUpdateStudent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateStudentInput) =>
      api<StudentDetail>(`/students/${id}`, { method: 'PATCH', body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      void queryClient.invalidateQueries({ queryKey: ['student', id] });
    },
  });
}
