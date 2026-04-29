import type { Result } from '@/domain/shared/types/result';

export type ImageUploadError = Readonly<{
  code: 'upload_failed' | 'invalid_file';
  message: string;
}>;

export interface SlideImageStoragePort {
  upload(
    file: Uint8Array,
    mimeType: string,
    storagePath: string,
  ): Promise<Result<string, ImageUploadError>>;
  delete(storagePath: string): Promise<Result<void, ImageUploadError>>;
}
