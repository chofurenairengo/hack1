# CLAUDE.md — トモコイ (Date My Mate JP)

## Project Overview

**Hack-1 グランプリ 2026 「トモコイ」** — 友人紹介型ライブマッチングイベントプラットフォーム。最終発表 **2026-05-10 (オフライン・東大福武ホール)**。審査コンセプトは **Move Hands. Move Hearts.**

紹介者が被紹介者の友人を **AI 生成スライド + VRM アバター** でピッチし、オーディエンスが投票、**独自 k-partition 2-opt アルゴリズム**で 3-4 人テーブルに自動配置、**1:1 チャット + 双方合意で顔写真公開** というライブ体験プロダクト。

---

## Critical Rules

### Database (Supabase PostgreSQL + RLS)

1. **RLS は必須**。新規テーブルには必ず Row Level Security ポリシーを同梱する。RLS なしの migration は PR を出さない。
2. **イベント参加者以外はデータ参照不可**。`entries` に存在しない `user_id` は当該 `events.id` に属するレコードを SELECT できない。
3. **`SUPABASE_SERVICE_ROLE_KEY` はクライアントに渡さない**。ブラウザは `anon key` のみ。service role はサーバ専用 (`src/infrastructure/supabase/client-admin.ts` に隔離、`server-only` import 必須)。

### Matching (独自 k-partition 2-opt)

4. **入力は `votes` テーブルのみ**。`recommendations` (紹介者推薦フラグ) はアルゴリズムに渡さず、UI 上の星マーク表示に留める。
5. **外部マッチングライブラリ (`matching`, `networkx` 等) を使わない**。`src/domain/matching/` に純粋 TypeScript で自前実装する (技術アピールの根拠)。
6. **男女比均等化はハード制約**。`other` (非二元 / 未回答) はバランス制約外、残り席に配置。登壇ペアは同テーブル禁止。
7. **決定性 (seed 固定で再現可能)**、**N=20 で 100-300ms、Vercel Serverless 10 秒タイムアウト以内**。

### AI (Gemini 3 Flash 4 役割プロンプト)

8. **単一 Gemini 3 Flash 呼び出しの中で 4 役割 (構成 / コピーライター / 批評 / デザイナー) を分化**する。単一ロールで済ませない。
9. **批評役は必ず最終段**を通過させ、公序良俗違反・個人情報リスクを検知する。
10. **容姿・スペック描写は NG**。日本語のみ。`responseMimeType: "application/json"` + JSON Schema で出力を強制する。

### Realtime / WebRTC

11. **プレゼン中のビデオは OFF**。UI でビデオ ON を強制する変更を入れない。登壇ペアの音声は WebRTC P2P のみ。
12. **Offline-first**: Realtime 接続断でも進行できるローカルキャッシュを壊さない。
13. Realtime Broadcast の **4 チャンネル構成はメンバー C が一元管理**する。他レーンから直接チャンネルを生やさない。

### UX

14. **アワードは「おもしろい」「盛り上がった」「友情」の 3 種のみ**。「異性から人気◯位」系ランキングを**絶対に追加しない**。
15. **紹介者が被紹介者の代わりにマッチング相手を選ぶ UI を実装しない**。本人投票必須、紹介者は推薦フラグまで。
16. **被紹介者の事前プレビュー + NG 機能を削らない** (`docs/requirements` Phase 2)。

### Code Style

17. イミュータブル (spread operator で新オブジェクトを返す、in-place mutation 禁止)。
18. 1 ファイル 200-400 行、最大 800 行。関数 50 行以内、ネスト 4 段まで。
19. Server Action は `"use server"` + `zod` 検証 + `ActionResult<T>` 戻り値を必須とする。

---

## File Structure

