import { AlertTriangle, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-14 text-center',
        className,
      )}
    >
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon className="size-6" />
      </div>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message = 'Something went wrong while loading this screen.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-overdue/25 bg-overdue-soft/50 px-6 py-14 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-overdue-soft text-overdue">
        <AlertTriangle className="size-6" />
      </div>
      <p className="max-w-sm text-sm font-medium text-ink">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
