import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

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
