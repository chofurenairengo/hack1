'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { asEventId, asPairId, asDeckId } from '@/shared/types/ids';
import type { StampKind } from '@/domain/stamp/value-objects/stamp-kind.vo';
import { useStampBroadcast } from '@/hooks/useStampBroadcast';
import { useSlideSync } from '@/hooks/useSlideSync';

const EVENT_ID = asEventId('echo-test');
const PAIR_ID = asPairId('pair-test');
const DECK_ID = asDeckId('echo-test-deck');
const STAMP_KINDS: StampKind[] = ['handshake', 'sparkle', 'laugh', 'clap'];
const MAX_SLIDE_INDEX = 4;

type LogEntry = {
  id: string;
  type: 'sent-stamp' | 'recv-stamp' | 'sent-slide' | 'recv-slide';
  kind?: StampKind;
  slideIndex?: number;
  timestamp: string;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ja-JP', { hour12: false });
}

function labelFor(entry: LogEntry): string {
  switch (entry.type) {
    case 'sent-stamp':
      return `→ stamp sent: ${entry.kind}`;
    case 'recv-stamp':
      return `← stamp recv: ${entry.kind}`;
    case 'sent-slide':
      return `→ slide sent: page ${(entry.slideIndex ?? 0) + 1}`;
    case 'recv-slide':
      return `← slide recv: page ${(entry.slideIndex ?? 0) + 1}`;
  }
}

export function EchoTestClient() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const seenNonces = useRef(new Set<string>());
  const lastSlideSyncAt = useRef<string | null>(null);

  const { sendStamp, lastStamp } = useStampBroadcast(EVENT_ID);
  const { current: currentSlide, broadcast: broadcastSlide } = useSlideSync(EVENT_ID, PAIR_ID);

  const addLog = useCallback((entry: Omit<LogEntry, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setLog((prev) => [{ ...entry, id }, ...prev].slice(0, 100));
  }, []);

  useEffect(() => {
    if (!lastStamp) return;
    if (seenNonces.current.has(lastStamp.clientNonce)) return;
    seenNonces.current.add(lastStamp.clientNonce);
    addLog({ type: 'recv-stamp', kind: lastStamp.kind, timestamp: new Date().toISOString() });
  }, [lastStamp, addLog]);

  useEffect(() => {
    if (!currentSlide) return;
    if (lastSlideSyncAt.current === currentSlide.updatedAt) return;
    lastSlideSyncAt.current = currentSlide.updatedAt;
    addLog({
      type: 'recv-slide',
      slideIndex: currentSlide.slideIndex,
      timestamp: currentSlide.updatedAt,
    });
  }, [currentSlide, addLog]);

  const handleSendStamp = (kind: StampKind) => {
    sendStamp(kind, PAIR_ID);
    addLog({ type: 'sent-stamp', kind, timestamp: new Date().toISOString() });
  };

  const handleSlideChange = (delta: number) => {
    const next = Math.max(0, Math.min(MAX_SLIDE_INDEX, slideIndex + delta));
    if (next === slideIndex) return;
    setSlideIndex(next);
    const updatedAt = new Date().toISOString();
    broadcastSlide({ deckId: DECK_ID, pairId: PAIR_ID, slideIndex: next, updatedAt });
    addLog({ type: 'sent-slide', slideIndex: next, timestamp: updatedAt });
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-6 font-mono">
      <h1 className="text-xl font-bold mb-1">Echo Test</h1>
      <p className="text-gray-400 text-sm mb-6">
        2タブで開いて、一方の操作がもう一方に届くか確認する PoC
      </p>

      <section className="mb-6">
        <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-2">Stamps</h2>
        <div className="flex gap-2 flex-wrap">
          {STAMP_KINDS.map((kind) => (
            <button
              key={kind}
              onClick={() => handleSendStamp(kind)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm transition-colors"
            >
              {kind}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-2">
          Slide Sync — page {slideIndex + 1} / {MAX_SLIDE_INDEX + 1}
        </h2>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => handleSlideChange(-1)}
            disabled={slideIndex === 0}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded text-sm transition-colors"
          >
            Prev
          </button>
          <button
            onClick={() => handleSlideChange(1)}
            disabled={slideIndex === MAX_SLIDE_INDEX}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded text-sm transition-colors"
          >
            Next
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-2">
          Event Log ({log.length})
        </h2>
        {log.length === 0 ? (
          <p className="text-gray-500 text-sm">まだイベントなし</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {log.map((entry) => (
              <li
                key={entry.id}
                className={entry.type.startsWith('sent') ? 'text-indigo-300' : 'text-emerald-300'}
              >
                <span className="text-gray-500 mr-2">{formatTime(entry.timestamp)}</span>
                {labelFor(entry)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
