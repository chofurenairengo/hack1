import { z } from 'zod';

export const SlideSyncPayloadSchema = z.object({
  deckId: z.string(),
  pairId: z.string(),
  slideIndex: z.number().int().min(0).max(4),
  updatedAt: z.string().datetime(),
});

export type SlideSyncPayload = Readonly<z.infer<typeof SlideSyncPayloadSchema>>;
