import 'server-only';
import { z } from 'zod';

export const envServer = z
  .object({
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  })
  .parse(process.env);

export const envGemini = z
  .object({
    GEMINI_API_KEY: z.string().min(1),
  })
  .parse(process.env);

export const envResend = z
  .object({
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM_ADDRESS: z.email(),
  })
  .parse(process.env);
