import { loginSchema, type LoginInput } from '@cyberpedia/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import type { LoginResponse } from '@/api/queries';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

export function LoginPage() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const login = useMutation({
    mutationFn: (input: LoginInput) =>
      api<LoginResponse>('/auth/login', { method: 'POST', body: input }),
    onSuccess: (session) => {
      setSession(session);
      void navigate('/', { replace: true });
    },
  });

  const errorMessage =
    login.error instanceof ApiError && login.error.status === 401
      ? 'Email or password is incorrect.'
      : login.error
        ? 'Could not reach the server — check your connection and try again.'
        : null;

  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="font-display text-[26px] font-bold tracking-tight">
            Cyberpedia<span className="text-brand"> Payments</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Course payments, collected and accounted for.
          </p>
        </div>

        <Card className="p-6">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              void form.handleSubmit((values) => login.mutate(values))(event);
            }}
          >
            {errorMessage && (
              <p
                role="alert"
                className="rounded-xl bg-overdue-soft px-3.5 py-2.5 text-[13px] font-medium text-overdue"
              >
                {errorMessage}
              </p>
            )}
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@cyberpedia.local"
              error={form.formState.errors.email?.message}
              {...form.register('email')}
            />
            <TextField
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              error={form.formState.errors.password?.message}
              {...form.register('password')}
            />
            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={login.isPending}
            >
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
