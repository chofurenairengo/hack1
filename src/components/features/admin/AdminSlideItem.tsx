'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SlideRenderer } from '@/components/features/slide/SlideRenderer';
import { SlideReviewPanel } from '@/components/features/admin/SlideReviewPanel';
import type { SlideDeckRecord } from '@/domain/slide/repositories/slide-deck.repository';

interface AdminSlideItemProps {
  deck: SlideDeckRecord;
}

export function AdminSlideItem({ deck }: AdminSlideItemProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  const totalSlides = (() => {
    const log = deck.aiGenerationLog as { slides?: unknown[] } | null;
    return log?.slides?.length ?? 0;
  })();

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p className="text-xs text-muted-foreground mb-3">デッキ ID: {deck.id.slice(0, 16)}...</p>

      <SlideRenderer deck={deck} currentSlide={currentSlide} mode="preview" />

      {totalSlides > 1 && (
        <div className="flex gap-2 mt-3 justify-center">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentSlide(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentSlide ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      )}

      <SlideReviewPanel deckId={deck.id} onReviewed={() => router.refresh()} />
    </div>
  );
}
