import { Role } from '@cyberpedia/shared';
import { AlarmClock, Banknote, ChevronRight, UserPlus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useAdminDashboard, useUnpaidInstallments } from '@/api/queries';
import { PageBody, PageHeader } from '@/components/layout/page';
import { Card } from '@/components/ui/card';
import { Money } from '@/components/ui/money';
import { LoadingState } from '@/components/ui/spinner';
import { ErrorState } from '@/components/ui/states';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function StatTile({
  label,
  children,
  caption,
}: {
  label: string;
  children: ReactNode;
  caption?: ReactNode;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-faint">
        {label}
      </p>
      <p className="mt-1.5 text-xl lg:text-[22px]">{children}</p>
      {caption && <p className="mt-1 text-[13px] text-muted">{caption}</p>}
    </Card>
  );
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

function AdminDashboard() {
  const dashboard = useAdminDashboard(true);

  if (dashboard.isPending)
    return <LoadingState label="Crunching this month's numbers" />;
  if (dashboard.isError)
    return <ErrorState onRetry={() => void dashboard.refetch()} />;

  const data = dashboard.data;
  const currency = data.baseCurrency;

  return (
    <div className="space-y-4">
      <OverdueCallout count={data.overdueCount} />
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Income" caption="this month">
          <Money amountMinor={data.income.totalMinor} currency={currency} />
        </StatTile>
        <StatTile label="Outcome" caption="this month">
          <Money amountMinor={data.outcome.totalMinor} currency={currency} />
        </StatTile>
        <StatTile label="Net profit" caption="this month">
          <Money
            amountMinor={data.netMinor}
            currency={currency}
            tone={data.netMinor < 0 ? 'overdue' : 'paid'}
          />
        </StatTile>
        <StatTile label="Outstanding" caption="still to collect">
          <Money amountMinor={data.outstandingMinor} currency={currency} />
        </StatTile>
      </div>
      <QuickActions />
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
