'use client';

import { useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SlideRenderer } from '@/components/features/slide/SlideRenderer';
import { submitForConfirmationAction } from '@/app/actions/slide/submit-for-confirmation.action';
import type { SlideDeckRecord } from '@/domain/slide/repositories/slide-deck.repository';
import { asDeckId } from '@/shared/types/ids';
import { useDeck } from '@/hooks/useDeck';

export default function EditSlidePage() {
  const params = useParams();
  const router = useRouter();
  const deckId = asDeckId(params['deckId'] as string);
  const { deck, isLoading, error } = useDeck(deckId);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (isLoading) return <LoadingView />;
  if (error || !deck) return <ErrorView />;

  const totalSlides = getTotalSlides(deck);
  const canSubmit = deck.status === 'draft' && totalSlides === 5;

  function handleSubmit() {
    setSubmitError(null);
    startTransition(async () => {
      const result = await submitForConfirmationAction({ deckId });
      if (!result.ok) {
        setSubmitError(result.message);
        return;
      }
      router.push('/slides');
    });
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">スライドを確認</h1>
        <StatusBadge status={deck.status} />
      </div>

      <SlideRenderer deck={deck} currentSlide={currentSlide} mode="preview" />

      <div className="flex items-center justify-center gap-2 mt-4">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentSlide(i)}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i === currentSlide ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          disabled={currentSlide === 0}
          onClick={() => setCurrentSlide((s) => s - 1)}
          className="px-4 py-2 rounded-md border border-border text-sm disabled:opacity-40 hover:bg-accent transition-colors"
        >
          前へ
        </button>
        <button
          type="button"
          disabled={currentSlide >= totalSlides - 1}
          onClick={() => setCurrentSlide((s) => s + 1)}
          className="px-4 py-2 rounded-md border border-border text-sm disabled:opacity-40 hover:bg-accent transition-colors"
        >
          次へ
        </button>
      </div>

      {submitError && <p className="mt-4 text-sm text-destructive">{submitError}</p>}

      {canSubmit && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="mt-6 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? '送信中...' : '被紹介者に確認依頼する'}
        </button>
      )}
    </main>
  );
}

function getTotalSlides(deck: SlideDeckRecord): number {
  const log = deck.aiGenerationLog as { slides?: unknown[] } | null;
  return log?.slides?.length ?? 0;
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    draft: '下書き',
    pending_introducee: '確認待ち',
    pending_organizer: '審査中',
    approved: '承認済み',
    rejected: '差し戻し',
  };
  return <span className="text-xs text-muted-foreground mt-1">{labels[status] ?? status}</span>;
}

function LoadingView() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex items-center justify-center">
      <p className="text-muted-foreground">読み込み中...</p>
    </div>
  );
}

function ErrorView() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex items-center justify-center">
      <p className="text-destructive">スライドが見つかりませんでした</p>
    </div>
  );
}
