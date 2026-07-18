import { deriveInstallmentStatus } from '@cyberpedia/shared';
import type { Installment } from '@prisma/client';

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
    remainingMinor: Math.max(0, amountDueMinor - paidMinor),
    status: deriveInstallmentStatus({
      amountDueMinor,
      amountPaidMinor: paidMinor,
      dueDate: installment.dueDate,
    }),
  };
}

export function withInstallmentViews<
  T extends { isFree: boolean; installments: Installment[] },
>(enrollment: T, paidByInstallment?: Map<string, number>) {
  return {
    ...enrollment,
    installments: enrollment.installments.map((installment) =>
      toInstallmentView(
        installment,
        enrollment.isFree,
        paidByInstallment?.get(installment.id) ?? 0,
      ),
    ),
  };
}
