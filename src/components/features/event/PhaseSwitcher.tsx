'use client';

import { useState, useTransition } from 'react';
import type { EventId } from '@/shared/types/ids';
import type { EventPhase } from '@/domain/event/value-objects/event-phase.vo';
import { useEventPhase } from '@/hooks/useEventPhase';
import { advancePhaseAction } from '@/app/actions/event/advance-phase';
import { startNextRoundAction } from '@/app/actions/event/start-next-round';
import { resetPhaseAction, rewindPhaseAction } from '@/app/actions/event/reset-phase';
import { recordConsoleError } from './RealtimeLog';

const PHASE_LABELS: Record<EventPhase, string> = {
  pre_event: '開始前',
  entry: '入場受付',
  presentation: 'プレゼン',
  voting: '投票',
  intermission: '休憩',
  mingling: '交流',
  closing: 'クロージング',
};

const NEXT_PHASES: Partial<Record<EventPhase, EventPhase[]>> = {
  pre_event: ['entry'],
  entry: ['presentation'],
  presentation: ['voting'],
  voting: ['intermission'],
  intermission: ['mingling'],
  mingling: ['closing', 'entry', 'presentation'],
};

type Props = {
  eventId: EventId;
  initialPhase: EventPhase;
  initialRound: number;
};

export function PhaseSwitcher({ eventId, initialPhase, initialRound }: Props) {
  const { phase: realtimePhase, round: realtimeRound } = useEventPhase(eventId, {
    presenceRole: 'admin',
  });
  const [localPhase, setLocalPhase] = useState(initialPhase);
  const [localRound, setLocalRound] = useState(initialRound);
  const [isPending, startTransition] = useTransition();

  const phase = realtimePhase ?? localPhase;
  const round = realtimeRound > 0 ? realtimeRound : localRound;
  const nextPhases = NEXT_PHASES[phase] ?? [];

  const handleAdvance = (nextPhase: EventPhase) => {
    startTransition(async () => {
      const startsNextRound =
        phase === 'mingling' && (nextPhase === 'entry' || nextPhase === 'presentation');
      const nextRound = startsNextRound ? round + 1 : round;
      const result = startsNextRound
        ? await startNextRoundAction({ eventId, nextPhase, nextRound })
        : await advancePhaseAction({ eventId, nextPhase, round: nextRound });

      if (!result.ok) {
        recordConsoleError(`フェーズ遷移に失敗しました: ${result.message}`);
        return;
      }

      setLocalPhase(result.data.phase);
      setLocalRound(result.data.round);
    });
  };

  const handleReset = () => {
    startTransition(async () => {
      const result = await resetPhaseAction({ eventId });
      if (!result.ok) {
        recordConsoleError(`強制リセットに失敗しました: ${result.message}`);
        return;
      }

      setLocalPhase(result.data.phase);
      setLocalRound(result.data.round);
    });
  };

  const handleRewind = () => {
    startTransition(async () => {
      const result = await rewindPhaseAction({ eventId, currentPhase: phase, round });
      if (!result.ok) {
        recordConsoleError(`フェーズ戻しに失敗しました: ${result.message}`);
        return;
      }

      setLocalPhase(result.data.phase);
      setLocalRound(result.data.round);
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">フェーズ管理</h2>

      <div className="mb-6 flex items-center gap-3">
        <span className="rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-medium text-indigo-700">
          現在: {PHASE_LABELS[phase]}
        </span>
        {phase === 'presentation' && (
          <span className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-600">
            ラウンド {round}
          </span>
        )}
        {isPending && (
          <span className="text-sm text-gray-400">処理中...</span>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {nextPhases.map((next) => (
          <button
            key={next}
            onClick={() => handleAdvance(next)}
            disabled={isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            → {PHASE_LABELS[next]}
          </button>
        ))}

        {nextPhases.length === 0 && (
          <p className="text-sm text-gray-400">このフェーズからの遷移はありません</p>
        )}
      </div>

      <div className="mt-6 flex items-center gap-4 border-t border-gray-100 pt-4">
        <button
          onClick={handleReset}
          disabled={isPending}
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          強制リセット (pre_event)
        </button>

        <button
          onClick={handleRewind}
          disabled={isPending || phase === 'pre_event'}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
        >
          フェーズ戻し
        </button>
      </div>
    </div>
  );
}
