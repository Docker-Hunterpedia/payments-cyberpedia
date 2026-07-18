import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface TeacherListItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  _count: { courses: number };
}

export function useTeachers() {
  return useQuery({
    queryKey: ['teachers'],
    queryFn: () => api<TeacherListItem[]>('/teachers'),
  });
}
