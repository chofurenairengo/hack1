type Brand<T, B extends string> = T & { readonly __brand: B };

export type UserId = Brand<string, 'UserId'>;
export type EventId = Brand<string, 'EventId'>;
export type PairId = Brand<string, 'PairId'>;
export type DeckId = Brand<string, 'DeckId'>;
export type SlideId = Brand<string, 'SlideId'>;
export type MatchId = Brand<string, 'MatchId'>;
export type MessageId = Brand<string, 'MessageId'>;
export type TableId = Brand<string, 'TableId'>;
export type VoteId = Brand<string, 'VoteId'>;
export type RecommendationId = Brand<string, 'RecommendationId'>;
export type StampId = Brand<string, 'StampId'>;
export type PhotoId = Brand<string, 'PhotoId'>;

export const asUserId = (v: string): UserId => v as UserId;
export const asEventId = (v: string): EventId => v as EventId;
export const asPairId = (v: string): PairId => v as PairId;
export const asDeckId = (v: string): DeckId => v as DeckId;
export const asSlideId = (v: string): SlideId => v as SlideId;
export const asMatchId = (v: string): MatchId => v as MatchId;
export const asMessageId = (v: string): MessageId => v as MessageId;
export const asTableId = (v: string): TableId => v as TableId;
export const asVoteId = (v: string): VoteId => v as VoteId;
export const asRecommendationId = (v: string): RecommendationId => v as RecommendationId;
export const asStampId = (v: string): StampId => v as StampId;
export const asPhotoId = (v: string): PhotoId => v as PhotoId;
