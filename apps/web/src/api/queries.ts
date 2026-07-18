import type { InstallmentStatus } from '@cyberpedia/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { api } from '@/lib/api';
import type { AuthUser } from '@/lib/auth';
import type { CurrencyInfo } from '@/lib/money';
import { useAuth } from '@/providers/auth-provider';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface DashboardPayload {
  baseCurrency: CurrencyInfo & { symbol: string };
  income: {
    totalMinor: number;
    coursePaymentsMinor: number;
    otherIncomeMinor: number;
    previousTotalMinor: number;
  };
  outcome: {
    totalMinor: number;
    expensesMinor: number;
    teacherPayoutsMinor: number;
    previousTotalMinor: number;
  };
  netMinor: number;
  previousNetMinor: number;
  outstandingMinor: number;
  overdueMinor: number;
  overdueCount: number;
}

export interface UnpaidRow {
  id: string;
  seq: number;
  dueDate: string;
  amountDueMinor: number;
  amountPaidMinor: number;
  remainingMinor: number;
  status: InstallmentStatus;
  enrollmentId: string;
  student: { id: string; name: string; phone: string };
  course: { id: string; name: string; currency: CurrencyInfo };
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api<AuthUser>('/auth/me'),
    staleTime: 5 * 60_000,
  });
}

export function useAdminDashboard(enabled: boolean) {
  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => api<DashboardPayload>('/analytics/dashboard'),
    enabled,
  });
}

export function useUnpaidInstallments(
  params: { status?: InstallmentStatus } = {},
) {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  const suffix = search.size > 0 ? `?${search.toString()}` : '';
  return useQuery({
    queryKey: ['installments', 'unpaid', params],
    queryFn: () => api<UnpaidRow[]>(`/installments/unpaid${suffix}`),
  });
}

export function useLogout() {
  const { clearSession } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async () => {
      await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    },
    onSettled: () => {
      clearSession();
      queryClient.clear();
      void navigate('/login', { replace: true });
    },
  });
}
