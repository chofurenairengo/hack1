import { z } from 'zod';

export const SlideStatusSchema = z.enum([
  'draft',
  'pending_introducee',
  'pending_organizer',
  'approved',
  'rejected',
]);

export type SlideStatus = z.infer<typeof SlideStatusSchema>;
