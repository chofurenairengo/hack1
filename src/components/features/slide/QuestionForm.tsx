'use client';

import { useState, useTransition } from 'react';
import { detectAbstractAdjectives } from '@/shared/constants/abstract-adjectives';
import { generateDeckAction } from '@/app/actions/slide/generate-deck.action';
import type { PairId, EventId, DeckId } from '@/shared/types/ids';

interface QuestionFormProps {
  pairId: PairId;
  eventId: EventId;
  existingDeckId?: DeckId;
  onSuccess?: (deckId: DeckId) => void;
}

export function QuestionForm({ pairId, eventId, existingDeckId, onSuccess }: QuestionFormProps) {
  const [presenterName, setPresenterName] = useState('');
  const [introduceeHobbies, setIntroduceeHobbies] = useState('');
  const [introduceeEpisode, setIntroduceeEpisode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const episodeAbstractWords = detectAbstractAdjectives(introduceeEpisode);
  const hobbiesAbstractWords = detectAbstractAdjectives(introduceeHobbies);
  const allAbstractWords = [...new Set([...episodeAbstractWords, ...hobbiesAbstractWords])];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await generateDeckAction({
        pairId,
        eventId,
        existingDeckId,
        presenterName,
        introduceeHobbies,
        introduceeEpisode,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      onSuccess?.(result.data.deckId);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="presenterName">
          あなた（紹介者）のお名前
        </label>
        <input
          id="presenterName"
          type="text"
          required
          maxLength={50}
          value={presenterName}
          onChange={(e) => setPresenterName(e.target.value)}
          placeholder="例: 山田 太郎"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="introduceeHobbies">
          紹介する人の趣味・特技
        </label>
        <input
          id="introduceeHobbies"
          type="text"
          required
          maxLength={200}
          value={introduceeHobbies}
          onChange={(e) => setIntroduceeHobbies(e.target.value)}
          placeholder="例: 週末は料理の研究、ボルダリング、写真撮影"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {hobbiesAbstractWords.length > 0 && <AbstractWarning words={hobbiesAbstractWords} />}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="introduceeEpisode">
          具体的なエピソード
          <span className="ml-1 text-xs text-muted-foreground">（20文字以上推奨）</span>
        </label>
        <textarea
          id="introduceeEpisode"
          required
          minLength={20}
          maxLength={500}
          rows={4}
          value={introduceeEpisode}
          onChange={(e) => setIntroduceeEpisode(e.target.value)}
          placeholder="例: 先月の合コンで全員分の料理を注文し終わる前に完食の記録を更新。計画力と食欲が両立している人です。"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {episodeAbstractWords.length > 0 && <AbstractWarning words={episodeAbstractWords} />}
          </div>
          <span className="text-xs text-muted-foreground ml-2 shrink-0">
            {introduceeEpisode.length}/500
          </span>
        </div>
      </div>

      {allAbstractWords.length > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          <strong>ヒント：</strong>「{allAbstractWords.join('・')}」のような抽象的な言葉より、
          具体的なエピソードを書くとよりいいスライドが生成されます！
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'AI生成中...' : 'スライドを生成する'}
      </button>
    </form>
  );
}

function AbstractWarning({ words }: { words: string[] }) {
  return (
    <p className="text-xs text-red-600 mt-1">
      「{words.join('・')}」は抽象的な表現です。具体的なエピソードで言い換えてみましょう。
    </p>
  );
}
