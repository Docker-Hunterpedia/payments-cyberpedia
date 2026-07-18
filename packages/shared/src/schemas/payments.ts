import { z } from 'zod';

export const createPaymentSchema = z.object({
  enrollmentId: z.string().min(1),
  // Omit to auto-assign the next unpaid installment
  installmentId: z.string().min(1).optional(),
  amountMinor: z.number().int().positive(),
  methodId: z.string().min(1),
  paidAt: z.coerce.date().optional(),
  note: z.string().trim().min(1).optional(),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const updatePaymentSchema = z.object({
  amountMinor: z.number().int().positive().optional(),
  methodId: z.string().min(1).optional(),
  paidAt: z.coerce.date().optional(),
  note: z.string().trim().min(1).nullable().optional(),
});
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

export const voidPaymentSchema = z.object({
  reason: z.string().trim().min(1).optional(),
});
export type VoidPaymentInput = z.infer<typeof voidPaymentSchema>;
