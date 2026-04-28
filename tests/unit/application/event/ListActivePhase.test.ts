import { describe, it, expect, vi } from 'vitest';
import { ListActivePhase } from '@/application/event/use-cases/ListActivePhase';
import type { EventRepository, EventRecord } from '@/domain/event/repositories/event.repository';
import { ok, err } from '@/domain/shared/types/result';
import { NotFoundError } from '@/domain/shared/errors/not-found.error';
import { asEventId, asUserId } from '@/shared/types/ids';

const eventId = asEventId('11111111-1111-1111-1111-111111111111');
const organizerId = asUserId('22222222-2222-2222-2222-222222222222');

const votingRecord: EventRecord = {
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

function makeRepo(record: EventRecord = votingRecord): EventRepository {
  return {
    findById: vi.fn().mockResolvedValue(ok(record)),
    findAll: vi.fn().mockResolvedValue(ok([])),
    create: vi.fn(),
    updatePhase: vi.fn(),
  };
}

describe('ListActivePhase', () => {
  it('イベントの現在フェーズを返す', async () => {
    const eventRepo = makeRepo();
    const useCase = new ListActivePhase(eventRepo);

    const result = await useCase.execute({ eventId });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.phase).toBe('voting');
  });

  it('イベントが見つからない場合 err(NotFoundError) を返す', async () => {
    const eventRepo = makeRepo();
    vi.mocked(eventRepo.findById).mockResolvedValue(
      err(new NotFoundError('イベントが見つかりません')),
    );
    const useCase = new ListActivePhase(eventRepo);

    const result = await useCase.execute({ eventId });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('各フェーズのレコードを正しく返す', async () => {
    const phases = [
      'pre_event',
      'entry',
      'presentation',
      'voting',
      'intermission',
      'mingling',
      'closing',
    ] as const;

    for (const phase of phases) {
      const record = { ...votingRecord, phase };
      const eventRepo = makeRepo(record);
      const useCase = new ListActivePhase(eventRepo);

      const result = await useCase.execute({ eventId });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.phase).toBe(phase);
    }
  });
});
