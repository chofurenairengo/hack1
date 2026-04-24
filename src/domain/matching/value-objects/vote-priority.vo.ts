import { z } from 'zod';

export const VotePrioritySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export type VotePriority = z.infer<typeof VotePrioritySchema>;
