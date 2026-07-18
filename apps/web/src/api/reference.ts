import type {
  CreateCurrencyInput,
  CreateDiscountInput,
  CreatePaymentMethodInput,
  UpdateCurrencyInput,
  UpdateDiscountInput,
  UpdatePaymentMethodInput,
} from '@cyberpedia/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DiscountItem, PaymentMethodItem } from './record';

export interface CurrencyRow {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  ratePerBase: string;
  isBase: boolean;
  isActive: boolean;
}

export function useCurrencies() {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: () => api<CurrencyRow[]>('/currencies'),
  });
}

function useInvalidate(key: string) {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: [key] });
}

export function useCreateCurrency() {
  const invalidate = useInvalidate('currencies');
  return useMutation({
    mutationFn: (input: CreateCurrencyInput) =>
      api<CurrencyRow>('/currencies', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateCurrency(code: string) {
  const invalidate = useInvalidate('currencies');
  return useMutation({
    mutationFn: (input: UpdateCurrencyInput) =>
      api<CurrencyRow>(`/currencies/${code}`, { method: 'PATCH', body: input }),
    onSuccess: invalidate,
  });
}

export function usePaymentMethodsList() {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => api<PaymentMethodItem[]>('/payment-methods'),
  });
}

export function useCreatePaymentMethod() {
  const invalidate = useInvalidate('payment-methods');
  return useMutation({
    mutationFn: (input: CreatePaymentMethodInput) =>
      api<PaymentMethodItem>('/payment-methods', {
        method: 'POST',
        body: input,
      }),
    onSuccess: invalidate,
  });
}

export function useUpdatePaymentMethod(methodId: string) {
  const invalidate = useInvalidate('payment-methods');
  return useMutation({
    mutationFn: (input: UpdatePaymentMethodInput) =>
      api<PaymentMethodItem>(`/payment-methods/${methodId}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: invalidate,
  });
}

export function useDiscountsList() {
  return useQuery({
    queryKey: ['discounts'],
    queryFn: () => api<DiscountItem[]>('/discounts'),
  });
}

export function useCreateDiscount() {
  const invalidate = useInvalidate('discounts');
  return useMutation({
    mutationFn: (input: CreateDiscountInput) =>
      api<DiscountItem>('/discounts', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateDiscount(discountId: string) {
  const invalidate = useInvalidate('discounts');
  return useMutation({
    mutationFn: (input: UpdateDiscountInput) =>
      api<DiscountItem>(`/discounts/${discountId}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: invalidate,
  });
}
