import { z } from 'zod';

export const ChatMessagePayloadSchema = z.object({
  messageId: z.string(),
  senderId: z.string(),
  body: z.string().min(1).max(1000),
  sentAt: z.string().datetime(),
});

export type ChatMessagePayload = Readonly<z.infer<typeof ChatMessagePayloadSchema>>;
