import type { UserId } from '@/shared/types/ids';
import type { Result } from '@/domain/shared/types/result';
import type { NotFoundError } from '@/domain/shared/errors/not-found.error';
import type { ValidationError } from '@/domain/shared/errors/validation.error';
import type { Gender } from '@/domain/user/value-objects/gender.vo';

export type UserProfile = Readonly<{
  id: UserId;
  nickname: string;
  age: number;
  gender: Gender;
  preferredGenders: readonly string[];
  residencePref: string | null;
  bio: string | null;
  hobbies: readonly string[];
  avatarPresetKey: string | null;
  emailDomainVerified: boolean;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}>;

export type CreateUserInput = Readonly<{
  id: UserId;
  nickname: string;
  age: number;
  gender: Gender;
}>;

export type UpdateUserInput = Readonly<{
  nickname?: string;
  age?: number;
  gender?: Gender;
  preferredGenders?: readonly string[];
  residencePref?: string | null;
  bio?: string | null;
  hobbies?: readonly string[];
  avatarPresetKey?: string | null;
}>;

export interface UserRepository {
  findById(id: UserId): Promise<Result<UserProfile, NotFoundError>>;
  create(input: CreateUserInput): Promise<Result<UserProfile, ValidationError>>;
  update(
    id: UserId,
    input: UpdateUserInput,
  ): Promise<Result<UserProfile, NotFoundError | ValidationError>>;
}
