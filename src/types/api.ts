// クロスメンバー型契約 — B（PM）が Phase 0 で定義する型仕様
// 自動生成ではないため手編集可。変更は PR 経由で影響レーンを明記する。

// ── ActionResult ──────────────────────────────────────────
export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code:
        | 'validation_error'
        | 'unauthenticated'
        | 'forbidden'
        | 'not_found'
        | 'conflict'
        | 'internal_error';
      message: string;
      details?: unknown;
    };

// ── Branded IDs ───────────────────────────────────────────
export type UserId = string & { __brand: 'UserId' };
export type EventId = string & { __brand: 'EventId' };
export type PairId = string & { __brand: 'PairId' };
export type DeckId = string & { __brand: 'DeckId' };
export type SlideId = string & { __brand: 'SlideId' };
export type MatchId = string & { __brand: 'MatchId' };
export type MessageId = string & { __brand: 'MessageId' };
export type TableId = string & { __brand: 'TableId' };
export type VoteId = string & { __brand: 'VoteId' };
export type RecommendationId = string & { __brand: 'RecommendationId' };
export type StampId = string & { __brand: 'StampId' };
export type PhotoId = string & { __brand: 'PhotoId' };

// ── Enums / Unions ────────────────────────────────────────
export type EventPhase =
  | 'pre_event'
  | 'entry'
  | 'presentation'
  | 'voting'
  | 'intermission'
  | 'mingling'
  | 'closing';

export type StampKind = 'handshake' | 'sparkle' | 'laugh' | 'clap';
export type Gender = 'female' | 'male' | 'other';
export type EntryType = 'presenter_pair' | 'audience';
export type MatchStatus = 'active' | 'blocked' | 'reported';
export type PhotoConsentState = 'pending' | 'consented' | 'revoked';
export type SlideStatus =
  | 'draft'
  | 'pending_introducee'
  | 'pending_organizer'
  | 'approved'
  | 'rejected';

// ── Realtime チャンネル Payload ───────────────────────────
export type SlideSyncPayload = {
  readonly deckId: DeckId;
  pairId: PairId;
  slideIndex: number;
  updatedAt: string;
};

export type ExpressionPayload = {
  readonly userId: UserId;
  weights: {
    mouthOpen: number;
    mouthSmile: number;
    eyeBlinkL: number;
    eyeBlinkR: number;
    browInnerUp: number;
  };
  lookAt: { x: number; y: number } | null;
  ts: number;
};

export type StatePayload = {
  readonly phase: EventPhase;
  round: number;
  startedAt: string;
};

export type StampPayload = {
  readonly pairId: PairId;
  kind: StampKind;
  clientNonce: string;
};

export type ChatMessagePayload = {
  readonly messageId: MessageId;
  senderId: UserId;
  body: string;
  sentAt: string;
};

// ── Use Case 戻り値 ───────────────────────────────────────
export type TableMemberData = {
  userId: UserId;
  displayName: string;
  avatarPresetKey: string;
  gender: Gender;
};

export type TableAssignmentPlan = {
  tables: Array<{ id: TableId; seatCount: number; members: UserId[] }>;
  leftovers: UserId[];
  score: number;
};
