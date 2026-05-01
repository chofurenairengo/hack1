'use client';

import React from 'react';
import { OrbitControls } from '@react-three/drei';
import type { EventId, PairId, TableId } from '@/shared/types/ids';
import type { TableMemberData } from '@/types/api';
import type { AvatarPreset } from '@/domain/avatar/entities/avatar-preset.entity';
import type { ExpressionPayload } from '@/domain/avatar/value-objects/expression.payload';
import { AVATAR_PRESETS, type AvatarPresetKey } from '@/infrastructure/vrm/preset-registry';
import { useAvatarSync } from '@/hooks/useAvatarSync';
import { AvatarCanvas } from './AvatarCanvas';
import { AvatarTile } from './AvatarTile';

const ZERO_WEIGHTS: ExpressionPayload['weights'] = {
  happy: 0,
  sad: 0,
  angry: 0,
  relaxed: 0,
  surprised: 0,
  aa: 0,
  ih: 0,
  ou: 0,
  ee: 0,
  oh: 0,
};

const DEFAULT_PRESET_KEY: AvatarPresetKey = 'sample_c_man';
const TABLE_RADIUS = 1.5;
const EYE_HEIGHT = 1.5;
const TABLE_CENTER_Y = 1.0;
const VALID_MEMBER_COUNTS = [3, 4] as const;

export type CircularPoint = Readonly<{ x: number; z: number; rotY: number }>;

export function computeCircularLayout(count: number, radius: number): ReadonlyArray<CircularPoint> {
  return Array.from({ length: count }, (_, i) => {
    const theta = (2 * Math.PI * i) / count;
    return {
      x: radius * Math.sin(theta),
      z: radius * Math.cos(theta),
      rotY: Math.PI + theta,
    };
  });
}

export function resolvePreset(key: string): AvatarPreset {
  const found = AVATAR_PRESETS.find((p) => p.key === key);
  if (found) return found;
  return AVATAR_PRESETS.find((p) => p.key === DEFAULT_PRESET_KEY)!;
}

export type FpsCamera = Readonly<{
  position: [number, number, number];
  target: [number, number, number];
}>;

export function computeFpsCamera(selfIndex: number, count: number, radius: number): FpsCamera {
  const theta = (2 * Math.PI * selfIndex) / count;
  return {
    position: [radius * Math.sin(theta), EYE_HEIGHT, radius * Math.cos(theta)],
    target: [0, TABLE_CENTER_Y, 0],
  };
}

interface RoundtableAvatarsProps {
  members: ReadonlyArray<TableMemberData>;
  expressions: Record<string, ExpressionPayload>;
  radius: number;
  selfIndex: number;
}

function RoundtableAvatars({ members, expressions, radius, selfIndex }: RoundtableAvatarsProps) {
  const layout = computeCircularLayout(members.length, radius);
  return (
    <>
      <OrbitControls
        target={[0, TABLE_CENTER_Y, 0]}
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI * 0.65}
        minPolarAngle={0.1}
      />
      {members.map((member, i) => {
        if (i === selfIndex) return null;
        const point = layout[i];
        if (!point) return null;
        const preset = resolvePreset(member.avatarPresetKey);
        const weights = expressions[member.userId]?.weights ?? ZERO_WEIGHTS;
        return (
          <group key={member.userId} position={[point.x, 0, point.z]} rotation={[0, point.rotY, 0]}>
            <AvatarTile vrmUrl={preset.vrmUrl} weights={weights} />
          </group>
        );
      })}
    </>
  );
}

interface RoundtableSceneProps {
  eventId: EventId;
  tableId: TableId;
  members: ReadonlyArray<TableMemberData>;
  selfIndex?: number;
  className?: string;
}

export function RoundtableScene({
  eventId,
  tableId,
  members,
  selfIndex = 0,
  className,
}: RoundtableSceneProps) {
  const { expressions } = useAvatarSync(eventId, tableId as unknown as PairId);
  const memberCount = members.length;

  if (!VALID_MEMBER_COUNTS.includes(memberCount as (typeof VALID_MEMBER_COUNTS)[number])) {
    return <div role="alert">ラウンドテーブルには 3〜4 名が必要です (現在: {memberCount} 名)</div>;
  }

  const fpsCam = computeFpsCamera(selfIndex, memberCount, TABLE_RADIUS);

  return (
    <AvatarCanvas camera={{ position: fpsCam.position, fov: 75 }} className={className}>
      <RoundtableAvatars
        members={members}
        expressions={expressions}
        radius={TABLE_RADIUS}
        selfIndex={selfIndex}
      />
    </AvatarCanvas>
  );
}
