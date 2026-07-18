import type { InstallmentStatus } from '@cyberpedia/shared';
import { cn } from '@/lib/utils';

const badgeTones = {
  neutral: 'bg-line/60 text-muted',
  brand: 'bg-brand-soft text-brand-strong',
  paid: 'bg-paid-soft text-paid',
  partial: 'bg-partial-soft text-partial',
  overdue: 'bg-overdue-soft text-overdue',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: keyof typeof badgeTones;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const statusConfig: Record<
  InstallmentStatus,
  { label: string; tone: keyof typeof badgeTones }
> = {
  PAID: { label: 'Paid', tone: 'paid' },
  PARTIAL: { label: 'Partial', tone: 'partial' },
  UNPAID: { label: 'Unpaid', tone: 'neutral' },
  OVERDUE: { label: 'Overdue', tone: 'overdue' },
};

export function StatusBadge({ status }: { status: InstallmentStatus }) {
  const config = statusConfig[status];
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
