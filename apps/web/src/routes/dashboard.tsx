import { Role } from '@cyberpedia/shared';
import { AlarmClock, Banknote, ChevronRight, UserPlus } from 'lucide-react';
import { Link } from 'react-router';
import {
  useAdminDashboard,
  useRecentPayments,
  useUnpaidInstallments,
} from '@/api/queries';
import { PageBody, PageHeader } from '@/components/layout/page';
import { Card } from '@/components/ui/card';
import { Money } from '@/components/ui/money';
import { LoadingState } from '@/components/ui/spinner';
import { ErrorState } from '@/components/ui/states';
import { formatDate, ordinal } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function OverdueCallout({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Link to="/unpaid" className="block">
      <Card className="flex items-center gap-3.5 border-overdue/25 bg-overdue-soft/60 p-4 transition-colors hover:border-overdue/40">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-overdue-soft text-overdue">
          <AlarmClock className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            {count} overdue installment{count === 1 ? '' : 's'}
          </p>
          <p className="text-[13px] text-muted">
            Students to follow up with today
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-faint" />
      </Card>
    </Link>
  );
}

function RecentPayments() {
  const recent = useRecentPayments();
  if (!recent.data || recent.data.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-base font-semibold">Recent payments</h2>
      <Card>
        <ul className="divide-y divide-line/60">
          {recent.data.map((payment) => (
            <li key={payment.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {payment.enrollment.student.name}
                  <span className="text-muted">
                    {' '}
                    · {payment.enrollment.course.name}
                  </span>
                </p>
                <p className="text-[13px] text-muted">
                  {formatDate(payment.paidAt)} · {payment.method.name} ·{' '}
                  {ordinal(payment.installment.seq)} payment
                </p>
              </div>
              <Money
                amountMinor={payment.amountMinor}
                currency={payment.currency}
                className="text-sm"
              />
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link
        to="/record"
        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
      >
        <Banknote className="size-4" />
        Record payment
      </Link>
      <Link
        to="/students"
        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface text-sm font-semibold text-ink transition-colors hover:border-brand/50 hover:text-brand-strong"
      >
        <UserPlus className="size-4" />
        Add student
      </Link>
    </div>
  );
}

function MoneyLine({
  label,
  amountMinor,
  currency,
  tone,
  strong,
}: {
  label: string;
  amountMinor: number;
  currency: { code: string; decimals: number };
  tone?: 'paid' | 'overdue' | 'muted';
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={cn('text-sm', strong ? 'font-semibold' : 'text-muted')}>
        {label}
      </span>
      <Money
        amountMinor={amountMinor}
        currency={currency}
        tone={tone}
        className={strong ? 'text-base' : 'text-sm'}
      />
    </div>
  );
}

function AdminDashboard() {
  const dashboard = useAdminDashboard(true);

  if (dashboard.isPending)
    return <LoadingState label="Crunching this month's numbers" />;
  if (dashboard.isError)
    return <ErrorState onRetry={() => void dashboard.refetch()} />;

  const data = dashboard.data;

  return (
    <div className="space-y-4">
      <OverdueCallout count={data.overdueCount} />
      {data.byCurrency.length === 0 ? (
        <Card className="p-5 text-center text-sm text-muted">
          No money has moved yet this month.
        </Card>
      ) : (
        data.byCurrency.map((row) => (
          <Card key={row.currency.code} className="space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-faint">
              {row.currency.code} · this month
            </p>
            <MoneyLine
              label="Income"
              amountMinor={row.incomeMinor}
              currency={row.currency}
              tone="paid"
              strong
            />
            <MoneyLine
              label="Outcome"
              amountMinor={row.outcomeMinor}
              currency={row.currency}
              strong
            />
            <MoneyLine
              label="Net"
              amountMinor={row.netMinor}
              currency={row.currency}
              tone={row.netMinor < 0 ? 'overdue' : 'paid'}
              strong
            />
            <MoneyLine
              label="Still to collect"
              amountMinor={row.outstandingMinor}
              currency={row.currency}
              tone={row.overdueCount > 0 ? 'overdue' : 'muted'}
            />
          </Card>
        ))
      )}
      <QuickActions />
      <RecentPayments />
    </div>
  );
}

function AccounterDashboard() {
  const overdue = useUnpaidInstallments({ status: 'OVERDUE' });

  if (overdue.isPending)
    return <LoadingState label="Checking who still owes" />;
  if (overdue.isError)
    return <ErrorState onRetry={() => void overdue.refetch()} />;

  const count = overdue.data.length;
  return (
    <div className="space-y-4">
      <OverdueCallout count={count} />
      {count === 0 && (
        <Card className="p-5 text-center">
          <p className={cn('font-display text-base font-semibold text-paid')}>
            Nothing overdue right now
          </p>
          <p className="mt-1 text-sm text-muted">
            Every due installment has been collected. New payments land under
            Record.
          </p>
        </Card>
      )}
      <QuickActions />
      <RecentPayments />
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        subtitle="Here's where the money stands."
      />
      <PageBody>
        {isAdmin ? <AdminDashboard /> : <AccounterDashboard />}
      </PageBody>
    </>
  );
}
