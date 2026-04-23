---
description: "4 人並列開発のレーン境界 (A=スライド/管理, B=VRM, C=Realtime, D=投票/マッチング) — 越境編集禁止 / クロスメンバー型契約は A 管轄"
globs: ["src/**/*", "supabase/**/*"]
alwaysApply: true
---

# Team Boundaries (4 人並列開発)

`docs/tech_spec/00_tech_spec_overview.md` のレーン分担を**プロジェクト期間を通じて厳守**する。

## 管轄マトリクス

| メンバー | 主担当 | 排他的管轄 (原則他メンバーは編集しない) |
|---|---|---|
| **A** | スライド・Gemini・pptxgenjs・管理画面・クロスメンバー型 | `src/domain/slide/`, `src/application/slide/`, `src/infrastructure/ai/gemini/`, `src/infrastructure/pptx/`, `src/app/(dashboard)/admin/**`, `src/types/api.ts`, `src/types/db.ts`, `supabase/migrations/` |
| **B** | VRM アバター・MediaPipe | `src/infrastructure/avatar/`, `src/components/features/avatar/` |
| **C** | Realtime Broadcast (4 チャンネル) + WebRTC + 状態機械 | `src/infrastructure/realtime/`, `src/infrastructure/webrtc/`, `src/stores/realtime/`, `src/hooks/useEventPhase.ts`, `src/hooks/useSlideSync.ts`, `src/hooks/useStampBroadcast.ts`, `src/hooks/useAvatarSync.ts` |
| **D** | 投票・k-partition 2-opt・マッチ・チャット・顔写真同意 | `src/domain/matching/`, `src/domain/vote/`, `src/domain/match/`, `src/application/{vote,matching,match}/`, `src/app/(dashboard)/match/**` |

## 共有資源

- `src/types/api.ts` / `src/types/db.ts` (クロスメンバー型契約) — **A 管轄**。変更は Pull Request で他メンバー合意を取る
- `src/components/ui/` (shadcn/ui) — 全員利用可、手編集禁止
- `src/lib/` — 全員利用可、追加は軽量なユーティリティのみ
- `src/lib/supabase/` — A が基盤を作る、他メンバーは利用のみ (追加は合意)

## 越境編集ルール

- 他メンバーの管轄ファイルを**直接 Edit しない**
- 他レーンに影響する変更が必要な場合は:
  1. Issue / PR で提案
  2. 該当メンバーの承認
  3. 該当メンバーが実装 (ペアで良い)
- ただし **hot-fix (CI 赤・本番障害)** は例外。事後に該当メンバーに通知

## Realtime の越境禁止 (特に重要)

C が一元管理する Realtime に他レーンから直接アクセスしない。**C が公開する hooks / stores 経由のみ**:
- `useEventPhase(eventId)` — A, D が利用
- `useSlideSync(eventId)` — A が利用
- `useStampBroadcast(eventId)` — A, D が利用
- `useAvatarSync(eventId)` — B が利用

## Phase ごとのクリティカルパス

- **Phase 0 (4/13-4/15)**: A 単独で基盤。他メンバー待機
- **Phase 1 (4/16-4/19)**: B の VRM スマホ PoC が最優先。失敗時は 2 体フォールバックを決定
- **Phase 2 (4/20-4/26)**: 並列全力。中間発表 4/25
- **Phase 3 (4/27-5/3)**: マッチング (D) と統合 (全員)
- **Phase 4 (5/4-5/10)**: 統合テスト + リハ + 本番

## 禁止事項

- 他メンバーの管轄ファイルを事前合意なく編集しない
- クロスメンバー型 (`src/types/api.ts`, `src/types/db.ts`) を A 合意なく変更しない
- C 以外が Supabase Realtime チャンネルを直接生やさない
- Phase 0 中に B/C/D が本実装を始めない (基盤が固まる前に手を付けない)

## 参考

- `docs/tech_spec/00_tech_spec_overview.md` — 分担詳細
- [.claude/commands/member-a-slide.md](../commands/member-a-slide.md) 以下 4 レーン
