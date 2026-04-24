// B（PM）管轄 — supabase.ts の Row 型を各テーブルごとに命名エイリアスとして整理する。
// supabase.ts は手編集禁止 (supabase gen types で再生成) のため、
// アプリ内では必ずこのファイル経由でテーブル型を参照すること。
// 変更は B（PM）承認必須。

import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';

// ── Row (SELECT) ──────────────────────────────────────────
export type UserRow = Tables<'users'>;
export type EventRow = Tables<'events'>;
export type EntryRow = Tables<'entries'>;
export type PresentationPairRow = Tables<'presentation_pairs'>;
export type SlideDeckRow = Tables<'slide_decks'>;
export type SlideImageRow = Tables<'slide_images'>;
export type SlideReviewRow = Tables<'slide_reviews'>;
export type VoteRow = Tables<'votes'>;
export type RecommendationRow = Tables<'recommendations'>;
export type EventTableRow = Tables<'event_tables'>;
export type TableMemberRow = Tables<'table_members'>;
export type MatchRow = Tables<'matches'>;
export type MatchMessageRow = Tables<'match_messages'>;
export type PhotoRevealConsentRow = Tables<'photo_reveal_consents'>;
export type ProfilePhotoRow = Tables<'profile_photos'>;
export type StampRow = Tables<'stamps'>;
export type AwardRow = Tables<'awards'>;
export type FriendshipRow = Tables<'friendships'>;
export type BlockRow = Tables<'blocks'>;
export type ReportRow = Tables<'reports'>;

// ── Insert ────────────────────────────────────────────────
export type UserInsert = TablesInsert<'users'>;
export type EventInsert = TablesInsert<'events'>;
export type EntryInsert = TablesInsert<'entries'>;
export type PresentationPairInsert = TablesInsert<'presentation_pairs'>;
export type SlideDeckInsert = TablesInsert<'slide_decks'>;
export type SlideImageInsert = TablesInsert<'slide_images'>;
export type SlideReviewInsert = TablesInsert<'slide_reviews'>;
export type VoteInsert = TablesInsert<'votes'>;
export type RecommendationInsert = TablesInsert<'recommendations'>;
export type EventTableInsert = TablesInsert<'event_tables'>;
export type TableMemberInsert = TablesInsert<'table_members'>;
export type MatchInsert = TablesInsert<'matches'>;
export type MatchMessageInsert = TablesInsert<'match_messages'>;
export type PhotoRevealConsentInsert = TablesInsert<'photo_reveal_consents'>;
export type ProfilePhotoInsert = TablesInsert<'profile_photos'>;
export type StampInsert = TablesInsert<'stamps'>;
export type AwardInsert = TablesInsert<'awards'>;

// ── Update ────────────────────────────────────────────────
export type UserUpdate = TablesUpdate<'users'>;
export type EventUpdate = TablesUpdate<'events'>;
export type EntryUpdate = TablesUpdate<'entries'>;
export type SlideDeckUpdate = TablesUpdate<'slide_decks'>;
export type VoteUpdate = TablesUpdate<'votes'>;
export type MatchUpdate = TablesUpdate<'matches'>;
export type PhotoRevealConsentUpdate = TablesUpdate<'photo_reveal_consents'>;
