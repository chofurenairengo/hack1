import { z } from 'zod';

export const EventPhaseSchema = z.enum([
  'pre_event',
  'entry',
  'presentation',
  'voting',
  'intermission',
  'mingling',
  'closing',
]);

export type EventPhase = z.infer<typeof EventPhaseSchema>;
