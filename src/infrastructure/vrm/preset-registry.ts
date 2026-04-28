import type { AvatarPreset } from '@/domain/avatar/entities/avatar-preset.entity';

export const AVATAR_PRESETS: readonly AvatarPreset[] = [
  {
    key: 'sample_a_woman',
    displayName: 'アバター A (女性)',
    vrmUrl: '/vrm/sample_a_woman.vrm',
    thumbnailUrl: '/vrm/sample_a_woman.webp',
    genderNeutral: false,
    licenseNote: 'CC0',
  },
  {
    key: 'sample_b_woman',
    displayName: 'アバター B (女性)',
    vrmUrl: '/vrm/sample_b_woman.vrm',
    thumbnailUrl: '/vrm/sample_b_woman.webp',
    genderNeutral: false,
    licenseNote: 'CC0',
  },
  {
    key: 'sample_c_man',
    displayName: 'アバター C (男性)',
    vrmUrl: '/vrm/sample_c_man.vrm',
    thumbnailUrl: '/vrm/sample_c_man.webp',
    genderNeutral: false,
    licenseNote: 'CC0',
  },
  {
    key: 'student_boy',
    displayName: '学生 (男性)',
    vrmUrl: '/vrm/student_boy.vrm',
    thumbnailUrl: '/vrm/student_boy.webp',
    genderNeutral: false,
    licenseNote: 'CC0',
  },
  {
    key: 'student_girl',
    displayName: '学生 (女性)',
    vrmUrl: '/vrm/student_girl.vrm',
    thumbnailUrl: '/vrm/student_girl.webp',
    genderNeutral: false,
    licenseNote: 'CC0',
  },
];

export function getPresetByKey(key: string): AvatarPreset | undefined {
  return AVATAR_PRESETS.find((p) => p.key === key);
}
