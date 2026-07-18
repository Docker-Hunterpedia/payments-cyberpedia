import { z } from 'zod';
import { LedgerEntryType } from '../enums';
import { currencyCodeSchema } from './reference';

// --- Ledger categories ---

export const createLedgerCategorySchema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(LedgerEntryType),
});
export type CreateLedgerCategoryInput = z.infer<
  typeof createLedgerCategorySchema
>;

// Type is immutable so existing entries can never contradict their category.
export const updateLedgerCategorySchema = z.object({
  name: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateLedgerCategoryInput = z.infer<
  typeof updateLedgerCategorySchema
>;

// --- Ledger entries ---

export const createLedgerEntrySchema = z.object({
  categoryId: z.string().min(1),
  amountMinor: z.number().int().positive(),
  currencyCode: currencyCodeSchema,
  date: z.coerce.date().optional(),
  note: z.string().trim().min(1).optional(),
});
export type CreateLedgerEntryInput = z.infer<typeof createLedgerEntrySchema>;

export const updateLedgerEntrySchema = z.object({
  categoryId: z.string().min(1).optional(),
  amountMinor: z.number().int().positive().optional(),
  currencyCode: currencyCodeSchema.optional(),
  date: z.coerce.date().optional(),
  note: z.string().trim().min(1).nullable().optional(),
});
export type UpdateLedgerEntryInput = z.infer<typeof updateLedgerEntrySchema>;

// --- Teacher payouts ---

export const createTeacherPayoutSchema = z.object({
  // When set, the payout is tied to the course and uses its currency
  courseId: z.string().min(1).optional(),
  amountMinor: z.number().int().positive(),
  // Required when no courseId is given
  currencyCode: currencyCodeSchema.optional(),
  date: z.coerce.date().optional(),
  note: z.string().trim().min(1).optional(),
});
export type CreateTeacherPayoutInput = z.infer<
  typeof createTeacherPayoutSchema
>;
