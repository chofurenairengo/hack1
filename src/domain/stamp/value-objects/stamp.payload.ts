import { z } from 'zod';
import { asPairId } from '@/shared/types/ids';
import { StampKindSchema } from './stamp-kind.vo';

export const StampPayloadSchema = z.object({
  pairId: z.string().transform(asPairId),
  kind: StampKindSchema,
  clientNonce: z.string(),
});

export type StampPayload = Readonly<z.infer<typeof StampPayloadSchema>>;
