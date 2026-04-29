import type { EventPhase } from './event-phase.vo';

/**
 * 許可された状態遷移の定義。
 * mingling は次ラウンドがある場合に entry / presentation へ戻れる。
 */
export const ALLOWED_TRANSITIONS: Readonly<Record<EventPhase, readonly EventPhase[]>> = {
  pre_event: ['entry'],
  entry: ['presentation'],
  presentation: ['voting'],
  voting: ['intermission'],
  intermission: ['mingling'],
  mingling: ['closing', 'entry', 'presentation'],
  closing: [],
};
