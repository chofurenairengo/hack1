'use client';

import { useState, useEffect, useRef } from 'react';
import type { EventId } from '@/shared/types/ids';
import type { EventPhase } from '@/domain/event/value-objects/event-phase.vo';
import { useEventPhase } from '@/hooks/useEventPhase';
import { useStampBroadcast } from '@/hooks/useStampBroadcast';

const PHASE_LABELS: Record<EventPhase, string> = {
  pre_event: '開始前',
  entry: '入場受付',
  presentation: 'プレゼン',
  voting: '投票',
  intermission: '休憩',
  mingling: '交流',
  closing: 'クロージング',
};

type PhaseLogEntry = {
  id: string;
  phase: EventPhase;
  timestamp: string;
};

type Props = {
  eventId: EventId;
};

const MAX_LOG_ENTRIES = 10;
const MAX_ERROR_ENTRIES = 5;
const ERROR_EVENT_NAME = 'admin-console-error';

type ErrorEventDetail = {
  message: string;
};

type ErrorLogEntry = {
  id: string;
  message: string;
  timestamp: string;
};

export function recordConsoleError(message: string) {
  console.error(message);
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ErrorEventDetail>(ERROR_EVENT_NAME, { detail: { message } }));
}

function nowLabel() {
  return new Date().toLocaleTimeString('ja-JP');
}

export function RealtimeLog({ eventId }: Props) {
  const { phase } = useEventPhase(eventId, { presenceRole: 'admin' });
  const { lastStamp } = useStampBroadcast(eventId);
  const [stampCount, setStampCount] = useState(0);
  const [phaseLog, setPhaseLog] = useState<PhaseLogEntry[]>([]);
  const [errorLog, setErrorLog] = useState<ErrorLogEntry[]>([]);
  const prevPhaseRef = useRef<EventPhase | null>(null);

  useEffect(() => {
    if (phase !== null && phase !== prevPhaseRef.current) {
      prevPhaseRef.current = phase;
      const entry: PhaseLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        phase,
        timestamp: nowLabel(),
      };
      setPhaseLog((prev) => [entry, ...prev].slice(0, MAX_LOG_ENTRIES));
    }
  }, [phase]);

  useEffect(() => {
    if (lastStamp !== null) {
      setStampCount((prev) => prev + 1);
    }
  }, [lastStamp]);

  useEffect(() => {
    const handleError = (event: Event) => {
      const detail = (event as CustomEvent<ErrorEventDetail>).detail;
      if (!detail?.message) return;
      const entry: ErrorLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        message: detail.message,
        timestamp: nowLabel(),
      };
      setErrorLog((prev) => [entry, ...prev].slice(0, MAX_ERROR_ENTRIES));
    };

    window.addEventListener(ERROR_EVENT_NAME, handleError);
    return () => window.removeEventListener(ERROR_EVENT_NAME, handleError);
  }, []);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">リアルタイムログ</h2>

      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">👏</span>
        <span className="text-2xl font-bold text-gray-700">{stampCount}</span>
        <span className="text-sm text-gray-500">スタンプ累計</span>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
          フェーズ変化ログ (最新 {MAX_LOG_ENTRIES} 件)
        </p>
        {phaseLog.length === 0 ? (
          <p className="text-sm text-gray-400">フェーズ変化なし</p>
        ) : (
          <ul className="space-y-1.5">
            {phaseLog.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"
              >
                <span className="font-mono text-xs text-gray-400">{entry.timestamp}</span>
                <span className="font-medium text-gray-700">{PHASE_LABELS[entry.phase]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5 border-t border-gray-100 pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
          直近エラーログ
        </p>
        {errorLog.length === 0 ? (
          <p className="text-sm text-gray-400">エラーなし</p>
        ) : (
          <ul className="space-y-1.5">
            {errorLog.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                <span className="mr-2 font-mono text-xs text-red-400">{entry.timestamp}</span>
                {entry.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
