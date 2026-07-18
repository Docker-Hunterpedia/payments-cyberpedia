import { z } from 'zod';

// Name, email, and phone are all mandatory (confirmed decision).
export const createStudentSchema = z.object({
  name: z.string().trim().min(1),
  email: z.email(),
  phone: z.string().trim().min(5),
});
export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export const updateStudentSchema = createStudentSchema.partial();
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
