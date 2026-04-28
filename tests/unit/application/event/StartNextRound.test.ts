import { describe, it, expect, vi } from 'vitest';
import { StartNextRound } from '@/application/event/use-cases/StartNextRound';
import type { EventRepository, EventRecord } from '@/domain/event/repositories/event.repository';
import type { PhasePublisherPort } from '@/application/event/ports/phase-publisher.port';
import { ok, err } from '@/domain/shared/types/result';
import { NotFoundError } from '@/domain/shared/errors/not-found.error';
import { InvalidTransitionError } from '@/domain/event/errors/invalid-transition.error';
import { asEventId, asUserId } from '@/shared/types/ids';

const eventId = asEventId('11111111-1111-1111-1111-111111111111');
const organizerId = asUserId('22222222-2222-2222-2222-222222222222');
const otherId = asUserId('33333333-3333-3333-3333-333333333333');

const minglingRecord: EventRecord = {
  id: eventId,
  title: 'テストイベント',
  description: null,
  mode: 'online',
  phase: 'mingling',
  venue: null,
  scheduledAt: null,
  organizerId,
  maxParticipants: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRepos(record: EventRecord = minglingRecord) {
  const eventRepo: EventRepository = {
    findById: vi.fn().mockResolvedValue(ok(record)),
    findAll: vi.fn().mockResolvedValue(ok([])),
    create: vi.fn(),
    updatePhase: vi.fn().mockResolvedValue(ok({ ...record })),
  };
  const phasePublisher: PhasePublisherPort = {
    publish: vi.fn().mockResolvedValue(ok(undefined)),
  };
  return { eventRepo, phasePublisher };
}

describe('StartNextRound', () => {
  it('mingling → entry で ok を返す', async () => {
    const { eventRepo, phasePublisher } = makeRepos();
    const useCase = new StartNextRound(eventRepo, phasePublisher);

    const result = await useCase.execute({
      eventId,
      nextPhase: 'entry',
      nextRound: 2,
      requesterId: organizerId,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.phase).toBe('entry');
      expect(result.value.round).toBe(2);
    }
    expect(eventRepo.updatePhase).toHaveBeenCalledWith(eventId, 'entry');
    expect(phasePublisher.publish).toHaveBeenCalledWith(eventId, 'entry', 2, expect.any(String));
  });

  it('mingling → presentation で ok を返す', async () => {
    const { eventRepo, phasePublisher } = makeRepos();
    const useCase = new StartNextRound(eventRepo, phasePublisher);

    const result = await useCase.execute({
      eventId,
      nextPhase: 'presentation',
      nextRound: 2,
      requesterId: organizerId,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.phase).toBe('presentation');
  });

  it('イベントが見つからない場合 err(NotFoundError) を返す', async () => {
    const { eventRepo, phasePublisher } = makeRepos();
    vi.mocked(eventRepo.findById).mockResolvedValue(
      err(new NotFoundError('イベントが見つかりません')),
    );
    const useCase = new StartNextRound(eventRepo, phasePublisher);

    const result = await useCase.execute({
      eventId,
      nextPhase: 'entry',
      nextRound: 2,
      requesterId: organizerId,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('オーガナイザー以外は err(ForbiddenError) を返す', async () => {
    const { eventRepo, phasePublisher } = makeRepos();
    const useCase = new StartNextRound(eventRepo, phasePublisher);

    const result = await useCase.execute({
      eventId,
      nextPhase: 'entry',
      nextRound: 2,
      requesterId: otherId,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('forbidden');
  });

  it('mingling 以外からの遷移は err(InvalidTransitionError) を返す', async () => {
    const record = { ...minglingRecord, phase: 'voting' as const };
    const { eventRepo, phasePublisher } = makeRepos(record);
    const useCase = new StartNextRound(eventRepo, phasePublisher);

    const result = await useCase.execute({
      eventId,
      nextPhase: 'entry',
      nextRound: 2,
      requesterId: organizerId,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(InvalidTransitionError);
  });
});
