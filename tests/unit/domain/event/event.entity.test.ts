import { describe, it, expect } from 'vitest';
import { Event } from '@/domain/event/entities/event.entity';
import { InvalidTransitionError } from '@/domain/event/errors/invalid-transition.error';
import { asEventId } from '@/shared/types/ids';

const baseProps = {
  id: asEventId('test-event'),
  status: 'live' as const,
  currentRound: 1,
};

describe('Event.transitionTo', () => {
  it('有効な遷移で新しい Event を返す (イミュータブル)', () => {
    const event = Event.create({ ...baseProps, currentPhase: 'entry' });
    const result = event.transitionTo('presentation');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.currentPhase).toBe('presentation');
      expect(event.currentPhase).toBe('entry'); // 元は変わらない
    }
  });

  it('無効な遷移で InvalidTransitionError を返す', () => {
    const event = Event.create({ ...baseProps, currentPhase: 'voting' });
    const result = event.transitionTo('mingling');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(InvalidTransitionError);
      expect(result.error.from).toBe('voting');
      expect(result.error.to).toBe('mingling');
    }
  });

  it('closing は終端状態 — どの遷移も err を返す', () => {
    const event = Event.create({ ...baseProps, currentPhase: 'closing' });
    for (const phase of ['pre_event', 'entry', 'presentation', 'voting', 'intermission', 'mingling'] as const) {
      const result = event.transitionTo(phase);
      expect(result.ok).toBe(false);
    }
  });

  it('mingling → entry で次ラウンドに戻れる', () => {
    const event = Event.create({ ...baseProps, currentPhase: 'mingling', currentRound: 1 });
    const result = event.transitionTo('entry');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.currentPhase).toBe('entry');
    }
  });
});
