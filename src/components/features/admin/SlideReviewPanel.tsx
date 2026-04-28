'use client';

import { useState, useTransition } from 'react';
import { approveByOrganizerAction } from '@/app/actions/slide/approve-by-organizer.action';
import { rejectByOrganizerAction } from '@/app/actions/slide/reject-by-organizer.action';
import type { DeckId } from '@/shared/types/ids';

interface SlideReviewPanelProps {
  deckId: DeckId;
  onReviewed?: () => void;
}

export function SlideReviewPanel({ deckId, onReviewed }: SlideReviewPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveByOrganizerAction({ deckId });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onReviewed?.();
    });
  }

  function handleReject() {
    setError(null);
    startTransition(async () => {
      const result = await rejectByOrganizerAction({ deckId });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onReviewed?.();
    });
  }

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-border">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleApprove}
          disabled={isPending}
          className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          承認する
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={isPending}
          className="flex-1 rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          差し戻す
        </button>
      </div>
    </div>
  );
}
