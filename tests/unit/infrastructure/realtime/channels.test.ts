import { describe, it, expect } from 'vitest';
import { channelName } from '@/infrastructure/realtime/channels';
import { asEventId, asPairId, asTableId, asMatchId } from '@/shared/types/ids';

const eventId = asEventId('event-uuid');
const pairId = asPairId('pair-uuid');
const tableId = asTableId('table-uuid');
const matchId = asMatchId('match-uuid');

describe('channelName', () => {
  it('eventState builds event:*:state pattern', () => {
    expect(channelName.eventState(eventId)).toBe('event:event-uuid:state');
  });

  it('slideSync builds event:*:slide-sync:* pattern', () => {
    expect(channelName.slideSync(eventId, pairId)).toBe('event:event-uuid:slide-sync:pair-uuid');
  });

  it('stamp builds event:*:stamp pattern', () => {
    expect(channelName.stamp(eventId)).toBe('event:event-uuid:stamp');
  });

  it('expression builds event:*:expression:* pattern', () => {
    expect(channelName.expression(eventId, pairId)).toBe('event:event-uuid:expression:pair-uuid');
  });

  it('breakoutSignal builds breakout:*:*:signal pattern', () => {
    expect(channelName.breakoutSignal(eventId, tableId)).toBe(
      'breakout:event-uuid:table-uuid:signal',
    );
  });

  it('chat builds chat:* pattern', () => {
    expect(channelName.chat(matchId)).toBe('chat:match-uuid');
  });

  it('different eventIds produce different channel names', () => {
    const otherId = asEventId('other-event');
    expect(channelName.eventState(eventId)).not.toBe(channelName.eventState(otherId));
  });
});
