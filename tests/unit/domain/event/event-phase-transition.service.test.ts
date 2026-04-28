import { describe, it, expect } from 'vitest';
import { EventPhaseTransitionService } from '@/domain/event/services/event-phase-transition.service';
import { InvalidTransitionError } from '@/domain/event/errors/invalid-transition.error';
import { EventPhaseSchema, type EventPhase } from '@/domain/event/value-objects/event-phase.vo';
import { ALLOWED_TRANSITIONS } from '@/domain/event/value-objects/phase-transition.vo';

const ALL_PHASES = EventPhaseSchema.options;

describe('EventPhaseTransitionService', () => {
  describe('canTransition — 許可された遷移', () => {
    const validPaths: [EventPhase, EventPhase][] = [
      ['pre_event', 'entry'],
      ['entry', 'presentation'],
      ['presentation', 'voting'],
      ['voting', 'intermission'],
      ['intermission', 'mingling'],
      ['mingling', 'closing'],
      ['mingling', 'entry'],
      ['mingling', 'presentation'],
    ];

    it.each(validPaths)('%s → %s は ok を返す', (from, to) => {
      const result = EventPhaseTransitionService.canTransition(from, to);
      expect(result.ok).toBe(true);
    });
  });

  describe('canTransition — 禁止遷移 (全パターン)', () => {
    const forbiddenPaths: [EventPhase, EventPhase][] = ALL_PHASES.flatMap((from) =>
      ALL_PHASES.filter(
        (to) => !(ALLOWED_TRANSITIONS[from] as readonly EventPhase[]).includes(to),
      ).map((to): [EventPhase, EventPhase] => [from, to]),
    );

    it.each(forbiddenPaths)('%s → %s は err(InvalidTransitionError) を返す', (from, to) => {
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
