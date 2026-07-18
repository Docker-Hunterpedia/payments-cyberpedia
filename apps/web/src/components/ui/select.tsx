import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

// Radix reserves the empty string, but our call sites use '' for
// "no selection" / "all" — map it through a sentinel both ways.
const EMPTY = '__empty__';
const toRadix = (value: string) => (value === '' ? EMPTY : value);
const fromRadix = (value: string) => (value === EMPTY ? '' : value);

function Item({ option }: { option: SelectOption }) {
  return (
    <SelectPrimitive.Item
      value={toRadix(option.value)}
      className="relative flex cursor-pointer select-none items-center rounded-lg py-2.5 pl-3.5 pr-9 text-[15px] text-ink outline-none data-[highlighted]:bg-brand-soft data-[highlighted]:text-brand-strong data-[state=checked]:font-semibold"
    >
      <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-3 text-brand">
        <Check className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export function Select({
  value,
  onValueChange,
  options,
  groups,
  placeholder = 'Select…',
  disabled,
  className,
  ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options?: SelectOption[];
  groups?: SelectOptionGroup[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <SelectPrimitive.Root
      value={toRadix(value)}
      onValueChange={(next) => onValueChange(fromRadix(next))}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3.5 text-left text-base text-ink transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:opacity-50 data-[placeholder]:text-faint',
          className,
        )}
      >
        <span className="truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4 shrink-0 text-faint" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-72 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-line bg-surface shadow-raised"
        >
          <SelectPrimitive.Viewport className="max-h-72 overflow-y-auto p-1">
            {options?.map((option) => (
              <Item key={option.value || EMPTY} option={option} />
            ))}
            {groups?.map((group) => (
              <SelectPrimitive.Group key={group.label}>
                <SelectPrimitive.Label className="px-3.5 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
                  {group.label}
                </SelectPrimitive.Label>
                {group.options.map((option) => (
                  <Item key={option.value || EMPTY} option={option} />
                ))}
              </SelectPrimitive.Group>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
