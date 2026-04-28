import { describe, it, expect } from 'vitest';
import { EventPhaseTransitionService } from '@/domain/event/services/event-phase-transition.service';
import { InvalidTransitionError } from '@/domain/event/errors/invalid-transition.error';
import type { EventPhase } from '@/domain/event/value-objects/event-phase.vo';

describe('EventPhaseTransitionService', () => {
  describe('canTransition — 許可された遷移', () => {
    const validPaths: [EventPhase, EventPhase][] = [
      ['pre_event', 'entry'],
      ['entry', 'presentation'],
      ['presentation', 'voting'],
      ['voting', 'intermission'],
      ['intermission', 'mingling'],
      ['mingling', 'closing'],
      ['mingling', 'entry'],       // 次ラウンド (最初から)
      ['mingling', 'presentation'], // 次ラウンド (プレゼンから)
    ];

    it.each(validPaths)('%s → %s は ok を返す', (from, to) => {
      const result = EventPhaseTransitionService.canTransition(from, to);
      expect(result.ok).toBe(true);
    });
  });

  describe('canTransition — 禁止遷移', () => {
    const invalidPaths: [EventPhase, EventPhase][] = [
      ['voting', 'mingling'],       // intermission をスキップ
      ['voting', 'closing'],
      ['presentation', 'closing'],
      ['entry', 'voting'],
      ['pre_event', 'presentation'],
      ['closing', 'entry'],         // 終了後に戻れない
      ['closing', 'pre_event'],
      ['intermission', 'voting'],   // 逆行
      ['mingling', 'voting'],       // 逆行
    ];

    it.each(invalidPaths)('%s → %s は err(InvalidTransitionError) を返す', (from, to) => {
      const result = EventPhaseTransitionService.canTransition(from, to);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(InvalidTransitionError);
        expect(result.error.from).toBe(from);
        expect(result.error.to).toBe(to);
        expect(result.error.code).toBe('invalid_transition');
      }
    });
  });

  describe('allowedNextPhases', () => {
    it('closing は空配列を返す (終端状態)', () => {
      expect(EventPhaseTransitionService.allowedNextPhases('closing')).toEqual([]);
    });

    it('mingling は closing / entry / presentation を返す', () => {
      const phases = EventPhaseTransitionService.allowedNextPhases('mingling');
      expect(phases).toContain('closing');
      expect(phases).toContain('entry');
      expect(phases).toContain('presentation');
    });
  });
});
