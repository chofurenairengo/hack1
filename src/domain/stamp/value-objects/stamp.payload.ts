import { z } from 'zod';
import { StampKindSchema } from './stamp-kind.vo';

export const StampPayloadSchema = z.object({
  pairId: z.string(),
  kind: StampKindSchema,
  clientNonce: z.string(),
});

export type StampPayload = Readonly<z.infer<typeof StampPayloadSchema>>;
