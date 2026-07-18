import { ChevronDown } from 'lucide-react';
import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// Styled native select — native pickers beat custom dropdowns on phones.
export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn('relative', className)}>
      <select
        className="h-11 w-full appearance-none rounded-xl border border-line bg-surface pl-3.5 pr-9 text-base text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:opacity-50"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
    </div>
  );
}
