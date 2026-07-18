import type {
  CreateEnrollmentInput,
  CreatePaymentInput,
} from '@cyberpedia/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CurrencyInfo } from '@/lib/money';
import type { InstallmentView } from './students';

export interface PlanTemplate {
  id: string;
  name: string;
  installments: {
    id: string;
    seq: number;
    amountMinor: number;
    dueDays: number;
  }[];
}

export interface CourseDetail {
  id: string;
  name: string;
  status: 'ACTIVE' | 'ARCHIVED';
  priceMinor: number;
  currency: CurrencyInfo;
  plans: PlanTemplate[];
}

export interface DiscountItem {
  id: string;
  name: string;
  amountMinor: number;
  currencyCode: string;
  isActive: boolean;
  currency: { code: string; symbol: string; decimals: number };
}

export interface PaymentMethodItem {
  id: string;
  name: string;
  isActive: boolean;
}

// The wizard's common shape for an enrollment, wherever it came from.
export interface SelectedEnrollment {
  id: string;
  isFree: boolean;
  student: { id: string; name: string };
  course: { id: string; name: string; currency: CurrencyInfo };
  installments: InstallmentView[];
}

export interface EnrollmentResponse {
  id: string;
  isFree: boolean;
  student: { id: string; name: string; phone: string; email: string };
  course: { id: string; name: string; status: string; currency: CurrencyInfo };
  installments: InstallmentView[];
}

export interface CreatedPayment {
  id: string;
  amountMinor: number;
  installmentRemainingMinor: number;
  installment: { id: string; seq: number };
  enrollment: {
    id: string;
    student: { id: string; name: string; phone: string };
    course: { id: string; name: string; currency: CurrencyInfo };
  };
}

export function fetchEnrollment(id: string) {
  return api<EnrollmentResponse>(`/enrollments/${id}`);
}

export function useCourseDetail(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['course', id],
    queryFn: () => api<CourseDetail>(`/courses/${id}`),
    enabled: enabled && Boolean(id),
  });
}

export function useDiscounts(enabled: boolean) {
  return useQuery({
    queryKey: ['discounts'],
    queryFn: () => api<DiscountItem[]>('/discounts'),
    enabled,
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => api<PaymentMethodItem[]>('/payment-methods'),
  });
}

export function useCreateEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEnrollmentInput) =>
      api<EnrollmentResponse>('/enrollments', { method: 'POST', body: input }),
    onSuccess: (enrollment) => {
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      void queryClient.invalidateQueries({
        queryKey: ['student', enrollment.student.id],
      });
      void queryClient.invalidateQueries({ queryKey: ['installments'] });
    },
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePaymentInput) =>
      api<CreatedPayment>('/payments', { method: 'POST', body: input }),
    onSuccess: (payment) => {
      void queryClient.invalidateQueries({ queryKey: ['installments'] });
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      void queryClient.invalidateQueries({
        queryKey: ['student', payment.enrollment.student.id],
      });
      void queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
