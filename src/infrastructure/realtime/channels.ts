import type { EventId, PairId, TableId, MatchId } from '@/shared/types/ids';

/**
 * Realtime チャンネル名ビルダー
 * 命名規約: <domain>:<resource>:<id>  (tech_spec 01 §10 準拠)
 */
export const channelName = {
  /** フェーズ同期チャンネル — Presence 有効 */
  eventState: (eventId: EventId): string => `event:${eventId}:state`,

  /** スライドめくり同期チャンネル (登壇ペア単位) */
  slideSync: (eventId: EventId, pairId: PairId): string => `event:${eventId}:slide-sync:${pairId}`,

  /** スタンプエフェクトチャンネル (匿名 Broadcast) */
  stamp: (eventId: EventId): string => `event:${eventId}:stamp`,

  /** 表情係数同期チャンネル (登壇ペア単位、15fps) */
  expression: (eventId: EventId, pairId: PairId): string => `event:${eventId}:expression:${pairId}`,

  /** WebRTC シグナリングチャンネル (交流テーブル単位) */
  breakoutSignal: (eventId: EventId, tableId: TableId): string =>
    `breakout:${eventId}:${tableId}:signal`,

  /** 1:1 チャット即時配信チャンネル */
  chat: (matchId: MatchId): string => `chat:${matchId}`,

  /** プレゼン枠 WebRTC シグナリングチャンネル (登壇ペア単位、Presence 有効) */
  presenterSignal: (eventId: EventId, pairId: PairId): string =>
    `presenter:${eventId}:${pairId}:signal`,
} as const;