```
hack1/
├── src/
│   ├── app/                      # Next.js App Router (Server Component デフォルト)
│   │   ├── (public)/             # 未認証ページ (login, signup 等)
│   │   ├── (app)/                # 認証後アプリ本体
│   │   │   └── events/[eventId]/ # イベント参加・実況画面
│   │   ├── (admin)/              # 管理者向け画面
│   │   └── api/                  # Route Handler (webhook 等)
│   ├── domain/                   # ドメイン層 (他層 import 禁止)
│   │   ├── matching/             # k-partition 2-opt + 投票・テーブル ← メンバーD
│   │   ├── slide/                # スライドエンティティ ← メンバーA
│   │   ├── avatar/               # アバタードメイン ← メンバーB
│   │   ├── chat/                 # チャット・マッチドメイン ← メンバーD
│   │   ├── event/                # イベント・エントリドメイン
│   │   ├── stamp/                # スタンプ・アワードドメイン
│   │   ├── user/                 # ユーザードメイン
│   │   └── shared/               # ドメイン共通 (Result, DomainError 等)
│   ├── application/              # Use Case (Domain のみ依存)
│   │   ├── slide/                # SubmitSlideDeck, GenerateSlide 等
│   │   ├── vote/                 # SubmitVote
│   │   ├── matching/             # ComputeMatching
│   │   ├── match/                # AcceptMatch, RevealPhoto 等
│   │   ├── chat/                 # SendMessage 等
│   │   ├── event/                # CreateEvent 等
│   │   ├── stamp/                # SendStamp 等
│   │   └── shared/               # UseCase 共通基盤
│   ├── infrastructure/           # Repository 実装 + Adapter
│   │   ├── supabase/             # Supabase クライアント (browser/server/admin 分離)
│   │   │   ├── client-browser.ts # createBrowserClient + anon key
│   │   │   ├── client-server.ts  # createServerClient (RSC/Route Handler 用、server-only)
│   │   │   ├── client-admin.ts   # service role 専用 (server-only、マッチング計算のみ)
│   │   │   └── middleware.ts     # セッション refresh
│   │   ├── ai/gemini/            # GeminiSlideGeneratorAdapter ← メンバーA
│   │   ├── realtime/             # Supabase Realtime Broadcast ← メンバーC
│   │   ├── webrtc/               # P2P 音声 ← メンバーC
│   │   ├── avatar/               # VRM + MediaPipe ← メンバーB
│   │   ├── pptx/                 # pptxgenjs ← メンバーA
│   │   ├── email/                # Resend メール送信
│   │   └── storage/              # Supabase Storage (顔写真等)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui 生成物 (手編集禁止)
│   │   └── features/             # 機能別コンポーネント
│   ├── stores/                   # Zustand (1 ドメイン = 1 ストア)
│   ├── hooks/                    # React カスタムフック
│   ├── shared/                   # フレームワーク非依存ユーティリティ
│   │   ├── config/               # env.ts (Zod 起動時検証)
│   │   ├── constants/            # アプリ定数
│   │   ├── types/                # ActionResult<T>, ブランド ID 等
│   │   └── utils/                # 汎用ユーティリティ
│   └── types/
│       ├── api.ts                # クロスメンバー型契約 (メンバー A 管轄、変更は全レーン合意必須)
│       └── supabase.ts           # supabase gen types 自動生成 (手編集禁止)
├── supabase/
│   ├── migrations/               # SQL マイグレーション (必ず RLS 同梱)
│   ├── seed.sql
│   └── config.toml
├── docs/
│   ├── tomokoi_spec_v5_3.md
│   └── tech_spec/00-05*.md
├── public/
├── .claude/                      # Claude Code 設定 (本ディレクトリ)
├── CLAUDE.md                     # 本ファイル
├── package.json
└── tsconfig.json
```

---

## Key Patterns

### Server Action 規約

```ts
'use server';
import { z } from 'zod';
import type { ActionResult } from '@/shared/types/action-result';

const schema = z.object({ voteeId: z.string().uuid(), rank: z.number().int().min(1).max(3) });

export async function submitVote(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid_input' };
  // Use Case を 1 つだけ呼ぶ
  return await submitVoteUseCase(parsed.data);
}
```

### Repository Pattern

Domain 層はインターフェース (`VoteRepository`) のみ、`infrastructure/supabase/SupabaseVoteRepository` が実装。Use Case はインターフェースに依存する (DIP)。

### API Response 共通型

```ts
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };
```

### Realtime Broadcast 4 チャンネル構成 (メンバーC 管轄)

