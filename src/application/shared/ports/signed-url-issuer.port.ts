import type { Result } from '@/domain/shared/types/result';

export type SignedUrlError = Readonly<{
  code: 'not_found' | 'storage_error';
  message: string;
}>;

export interface SignedUrlIssuerPort {
  issue(storagePath: string, expiresInSeconds?: number): Promise<Result<string, SignedUrlError>>;
}
