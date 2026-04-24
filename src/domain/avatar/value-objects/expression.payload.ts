import { z } from 'zod';
import { asUserId } from '@/shared/types/ids';

const weightSchema = z.number().min(0).max(1);

const WeightsSchema = z.object({
  happy: weightSchema,
  sad: weightSchema,
  angry: weightSchema,
  relaxed: weightSchema,
  surprised: weightSchema,
  aa: weightSchema,
  ih: weightSchema,
  ou: weightSchema,
  ee: weightSchema,
  oh: weightSchema,
});

export const ExpressionPayloadSchema = z.object({
  userId: z.string().transform(asUserId),
  weights: WeightsSchema,
  lookAt: z.object({ x: z.number(), y: z.number() }).nullable(),
  ts: z.number(),
});

export type ExpressionPayload = Readonly<z.infer<typeof ExpressionPayloadSchema>>;
