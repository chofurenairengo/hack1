'use client';

import { useState } from 'react';
import type { EventId, TableId, UserId } from '@/shared/types/ids';
import type { TableMemberData } from '@/types/api';
import { AVATAR_PRESETS } from '@/infrastructure/vrm/preset-registry';
import { RoundtableScene } from '@/components/features/avatar/RoundtableScene';

const DEMO_EVENT_ID = 'demo-event' as unknown as EventId;
const DEMO_TABLE_ID = 'demo-table' as unknown as TableId;

const DEMO_MEMBERS_4: ReadonlyArray<TableMemberData> = AVATAR_PRESETS.slice(0, 4).map((p, i) => ({
  userId: `demo-user-${i}` as unknown as UserId,
  displayName: p.displayName,
  avatarPresetKey: p.key,
  gender: i % 2 === 0 ? 'female' : 'male',
}));

const DEMO_MEMBERS_3 = DEMO_MEMBERS_4.slice(0, 3);

export default function RoundtableDemoPage() {
  const [memberCount, setMemberCount] = useState<3 | 4>(4);
  const [selfIndex, setSelfIndex] = useState(0);

  const members = memberCount === 4 ? DEMO_MEMBERS_4 : DEMO_MEMBERS_3;
  const clampedSelf = Math.min(selfIndex, memberCount - 1);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">RoundtableScene デモ</h1>

      <div className="flex gap-8 mb-6 flex-wrap">
        <div>
          <p className="text-sm text-gray-400 mb-2">メンバー数</p>
          <div className="flex gap-2">
            {([3, 4] as const).map((n) => (
              <button
                key={n}
                onClick={() => {
                  setMemberCount(n);
                  setSelfIndex(0);
                }}
                aria-pressed={memberCount === n}
                className={`px-4 py-1.5 rounded text-sm border transition-colors ${
                  memberCount === n
                    ? 'border-blue-500 bg-blue-900/40'
                    : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                {n} 人
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-400 mb-2">
            自分の席 (selfIndex) — この席のアバターは非表示
          </p>
          <div className="flex gap-2">
            {Array.from({ length: memberCount }, (_, i) => (
              <button
                key={i}
                onClick={() => setSelfIndex(i)}
                aria-pressed={clampedSelf === i}
                className={`px-4 py-1.5 rounded text-sm border transition-colors ${
                  clampedSelf === i
                    ? 'border-blue-500 bg-blue-900/40'
                    : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                席 {i}
              </button>
            ))}
          </div>
        </div>
      </div>

      <RoundtableScene
        eventId={DEMO_EVENT_ID}
        tableId={DEMO_TABLE_ID}
        members={members}
        selfIndex={clampedSelf}
        className="w-full h-[600px] rounded-xl overflow-hidden bg-gray-900"
      />

      <p className="mt-3 text-sm text-gray-500">マウスドラッグで視点回転 / ズーム・パン無効</p>
    </div>
  );
}
