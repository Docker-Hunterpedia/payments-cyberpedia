import { z } from 'zod';
import { CompensationType, CourseStatus } from '../enums';
import { currencyCodeSchema } from './reference';

// --- Payment plan templates ---

export const installmentTemplateSchema = z.object({
  amountMinor: z.number().int().positive(),
  // Days after enrollment when this installment is due (0 = due immediately)
  dueDays: z.number().int().min(0),
});
export type InstallmentTemplateInput = z.infer<
  typeof installmentTemplateSchema
>;

export const planTemplateSchema = z.object({
  name: z.string().trim().min(1),
  // Ordered: array position defines the installment sequence (1st, 2nd, ...)
  installments: z.array(installmentTemplateSchema).min(1).max(24),
});
export type PlanTemplateInput = z.infer<typeof planTemplateSchema>;

// --- Courses ---

export const createCourseSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  priceMinor: z.number().int().positive(),
  currencyCode: currencyCodeSchema,
  sessionsCount: z.number().int().min(0).default(0),
  // Optional; when omitted a single "Full payment" plan is created
  plans: z.array(planTemplateSchema).min(1).optional(),
});
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  priceMinor: z.number().int().positive().optional(),
  currencyCode: currencyCodeSchema.optional(),
  sessionsCount: z.number().int().min(0).optional(),
  status: z.enum(CourseStatus).optional(),
});
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

// --- Teacher assignment / compensation ---

const compensationFields = z.object({
  compensationType: z.enum(CompensationType),
  // Required when compensationType is PERCENTAGE (share of collected money)
  percent: z.number().positive().max(100).optional(),
  // Required for FIXED_COURSE / FIXED_SESSION, in the course's currency
  amountMinor: z.number().int().positive().optional(),
});

function requireCompensationValue(
  data: z.infer<typeof compensationFields>,
  ctx: z.RefinementCtx,
) {
  if (data.compensationType === CompensationType.PERCENTAGE) {
    if (data.percent === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['percent'],
        message: 'percent is required for PERCENTAGE compensation',
      });
    }
  } else if (data.amountMinor === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['amountMinor'],
      message: 'amountMinor is required for fixed compensation',
    });
  }
}

export const assignTeacherSchema = compensationFields
  .extend({ teacherId: z.string().min(1) })
  .superRefine(requireCompensationValue);
export type AssignTeacherInput = z.infer<typeof assignTeacherSchema>;

export const updateCourseTeacherSchema = compensationFields.superRefine(
  requireCompensationValue,
);
export type UpdateCourseTeacherInput = z.infer<
  typeof updateCourseTeacherSchema
>;
