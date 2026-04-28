'use client';

import { useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SlideRenderer } from '@/components/features/slide/SlideRenderer';
import { confirmByIntroduceeAction } from '@/app/actions/slide/confirm-by-introducee.action';
import { asDeckId } from '@/shared/types/ids';
import { useDeck } from '@/hooks/useDeck';

export default function ConfirmSlidePage() {
  const params = useParams();
  const router = useRouter();
  const deckId = asDeckId(params['deckId'] as string);
  const { deck, isLoading, error } = useDeck(deckId);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (error || !deck) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 flex items-center justify-center">
        <p className="text-destructive">スライドが見つかりませんでした</p>
      </div>
    );
  }

  if (deck.status !== 'pending_introducee') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">このスライドは確認待ち状態ではありません</p>
        <button
          type="button"
          onClick={() => router.push('/slides')}
          className="mt-4 text-primary hover:underline text-sm"
        >
          スライド一覧に戻る
        </button>
      </div>
    );
  }

  const totalSlides = (() => {
    const log = deck.aiGenerationLog as { slides?: unknown[] } | null;
    return log?.slides?.length ?? 0;
  })();

  function handleDecision(decision: 'approve' | 'revision') {
    setActionError(null);
    startTransition(async () => {
      const result = await confirmByIntroduceeAction({ deckId, decision });
      if (!result.ok) {
        setActionError(result.message);
        return;
      }
      router.push('/slides');
    });
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">スライドを確認してください</h1>
        <p className="text-muted-foreground text-sm mt-1">
          紹介者が作成したスライドを確認し、承認または修正依頼をしてください。
        </p>
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

      <div className="flex gap-2 mt-4 justify-center">
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

      {actionError && <p className="mt-4 text-sm text-destructive text-center">{actionError}</p>}

      <div className="flex gap-4 mt-8">
        <button
          type="button"
          onClick={() => handleDecision('approve')}
          disabled={isPending}
          className="flex-1 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          承認する
        </button>
        <button
          type="button"
          onClick={() => handleDecision('revision')}
          disabled={isPending}
          className="flex-1 rounded-md border border-border px-4 py-3 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
        >
          修正を依頼する
        </button>
      </div>
    </main>
  );
}
