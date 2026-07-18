import type {
  CreateLedgerCategoryInput,
  CreateLedgerEntryInput,
  LedgerEntryType,
  UpdateLedgerEntryInput,
} from '@cyberpedia/shared';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CurrencyInfo } from '@/lib/money';

export interface LedgerCategoryRow {
  id: string;
  name: string;
  type: LedgerEntryType;
  isActive: boolean;
  _count: { entries: number };
}

export interface LedgerEntryRow {
  id: string;
  type: LedgerEntryType;
  amountMinor: number;
  currencyCode: string;
  date: string;
  note: string | null;
  category: { id: string; name: string; type: LedgerEntryType };
  currency: CurrencyInfo;
  createdBy: { id: string; name: string };
}

export function useLedgerCategories() {
  return useQuery({
    queryKey: ['ledger', 'categories'],
    queryFn: () => api<LedgerCategoryRow[]>('/ledger/categories'),
  });
}

export function useLedgerEntries(type?: LedgerEntryType) {
  return useQuery({
    queryKey: ['ledger', 'entries', { type }],
    queryFn: () =>
      api<LedgerEntryRow[]>(`/ledger/entries${type ? `?type=${type}` : ''}`),
    placeholderData: keepPreviousData,
  });
}

function useLedgerInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['ledger'] });
    void queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };
}

export function useCreateCategory() {
  const invalidate = useLedgerInvalidation();
  return useMutation({
    mutationFn: (input: CreateLedgerCategoryInput) =>
      api<LedgerCategoryRow>('/ledger/categories', {
        method: 'POST',
        body: input,
      }),
    onSuccess: invalidate,
  });
}

export function useCreateEntry() {
  const invalidate = useLedgerInvalidation();
  return useMutation({
    mutationFn: (input: CreateLedgerEntryInput) =>
      api<LedgerEntryRow>('/ledger/entries', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateEntry(entryId: string) {
  const invalidate = useLedgerInvalidation();
  return useMutation({
    mutationFn: (input: UpdateLedgerEntryInput) =>
      api<LedgerEntryRow>(`/ledger/entries/${entryId}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteEntry() {
  const invalidate = useLedgerInvalidation();
  return useMutation({
    mutationFn: (entryId: string) =>
      api<void>(`/ledger/entries/${entryId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
