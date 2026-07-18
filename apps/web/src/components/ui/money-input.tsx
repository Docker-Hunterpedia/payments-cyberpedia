import { Input, Label } from '@/components/ui/input';
import type { CurrencyInfo } from '@/lib/money';
import { cn } from '@/lib/utils';

// Amounts are typed in MAJOR units ("60" = 60.00 USD) and converted to minor.
export function parseMajorToMinor(
  value: string,
  decimals: number,
): number | null {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 10 ** decimals);
}

export function minorToMajorString(
  amountMinor: number,
  decimals: number,
): string {
  return (amountMinor / 10 ** decimals).toFixed(decimals);
}

export function MoneyInput({
  label,
  value,
  onChange,
  currency,
  error,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  currency: CurrencyInfo;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
          placeholder="0"
          aria-invalid={error ? true : undefined}
          className={cn(
            'pr-14 font-mono text-lg font-medium tabular-nums',
            error &&
              'border-overdue focus:border-overdue focus:ring-overdue/20',
          )}
        />
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold tracking-wide text-faint">
          {currency.code}
        </span>
      </div>
      {error ? (
        <p className="text-[13px] font-medium text-overdue">{error}</p>
      ) : hint ? (
        <p className="text-[13px] text-faint">{hint}</p>
      ) : null}
    </div>
  );
}
