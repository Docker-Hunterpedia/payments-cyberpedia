import { useQuery } from '@tanstack/react-query';
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

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => api<CourseListItem[]>('/courses'),
  });
}
