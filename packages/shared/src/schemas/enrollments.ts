import { z } from 'zod';

export const enrollmentInstallmentSchema = z.object({
  amountMinor: z.number().int().min(0),
  // Days after enrollment when this installment is due
  dueDays: z.number().int().min(0),
});
export type EnrollmentInstallmentInput = z.infer<
  typeof enrollmentInstallmentSchema
>;

export const createEnrollmentSchema = z
  .object({
    studentId: z.string().min(1),
    courseId: z.string().min(1),
    // Pick a course plan template...
    planTemplateId: z.string().min(1).optional(),
    // ...and/or override with custom installments for this student.
    // When both are given the custom installments win and the template is
    // kept as provenance.
    installments: z
      .array(enrollmentInstallmentSchema)
      .min(1)
      .max(24)
      .optional(),
    discountId: z.string().min(1).optional(),
    isFree: z.boolean().optional(),
    freeReason: z.string().trim().min(1).optional(),
    // Defaults to now; allows backfilling older enrollments
    enrolledAt: z.coerce.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.planTemplateId && !data.installments?.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['planTemplateId'],
        message: 'Provide a plan template or custom installments',
      });
    }
  });
export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;

export const grantFreeSchema = z.object({
  reason: z.string().trim().min(1).optional(),
});
export type GrantFreeInput = z.infer<typeof grantFreeSchema>;
