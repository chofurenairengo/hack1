import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdvanceEventPhase } from '@/application/event/use-cases/AdvanceEventPhase';
import type { EventRepository, EventRecord } from '@/domain/event/repositories/event.repository';
import type { PhasePublisherPort } from '@/application/event/ports/phase-publisher.port';
import type { MatchingTriggerPort } from '@/application/event/ports/matching-trigger.port';
import { ok, err } from '@/domain/shared/types/result';
import { NotFoundError } from '@/domain/shared/errors/not-found.error';
import { InvalidTransitionError } from '@/domain/event/errors/invalid-transition.error';
import { asEventId, asUserId } from '@/shared/types/ids';

const eventId = asEventId('11111111-1111-1111-1111-111111111111');
const organizerId = asUserId('22222222-2222-2222-2222-222222222222');
const otherId = asUserId('33333333-3333-3333-3333-333333333333');

const baseRecord: EventRecord = {
  id: eventId,
  title: 'テストイベント',
  description: null,
  mode: 'online',
  phase: 'voting',
  venue: null,
  scheduledAt: null,
  organizerId,
  maxParticipants: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRepos(record: EventRecord = baseRecord) {
  const eventRepo: EventRepository = {
    findById: vi.fn().mockResolvedValue(ok(record)),
    findAll: vi.fn().mockResolvedValue(ok([])),
    create: vi.fn(),
    updatePhase: vi.fn().mockResolvedValue(ok({ ...record })),
  };
  const phasePublisher: PhasePublisherPort = {
    publish: vi.fn().mockResolvedValue(ok(undefined)),
  };
  const matchingTrigger: MatchingTriggerPort = {
    trigger: vi.fn().mockResolvedValue(ok(undefined)),
  };
  return { eventRepo, phasePublisher, matchingTrigger };
}

describe('AdvanceEventPhase', () => {
  describe('正常系', () => {
    it('voting → intermission で updatePhase と publish を呼ぶ', async () => {
      const { eventRepo, phasePublisher, matchingTrigger } = makeRepos();
      const useCase = new AdvanceEventPhase(eventRepo, phasePublisher, matchingTrigger);

      const result = await useCase.execute({
        eventId,
        nextPhase: 'intermission',
        round: 1,
        requesterId: organizerId,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.phase).toBe('intermission');
        expect(result.value.round).toBe(1);
      }
      expect(eventRepo.updatePhase).toHaveBeenCalledWith(eventId, 'intermission');
      expect(phasePublisher.publish).toHaveBeenCalledWith(
        eventId,
        'intermission',
        1,
        expect.any(String),
      );
    });

    it('voting → intermission で matchingTrigger.trigger を呼ぶ', async () => {
      const { eventRepo, phasePublisher, matchingTrigger } = makeRepos();
      const useCase = new AdvanceEventPhase(eventRepo, phasePublisher, matchingTrigger);

      await useCase.execute({
        eventId,
        nextPhase: 'intermission',
        round: 1,
        requesterId: organizerId,
      });

      expect(matchingTrigger.trigger).toHaveBeenCalledWith(eventId);
    });

    it('voting → intermission 以外では matchingTrigger.trigger を呼ばない', async () => {
      const record = { ...baseRecord, phase: 'entry' as const };
      const { eventRepo, phasePublisher, matchingTrigger } = makeRepos(record);
      const useCase = new AdvanceEventPhase(eventRepo, phasePublisher, matchingTrigger);

      await useCase.execute({
        eventId,
        nextPhase: 'presentation',
        round: 1,
        requesterId: organizerId,
      });

      expect(matchingTrigger.trigger).not.toHaveBeenCalled();
    });
  });

  describe('エラー系', () => {
    it('イベントが見つからない場合 err(NotFoundError) を返す', async () => {
      const { eventRepo, phasePublisher, matchingTrigger } = makeRepos();
      vi.mocked(eventRepo.findById).mockResolvedValue(
        err(new NotFoundError('イベントが見つかりません')),
      );
      const useCase = new AdvanceEventPhase(eventRepo, phasePublisher, matchingTrigger);

      const result = await useCase.execute({
        eventId,
        nextPhase: 'intermission',
        round: 1,
        requesterId: organizerId,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBeInstanceOf(NotFoundError);
    });

    it('オーガナイザー以外は err(ForbiddenError) を返す', async () => {
      const { eventRepo, phasePublisher, matchingTrigger } = makeRepos();
      const useCase = new AdvanceEventPhase(eventRepo, phasePublisher, matchingTrigger);

      const result = await useCase.execute({
        eventId,
        nextPhase: 'intermission',
        round: 1,
        requesterId: otherId,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('forbidden');
    });

    it('不正なフェーズ遷移は err(InvalidTransitionError) を返す', async () => {
      const { eventRepo, phasePublisher, matchingTrigger } = makeRepos();
      const useCase = new AdvanceEventPhase(eventRepo, phasePublisher, matchingTrigger);

      const result = await useCase.execute({
        eventId,
        nextPhase: 'entry',
        round: 1,
        requesterId: organizerId,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(InvalidTransitionError);
        expect(result.error.code).toBe('invalid_transition');
      }
    });
  });
});
