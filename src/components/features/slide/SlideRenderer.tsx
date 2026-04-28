'use client';

import type { SlideDeckRecord } from '@/domain/slide/repositories/slide-deck.repository';

type GeneratedSlide = {
  slideIndex: number;
  title: string;
  body: string;
  presenterScript: string;
  layoutHint: { icon: string; colorPalette: string; accentEmoji: string };
};

type AiGenerationLog = {
  slides: GeneratedSlide[];
  generatedAt: string;
  seed: number;
};

function isAiLog(value: unknown): value is AiGenerationLog {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v['slides']);
}

interface SlideRendererProps {
  deck: SlideDeckRecord;
  currentSlide: number;
  mode: 'preview' | 'live';
}

const PALETTE_CLASSES: Record<string, string> = {
  'warm-pink': 'bg-pink-50 border-pink-200',
  'ocean-blue': 'bg-blue-50 border-blue-200',
  'forest-green': 'bg-green-50 border-green-200',
  'sunset-orange': 'bg-orange-50 border-orange-200',
  lavender: 'bg-purple-50 border-purple-200',
};

function paletteClass(palette: string): string {
  return PALETTE_CLASSES[palette] ?? 'bg-slate-50 border-slate-200';
}

export function SlideRenderer({ deck, currentSlide, mode }: SlideRendererProps) {
  const log = isAiLog(deck.aiGenerationLog) ? deck.aiGenerationLog : null;
  const slide = log?.slides[currentSlide] ?? null;

  if (!slide) {
    return (
      <div className="aspect-video w-full flex items-center justify-center rounded-xl border-2 border-dashed border-muted bg-muted/30">
        <p className="text-muted-foreground text-sm">スライドがまだ生成されていません</p>
      </div>
    );
  }

  const bg = paletteClass(slide.layoutHint.colorPalette);

  return (
    <div
      className={`aspect-video w-full rounded-xl border-2 flex flex-col justify-between p-6 md:p-10 ${bg} ${mode === 'live' ? 'shadow-2xl' : 'shadow-md'}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl md:text-5xl">{slide.layoutHint.accentEmoji}</span>
        <h2 className="text-xl md:text-3xl font-bold leading-tight text-slate-800 flex-1">
          {slide.title}
        </h2>
      </div>

      <p className="text-sm md:text-lg text-slate-700 leading-relaxed whitespace-pre-line mt-4 flex-1">
        {slide.body}
      </p>

      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-slate-400">
          {currentSlide + 1} / {log!.slides.length}
        </span>
        {mode === 'live' && (
          <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
            LIVE
          </span>
        )}
      </div>
    </div>
  );
}
