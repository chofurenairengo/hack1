import { z } from 'zod';

export const MatchStatusSchema = z.enum(['active', 'blocked', 'reported']);

export type MatchStatus = z.infer<typeof MatchStatusSchema>;
