import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, Ref } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white hover:bg-brand-strong',
        outline:
          'border border-line bg-surface text-ink hover:border-brand/50 hover:text-brand-strong',
        soft: 'bg-brand-soft text-brand-strong hover:bg-brand/15',
        ghost: 'text-muted hover:bg-line/60 hover:text-ink',
        destructive: 'bg-overdue text-white hover:bg-overdue/90',
      },
      size: {
        sm: 'h-9 px-3.5 text-[13px]',
        md: 'h-11 px-5',
        lg: 'h-12 px-6 text-[15px]',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  className,
  variant,
  size,
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" tone="onPrimary" />}
      {children}
    </button>
  );
}
