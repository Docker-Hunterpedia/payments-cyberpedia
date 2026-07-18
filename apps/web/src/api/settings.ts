import type {
  CreateUserInput,
  ResetPasswordInput,
  Role,
  UpdateUserInput,
} from '@cyberpedia/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api<UserRow[]>('/users'),
  });
}

function useUsersInvalidation() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ['users'] });
}

export function useCreateUser() {
  const invalidate = useUsersInvalidation();
  return useMutation({
    mutationFn: (input: CreateUserInput) =>
      api<UserRow>('/users', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateUser(userId: string) {
  const invalidate = useUsersInvalidation();
  return useMutation({
    mutationFn: (input: UpdateUserInput) =>
      api<UserRow>(`/users/${userId}`, { method: 'PATCH', body: input }),
    onSuccess: invalidate,
  });
}

export function useResetPassword(userId: string) {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) =>
      api<UserRow>(`/users/${userId}/password`, {
        method: 'PATCH',
        body: input,
      }),
  });
}
