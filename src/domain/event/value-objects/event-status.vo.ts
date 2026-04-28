import { z } from 'zod';

export const EventStatusSchema = z.enum([
  'draft',
  'scheduled',
  'live',
  'finished',
  'cancelled',
]);

export type EventStatus = z.infer<typeof EventStatusSchema>;
