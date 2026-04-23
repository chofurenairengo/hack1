import { z } from 'zod';

export const EntryTypeSchema = z.enum(['presenter_pair', 'audience']);

export type EntryType = z.infer<typeof EntryTypeSchema>;
