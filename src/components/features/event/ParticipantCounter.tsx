'use client';

import type { EventId } from '@/shared/types/ids';
import { usePresenceCount } from '@/hooks/usePresenceCount';

type Props = {
  eventId: EventId;
};

export function ParticipantCounter({ eventId }: Props) {
  const { count } = usePresenceCount(eventId);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-gray-800">参加者数</h2>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold text-indigo-600">{count}</span>
        <span className="text-sm text-gray-500">人接続中</span>
      </div>
    </div>
  );
}
