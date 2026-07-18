import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  action?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3.5 lg:px-8">
        {back && (
          <Link
            to={back}
            aria-label="Back"
            className="-ml-1 rounded-lg p-1.5 text-muted transition-colors hover:bg-line/60 hover:text-ink"
          >
            <ArrowLeft className="size-5" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl font-semibold tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-[13px] text-muted">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
    </header>
  );
}

export function PageBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mx-auto max-w-5xl px-4 pb-32 pt-4 lg:px-8 lg:pb-12 lg:pt-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
