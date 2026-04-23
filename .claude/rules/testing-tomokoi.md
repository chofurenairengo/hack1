---
description: "トモコイ特化テスト戦略 — vitest + Playwright / k-partition プロパティテスト / Supabase local integration / RLS behavior"
globs: ["tests/**/*", "src/**/*.test.ts", "src/**/*.test.tsx", "playwright/**/*", "e2e/**/*"]
alwaysApply: true
---

# Testing — トモコイ特化

`~/.claude/rules/common/testing.md` と `~/.claude/rules/typescript/testing.md` の汎用ルールを継承し、**プロジェクト特有の必須ケース**を追加する。

## カバレッジ目標

- 全レイヤ **80%+ line/branch coverage**
- **Domain 層 (特に `src/domain/matching/`) は 100%** を目指す — 致命リスクの塊

## テストの分類

| 種別 | フレームワーク | 対象 |
|---|---|---|
| Unit | vitest | Domain / Application / lib / hooks |
| Integration | vitest + Supabase local | Infrastructure (Repository / Adapter) / RLS 挙動 |
| E2E | Playwright | 主要ユーザーフロー (Phase 4) |
| Property-based | vitest + fast-check | k-partition 決定性 / 制約充足 |
| Benchmark | vitest bench | k-partition N=20/50/100 回帰検知 |

## 必須ケース (k-partition)

`tests/matching/` に以下を置く:

- **決定性プロパティ**: 任意の `VoteSet` + 同一 seed で同一出力を返す (`fast-check` で 1000 ケース)
- **制約充足プロパティ**: 出力が常にハード制約を満たす
  - 全員配置 (未配置ゼロ)
  - 各テーブル 3-4 名
  - 男女 2:2 (許容 ±1、`other` は残席)
  - 登壇ペア分離
- **Min-Regret ゴールデン** 3 ケース以上: 固定入力 → 既知の最適解
- **境界値**: 3 vs 3, 3 vs 5, 5 vs 3, 0 vs N, `other` のみ, 投票 0 人ユーザ含む
- **動的リバランシング**: 参加者が途中で変動しても再計算で破綻しない

## 必須ケース (RLS)

`tests/rls/` に Supabase local を立てて実行:

- 他イベント参加者が該当 `events.id` のレコードを SELECT できないこと
- 投票者本人以外が `votes` を SELECT/UPDATE できないこと
- マッチ当事者以外が `match_messages` を SELECT できないこと
- service role でのみマッチング計算が可能なこと

## 必須ケース (Gemini モック)

`tests/ai/` に以下:

- プロンプトに 4 役割 (構成 / コピーライター / 批評 / デザイナー) の記述が含まれる
- `responseMimeType: application/json` が指定されている
- JSON Schema に `slides`, `blocked`, `reason` がある
- 容姿描写を含む入力が `blocked: true` になる (snapshot)
- パース失敗時に最大 2 回リトライする

## E2E (Phase 4)

Playwright でデモ脚本ベース:
- 紹介者登録 → 被紹介者招待 → スライドプレビュー → 合意
- オーディエンス入場 → 投票 → マッチング結果表示
- マッチ成立 → 1:1 チャット → 顔写真相互同意

## パフォーマンス回帰検知

- `pnpm bench` で k-partition N=20/50/100 のレイテンシを記録
- GitHub Actions で**前回より 20% 遅くなったら失敗**させる

## 禁止事項

- テストをスキップ / skip.todo のまま PR を出さない
- Domain 層のテストで Supabase / fetch をモックせずにそのまま呼ばない (純粋関数前提)
- E2E の flaky テストを容認しない (quarantine or fix)
- テストで `SUPABASE_SERVICE_ROLE_KEY` を hard-code しない (テスト用キーを env で)

## 参考

- [matching-algorithm.md](matching-algorithm.md) — k-partition 仕様
- [supabase-rls.md](supabase-rls.md) — RLS パターン
- [ai-gemini-prompts.md](ai-gemini-prompts.md) — Gemini プロンプト構造
