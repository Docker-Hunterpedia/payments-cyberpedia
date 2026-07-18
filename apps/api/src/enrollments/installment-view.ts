import { deriveInstallmentStatus } from '@cyberpedia/shared';
import type { Installment } from '@prisma/client';

// Payments land in Phase 5; until then paid is always 0.
export function toInstallmentView(
  installment: Installment,
  isFree: boolean,
  paidMinor = 0,
) {
  const amountDueMinor = isFree ? 0 : installment.amountMinor;
  return {
    ...installment,
    amountDueMinor,
    amountPaidMinor: paidMinor,
    status: deriveInstallmentStatus({
      amountDueMinor,
      amountPaidMinor: paidMinor,
      dueDate: installment.dueDate,
    }),
  };
}

export function withInstallmentViews<
  T extends { isFree: boolean; installments: Installment[] },
>(enrollment: T) {
  return {
    ...enrollment,
    installments: enrollment.installments.map((installment) =>
      toInstallmentView(installment, enrollment.isFree),
    ),
  };
}
