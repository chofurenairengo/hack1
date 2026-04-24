import { z } from 'zod';

export const StampKindSchema = z.enum(['handshake', 'sparkle', 'laugh', 'clap']);

export type StampKind = z.infer<typeof StampKindSchema>;