- `event:{eventId}:phase` — フェーズ遷移 (pre_event / entry / presentation / voting / intermission / mingling / closing)
- `event:{eventId}:slide` — スライド表示同期
- `event:{eventId}:stamp` — スタンプ (匿名、送信者 ID 保存しない)
- `event:{eventId}:avatar` — MediaPipe 表情 + 音声メタ

---

## Environment Variables

| 変数                                 | スコープ        | 用途                                |
| ------------------------------------ | --------------- | ----------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`           | client + server | Supabase プロジェクト URL           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | client + server | 匿名キー (RLS 適用)                 |
| `SUPABASE_SERVICE_ROLE_KEY`          | **server only** | RLS バイパス計算 (マッチング時のみ) |
| `GEMINI_API_KEY`                     | **server only** | Gemini 3 Flash 呼び出し             |
| `RESEND_API_KEY`                     | **server only** | マッチ通知・差し戻しメール          |
| `DAILY_API_KEY` or `LIVEKIT_API_KEY` | **server only** | (検討中) 交流タイム用動画           |

**禁止事項**: `.env.local` / 秘密キーを含むファイルを Write しない (`.claude/settings.json` で deny 済み)。

---

## Docs References

> **Docs Sync Rule**: `docs/` 配下の `.md` ファイルが追加・削除・改名されたら、必ず本セクションを更新する。各ファイルの H1 / 冒頭要約を説明として使う。

- [docs/tomokoi_spec_v5_3.md](docs/tomokoi_spec_v5_3.md) — 要件定義書 v5.3 (マニフェスト、UX フロー、ビジネスモデル、不変量)
- [docs/tech_spec/00_tech_spec_overview.md](docs/tech_spec/00_tech_spec_overview.md) — 技術仕様全体 + DB スキーマ + 4 人分担
- [docs/tech_spec/01_foundation.md](docs/tech_spec/01_foundation.md) — Phase 0 基盤 (スキーマ / RLS / CI/CD / クロスメンバー型)
- [docs/tech_spec/02_a_slide.md](docs/tech_spec/02_a_slide.md) — メンバーA: スライド・Gemini 3 Flash・pptxgenjs・管理
- [docs/tech_spec/03_b_avator.md](docs/tech_spec/03_b_avator.md) — メンバーB: VRM アバター・MediaPipe
- [docs/tech_spec/04_c_realtime.md](docs/tech_spec/04_c_realtime.md) — メンバーC: Realtime Broadcast + WebRTC
- [docs/tech_spec/05_d_voting_matching_epilogue.md](docs/tech_spec/05_d_voting_matching_epilogue.md) — メンバーD: 投票・k-partition・チャット・顔写真同意

---

## Phase Roadmap

| Phase   | 期間      | 主担当 | 内容                                                                                 |
| ------- | --------- | ------ | ------------------------------------------------------------------------------------ |
| Phase 0 | 4/13-4/15 | A 単独 | 基盤 (スキーマ、RLS、CI/CD、クロスメンバー型契約 `types/api.ts` 確定)                |
| Phase 1 | 4/16-4/19 | 全員   | 各レーン PoC (B: VRM スマホ PoC 必須、C: Realtime 2タブエコー、A/D: DB 疎通)         |
| Phase 2 | 4/20-4/26 | 全員   | スライド生成 / アバター本実装 / Realtime 基盤 / 投票・推薦。**中間発表 4/25**        |
| Phase 3 | 4/27-5/3  | 全員   | GW 集中: マッチング計算 + テーブル案内 / チャット・同意 / パフォーマンス / pptxgenjs |
| Phase 4 | 5/4-5/10  | 全員   | 統合テスト / デモ脚本 / 本番相当リハーサル / **最終発表 5/9-5/10**                   |

---

## Member Lanes

| メンバー | 主担当                                                  | 管轄ディレクトリ                                                                                                                                       |
| -------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A**    | スライド・Gemini・pptxgenjs・管理画面・クロスメンバー型 | `src/domain/slide/`, `src/application/slide/`, `src/infrastructure/ai/gemini/`, `src/infrastructure/pptx/`, `src/types/api.ts`, `supabase/migrations/` |
| **B**    | VRM アバター・MediaPipe・表情追従                       | `src/infrastructure/avatar/`, `src/components/features/avatar/`                                                                                        |
| **C**    | Realtime Broadcast (4 チャンネル) + WebRTC + 状態機械   | `src/infrastructure/realtime/`, `src/infrastructure/webrtc/`, `src/stores/realtime/`                                                                   |
| **D**    | 投票・k-partition 2-opt・マッチ・チャット・顔写真同意   | `src/domain/matching/`, `src/domain/chat/`, `src/application/{vote,matching,match,chat}/`                                                              |

越境編集は禁止。クロスメンバー型契約 (`src/shared/types/`) は **A 管轄**で、他メンバーは PR レビューで合意を取る。

---

## ECC Workflow

| スラッシュコマンド     | 用途                                                                       |
| ---------------------- | -------------------------------------------------------------------------- |
| `/feature-development` | 大機能追加: planner → tdd-guide → code-reviewer → security-reviewer を順次 |
| `/database-migration`  | `supabase/migrations/` + RLS ポリシー + `gen types` + `rls-auditor` 起動   |
| `/rls-audit`           | 全テーブルの RLS 監査                                                      |
| `/phase0-check`        | Phase 0 基盤完了チェック (スキーマ、RLS 全テーブル、CI、`types/api.ts`)    |
| `/member-a-slide`      | A レーン (スライド・Gemini・pptxgenjs) 開始プロトコル                      |
| `/member-b-avatar`     | B レーン (VRM・MediaPipe・スマホ PoC)                                      |
| `/member-c-realtime`   | C レーン (Realtime Broadcast・WebRTC・offline fallback)                    |
| `/member-d-matching`   | D レーン (投票・k-partition・チャット・顔写真同意)                         |
| `/match-test`          | k-partition 2-opt ゴールデンテスト + N=20 ベンチ回帰                       |
| `/integration-test`    | Phase 4 E2E (Playwright)                                                   |

---

## Agent Delegation

プロジェクト固有レビュアーが PROACTIVE (自動) で起動する:

- `rls-auditor` — `supabase/migrations/*.sql` が変更されたとき
- `matching-reviewer` — `src/domain/matching/*` / `src/application/matching/*` が変更されたとき
- `gemini-prompt-reviewer` — `src/infrastructure/ai/gemini/**` が変更されたとき
- `realtime-reviewer` — `src/infrastructure/realtime/**` / `src/stores/realtime/**` が変更されたとき

ユーザー global (`~/.claude/agents/`) の `planner` / `tdd-guide` / `code-reviewer` / `security-reviewer` / `build-error-resolver` / `e2e-runner` / `refactor-cleaner` / `doc-updater` / `architect` は引き続き利用する。

---

## Git Workflow

- **Conventional Commits**: `feat` / `fix` / `refactor` / `docs` / `test` / `chore` / `perf` / `ci`
- **`--no-verify` 禁止**: pre-commit hook を必ず通す
- **`main` への force push 禁止**
- PR テンプレートに **「RLS 同梱」「クロスメンバー型変更なし or 合意済み」「該当レーンのルール遵守」** チェック欄を入れる

---

## Testing Strategy

- **80%+ coverage** を全レイヤで維持
- **unit**: `vitest` — Domain 層 (特に k-partition) は全網羅
- **integration**: `vitest` + Supabase local — RLS の挙動もテスト
- **E2E**: `Playwright` — Phase 4 で本番相当シナリオを Green に
- **property-based**: k-partition は決定性・制約充足をプロパティテストで固定
- **benchmark**: N=20 で <300ms、CI で回帰検知

---

## References

- プロジェクト同梱 共通ルール: [.claude/rules/common/](.claude/rules/common/) (agents / code-review / coding-style / development-workflow / git-workflow / hooks / patterns / performance / security / testing)
- プロジェクト同梱 TypeScript ルール: [.claude/rules/typescript/](.claude/rules/typescript/) (coding-style / hooks / patterns / security / testing)
- プロジェクト固有ルール: [.claude/rules/](.claude/rules/) — トモコイ固有 + Next.js/Supabase/Gemini/VRM 特化
- 出典: [everything-claude-code](https://github.com/affaan-m/everything-claude-code) 最新版 (2026-04-24 取得)
