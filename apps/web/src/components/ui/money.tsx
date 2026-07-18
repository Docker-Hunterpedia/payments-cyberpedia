import { formatMinor, type CurrencyInfo } from '@/lib/money';
import { cn } from '@/lib/utils';

const tones = {
  default: 'text-ink',
  muted: 'text-muted',
  paid: 'text-paid',
  overdue: 'text-overdue',
};

// The ledger figure: mono tabular digits with a quiet currency code.
export function Money({
  amountMinor,
  currency,
  tone = 'default',
  className,
}: {
  amountMinor: number;
  currency: CurrencyInfo;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'font-mono font-medium tabular-nums',
        tones[tone],
        className,
      )}
    >
      {formatMinor(amountMinor, currency.decimals)}
      <span className="ml-1 text-[0.65em] font-normal tracking-wide text-faint">
        {currency.code}
      </span>
    </span>
  );
}
