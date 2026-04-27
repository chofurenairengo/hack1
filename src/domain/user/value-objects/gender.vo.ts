import { z } from 'zod';

export const GenderSchema = z.enum(['female', 'male']);

export type Gender = z.infer<typeof GenderSchema>;
