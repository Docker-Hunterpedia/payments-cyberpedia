import { z } from 'zod';
import { currencyCodeSchema } from './reference';

export const createPaymentSchema = z.object({
  enrollmentId: z.string().min(1),
  // Omit to auto-assign the next unpaid installment
  installmentId: z.string().min(1).optional(),
  amountMinor: z.number().int().positive(),
  // Currency the money was actually received in — defaults to the course
  // currency. When different, appliedMinor says how much of the installment
  // it counts as (in the course currency), decided by the person recording.
  currencyCode: currencyCodeSchema.optional(),
  appliedMinor: z.number().int().positive().optional(),
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
