import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AuditRow {
  id: string;
  createdAt: string;
  userId: string | null;
  userEmail: string;
  action: string;
  method: string;
  path: string;
  entityId: string | null;
  status: number;
  ip: string | null;
  meta: Record<string, unknown> | null;
  user: { id: string; name: string } | null;
}

export function useAuditLog(search: string, method: string) {
  return useInfiniteQuery({
    queryKey: ['audit', { search, method }],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ page: String(pageParam) });
      if (search) params.set('search', search);
      if (method) params.set('method', method);
      return api<AuditRow[]>(`/audit?${params.toString()}`);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 50 ? allPages.length : undefined,
  });
}
