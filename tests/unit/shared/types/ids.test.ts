import { describe, it, expect } from 'vitest';
import {
  asUserId,
  asEventId,
  asDeckId,
  asSlideId,
  asMatchId,
  asMessageId,
  asTableId,
  asVoteId,
  asPairId,
  asRecommendationId,
  asStampId,
  asPhotoId,
} from '@/shared/types/ids';

describe('Branded ID cast functions', () => {
  it('asUserId returns the input string', () => {
    const raw = 'abc-123';
    expect(asUserId(raw)).toBe(raw);
  });

  it('asEventId returns the input string', () => {
    const raw = 'event-uuid';
    expect(asEventId(raw)).toBe(raw);
  });

  it('all cast functions return the original value', () => {
    const v = 'test-value';
    expect(asDeckId(v)).toBe(v);
    expect(asSlideId(v)).toBe(v);
    expect(asMatchId(v)).toBe(v);
    expect(asMessageId(v)).toBe(v);
    expect(asTableId(v)).toBe(v);
    expect(asVoteId(v)).toBe(v);
    expect(asPairId(v)).toBe(v);
    expect(asRecommendationId(v)).toBe(v);
    expect(asStampId(v)).toBe(v);
    expect(asPhotoId(v)).toBe(v);
  });
});
