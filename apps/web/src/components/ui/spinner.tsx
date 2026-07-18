import { cn } from '@/lib/utils';

const sizes = {
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-8 border-[3px]',
};

export function Spinner({
  size = 'md',
  tone = 'brand',
  className,
}: {
  size?: keyof typeof sizes;
  tone?: 'brand' | 'onPrimary';
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block animate-spin rounded-full',
        tone === 'brand'
          ? 'border-line border-t-brand'
          : 'border-white/30 border-t-white',
        sizes[size],
        className,
      )}
    />
  );
}

export function LoadingState({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <Spinner size="lg" />
      {label && <p className="text-sm text-muted">{label}</p>}
    </div>
  );
}
