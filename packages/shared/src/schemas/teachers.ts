import { z } from 'zod';

export const createTeacherSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1).optional(),
  email: z.email().optional(),
  notes: z.string().trim().optional(),
});
export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;

export const updateTeacherSchema = createTeacherSchema.partial();
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
