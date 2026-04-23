import { z } from 'zod';

export const GenderSchema = z.enum(['female', 'male', 'other']);

export type Gender = z.infer<typeof GenderSchema>;
