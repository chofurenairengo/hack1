import type { UserId } from '@/shared/types/ids';
import type { Gender } from '@/domain/user/value-objects/gender.vo';

export type TableMemberData = Readonly<{
  userId: UserId;
  displayName: string;
  avatarPresetKey: string;
  gender: Gender;
}>;
