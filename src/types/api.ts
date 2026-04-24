// クロスメンバー型契約 — B（PM）が Phase 0 で定義する型仕様
// 自動生成ではないため手編集可。変更は PR 経由で影響レーンを明記する。

// ── ActionResult ──────────────────────────────────────────
export type { ActionErrorCode, ActionResult } from '@/shared/types/action-result';

// ── Branded IDs ───────────────────────────────────────────
import type {
  UserId,
  EventId,
  PairId,
  DeckId,
  SlideId,
  MatchId,
  MessageId,
  TableId,
  VoteId,
  RecommendationId,
  StampId,
  PhotoId,
} from '@/shared/types/ids';
export type {
  UserId,
  EventId,
  PairId,
  DeckId,
  SlideId,
  MatchId,
  MessageId,
  TableId,
  VoteId,
  RecommendationId,
  StampId,
  PhotoId,
};

// ── Enums / Unions ────────────────────────────────────────
import type { EventPhase } from '@/domain/event/value-objects/event-phase.vo';
import type { StampKind } from '@/domain/stamp/value-objects/stamp-kind.vo';
import type { Gender } from '@/domain/user/value-objects/gender.vo';
import type { EntryType } from '@/domain/event/value-objects/entry-type.vo';
import type { MatchStatus } from '@/domain/chat/value-objects/match-status.vo';
import type { PhotoConsentState } from '@/domain/chat/value-objects/photo-consent-state.vo';
import type { SlideStatus } from '@/domain/slide/value-objects/slide-status.vo';
export type {
  EventPhase,
  StampKind,
  Gender,
  EntryType,
  MatchStatus,
  PhotoConsentState,
  SlideStatus,
};

// ── Realtime チャンネル Payload ───────────────────────────
export type SlideSyncPayload = Readonly<{
  deckId: DeckId;
  pairId: PairId;
  slideIndex: number;
  updatedAt: string;
}>;

export type ExpressionPayload = Readonly<{
  userId: UserId;
  weights: {
    mouthOpen: number;
    mouthSmile: number;
    eyeBlinkL: number;
    eyeBlinkR: number;
    browInnerUp: number;
  };
  lookAt: { x: number; y: number } | null;
  ts: number;
}>;

export type StatePayload = Readonly<{
  phase: EventPhase;
  round: number;
  startedAt: string;
}>;

export type StampPayload = Readonly<{
  pairId: PairId;
  kind: StampKind;
  clientNonce: string;
}>;

export type ChatMessagePayload = Readonly<{
  messageId: MessageId;
  senderId: UserId;
  body: string;
  sentAt: string;
}>;

// ── Use Case 戻り値 ───────────────────────────────────────
export type TableMemberData = Readonly<{
  userId: UserId;
  displayName: string;
  avatarPresetKey: string;
  gender: Gender;
}>;

export type TableAssignmentPlan = Readonly<{
  tables: ReadonlyArray<
    Readonly<{ id: TableId; seatCount: number; members: ReadonlyArray<UserId> }>
  >;
  leftovers: ReadonlyArray<UserId>;
  score: number;
}>;
