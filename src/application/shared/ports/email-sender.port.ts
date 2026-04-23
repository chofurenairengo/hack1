import type { Result } from '@/domain/shared/types/result';

export type EmailPayload = Readonly<{
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}>;

export type EmailSenderError = Readonly<{
  code: 'send_failed' | 'invalid_address' | 'quota_exceeded';
  message: string;
}>;

export interface EmailSenderPort {
  send(payload: EmailPayload): Promise<Result<void, EmailSenderError>>;
}
