import { z } from 'zod';
import { asDeckId, asPairId } from '@/shared/types/ids';

export const SlideSyncPayloadSchema = z.object({
  deckId: z.string().transform(asDeckId),
  pairId: z.string().transform(asPairId),
  slideIndex: z.number().int().min(0).max(4),
  updatedAt: z.string().datetime(),
});

export type SlideSyncPayload = Readonly<z.infer<typeof SlideSyncPayloadSchema>>;
