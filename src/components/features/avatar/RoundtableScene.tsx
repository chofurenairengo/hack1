'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { EventId, TableId } from '@/shared/types/ids';
import type { TableMemberData } from '@/types/api';
import type { AvatarPreset } from '@/domain/avatar/entities/avatar-preset.entity';
import type { ExpressionPayload } from '@/domain/avatar/value-objects/expression.payload';
import { AVATAR_PRESETS, type AvatarPresetKey } from '@/infrastructure/vrm/preset-registry';
import { useTableAvatarSync } from '@/hooks/useTableAvatarSync';
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
const TABLE_RADIUS = 1.1;
const EYE_HEIGHT = 1.5;
const TABLE_CENTER_Y = 1.0;
const VALID_MEMBER_COUNTS = [3, 4] as const;
const LOOK_SENSITIVITY = 0.003;
const MAX_PITCH = Math.PI / 6;
const LOOK_TARGET: readonly [number, number, number] = [0, TABLE_CENTER_Y, 0];

export type CircularPoint = Readonly<{ x: number; z: number; rotY: number }>;

export function computeCircularLayout(count: number, radius: number): ReadonlyArray<CircularPoint> {
  return Array.from({ length: count }, (_, i) => {
    const theta = (2 * Math.PI * i) / count;
    return {
      x: radius * Math.sin(theta),
      z: radius * Math.cos(theta),
      rotY: theta + Math.PI,
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

interface LookAroundControlsProps {
  fixedPosition: readonly [number, number, number];
}

function LookAroundControls({ fixedPosition }: LookAroundControlsProps) {
  const { camera, gl, invalidate } = useThree();
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);

  useEffect(() => {
    yawRef.current = 0;
    pitchRef.current = 0;
  }, [fixedPosition]);

  useEffect(() => {
    const el = gl.domElement;

    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      lastX.current = e.clientX;
      lastY.current = e.clientY;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastX.current;
      const dy = e.clientY - lastY.current;
      lastX.current = e.clientX;
      lastY.current = e.clientY;
      yawRef.current -= dx * LOOK_SENSITIVITY;
      pitchRef.current = Math.max(
        -MAX_PITCH,
        Math.min(MAX_PITCH, pitchRef.current - dy * LOOK_SENSITIVITY),
      );
      invalidate();
    };
    const onMouseUp = () => {
      isDragging.current = false;
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [gl.domElement, invalidate]);

  useFrame(() => {
    camera.position.set(fixedPosition[0], fixedPosition[1], fixedPosition[2]);
    const baseDx = LOOK_TARGET[0] - fixedPosition[0];
    const baseDz = LOOK_TARGET[2] - fixedPosition[2];
    const baseYaw = Math.atan2(baseDx, baseDz);
    const totalYaw = baseYaw + yawRef.current;
    const lookX = fixedPosition[0] + Math.sin(totalYaw) * Math.cos(pitchRef.current);
    const lookY = fixedPosition[1] + Math.sin(pitchRef.current);
    const lookZ = fixedPosition[2] + Math.cos(totalYaw) * Math.cos(pitchRef.current);
    camera.lookAt(lookX, lookY, lookZ);
  });

  return null;
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
  const { expressions } = useTableAvatarSync(eventId, tableId);
  const memberCount = members.length;

  const fpsCam = useMemo(
    () =>
      computeFpsCamera(
        Math.min(selfIndex, Math.max(0, memberCount - 1)),
        memberCount >= 3 ? memberCount : 4,
        TABLE_RADIUS,
      ),
    [selfIndex, memberCount],
  );

  if (!VALID_MEMBER_COUNTS.includes(memberCount as (typeof VALID_MEMBER_COUNTS)[number])) {
    return <div role="alert">ラウンドテーブルには 3〜4 名が必要です (現在: {memberCount} 名)</div>;
  }

  return (
    <div className={className}>
      <AvatarCanvas
        camera={{ position: fpsCam.position, fov: 50 }}
        className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-400"
        transparent
      >
        <RoundtableAvatars
          members={members}
          expressions={expressions}
          radius={TABLE_RADIUS}
          selfIndex={selfIndex}
        />
        <LookAroundControls fixedPosition={fpsCam.position} />
      </AvatarCanvas>
    </div>
  );
}
