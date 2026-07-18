import type { InputHTMLAttributes, LabelHTMLAttributes, Ref } from 'react';
import { useId } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
}

// text-base (16px) prevents iOS from zooming into focused inputs
export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-base text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('block text-[13px] font-semibold text-muted', className)}
      {...props}
    />
  );
}

interface TextFieldProps extends InputProps {
  label: string;
  error?: string;
  hint?: string;
}

export function TextField({
  label,
  error,
  hint,
  id,
  className,
  ...props
}: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(
          error && 'border-overdue focus:border-overdue focus:ring-overdue/20',
          className,
        )}
        {...props}
      />
      {error ? (
        <p className="text-[13px] font-medium text-overdue">{error}</p>
      ) : hint ? (
        <p className="text-[13px] text-faint">{hint}</p>
      ) : null}
    </div>
  );
}
