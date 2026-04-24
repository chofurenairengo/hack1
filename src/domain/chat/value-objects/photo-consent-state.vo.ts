import { z } from 'zod';

export const PhotoConsentStateSchema = z.enum(['pending', 'consented', 'revoked']);

export type PhotoConsentState = z.infer<typeof PhotoConsentStateSchema>;
