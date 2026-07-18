import { InstallmentStatus } from '../enums';

const DAY_MS = 86_400_000;

// Status precedence: PAID > OVERDUE > PARTIAL > UNPAID.
// An installment only becomes OVERDUE once its due day has fully passed.
export function deriveInstallmentStatus(input: {
  amountDueMinor: number;
  amountPaidMinor: number;
  dueDate: Date | string;
  now?: Date;
}): InstallmentStatus {
  if (input.amountPaidMinor >= input.amountDueMinor) {
    return InstallmentStatus.PAID;
  }
  const due =
    typeof input.dueDate === 'string' ? new Date(input.dueDate) : input.dueDate;
  const now = input.now ?? new Date();
  if (now.getTime() >= due.getTime() + DAY_MS) {
    return InstallmentStatus.OVERDUE;
  }
  return input.amountPaidMinor > 0
    ? InstallmentStatus.PARTIAL
    : InstallmentStatus.UNPAID;
}

// A fixed discount is taken from the LAST installments first, so early
// installments keep their full amounts and money comes in sooner.
export function applyDiscount(
  amountsMinor: number[],
  discountMinor: number,
): number[] {
  const result = [...amountsMinor];
  let remaining = discountMinor;
  for (let i = result.length - 1; i >= 0 && remaining > 0; i--) {
    const cut = Math.min(result[i], remaining);
    result[i] -= cut;
    remaining -= cut;
  }
  return result;
}
