import { z } from 'zod';
import { asMessageId, asUserId } from '@/shared/types/ids';

export const ChatMessagePayloadSchema = z.object({
  messageId: z.string().transform(asMessageId),
  senderId: z.string().transform(asUserId),
  body: z.string().min(1).max(1000),
  sentAt: z.string().datetime(),
});

export type ChatMessagePayload = Readonly<z.infer<typeof ChatMessagePayloadSchema>>;
