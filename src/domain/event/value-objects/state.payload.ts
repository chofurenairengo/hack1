import { z } from 'zod';
import { EventPhaseSchema } from './event-phase.vo';

export const StatePayloadSchema = z.object({
  phase: EventPhaseSchema,
  round: z.number().int().min(0),
  startedAt: z.string().datetime(),
});

export type StatePayload = Readonly<z.infer<typeof StatePayloadSchema>>;
