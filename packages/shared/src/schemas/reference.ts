import { z } from 'zod';

// --- Currencies ---

export const currencyCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Currency code must be 3 letters (e.g. USD)');

export const createCurrencySchema = z.object({
  code: currencyCodeSchema,
  name: z.string().trim().min(1),
  symbol: z.string().trim().min(1).max(8),
  decimals: z.number().int().min(0).max(4).default(2),
  ratePerBase: z.number().positive(),
  isBase: z.boolean().optional(),
});
export type CreateCurrencyInput = z.infer<typeof createCurrencySchema>;

export const updateCurrencySchema = z.object({
  name: z.string().trim().min(1).optional(),
  symbol: z.string().trim().min(1).max(8).optional(),
  decimals: z.number().int().min(0).max(4).optional(),
  ratePerBase: z.number().positive().optional(),
  isBase: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateCurrencyInput = z.infer<typeof updateCurrencySchema>;

// --- Payment methods ---

export const createPaymentMethodSchema = z.object({
  name: z.string().trim().min(1),
});
export type CreatePaymentMethodInput = z.infer<
  typeof createPaymentMethodSchema
>;

export const updatePaymentMethodSchema = z.object({
  name: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
});
export type UpdatePaymentMethodInput = z.infer<
  typeof updatePaymentMethodSchema
>;

// --- Discount definitions ---

export const createDiscountSchema = z.object({
  name: z.string().trim().min(1),
  amountMinor: z.number().int().positive(),
  currencyCode: currencyCodeSchema,
});
export type CreateDiscountInput = z.infer<typeof createDiscountSchema>;

export const updateDiscountSchema = z.object({
  name: z.string().trim().min(1).optional(),
  amountMinor: z.number().int().positive().optional(),
  currencyCode: currencyCodeSchema.optional(),
  isActive: z.boolean().optional(),
});
export type UpdateDiscountInput = z.infer<typeof updateDiscountSchema>;
