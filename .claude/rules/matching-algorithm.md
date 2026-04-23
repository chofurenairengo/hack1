---
description: "k-partition 2-opt マッチングアルゴリズム (純粋 TypeScript) の設計規約 — 決定性 / ハード制約 / パフォーマンス / 外部ライブラリ禁止"
globs: ["src/domain/matching/**/*", "src/domain/vote/**/*", "src/application/matching/**/*", "tests/matching/**/*"]
alwaysApply: true
---

# Matching Algorithm (k-partition 2-opt) ルール

`src/domain/matching/` はトモコイ最大の技術アピール (§1.1) — **k-partition 2-opt を純粋 TypeScript で自前実装**する。品質基準を最も高く保つ。

## 実装方針

1. **外部マッチングライブラリ禁止**。`matching`, `networkx` のマッチング機能、`blossom` 等を**使わない**。
2. **純粋関数**: `src/domain/matching/` は副作用を持たず、入力 (`VoteSet` + `ParticipantSet` + 制約 + seed) から結果 (`TableAssignment[]`) を返すだけ。I/O は呼び出し側 (`src/application/matching/ComputeMatching.ts`) に隔離。
3. **決定性**: 同じ入力 + 同じ seed で必ず同じ出力を返す。ランダム要素は seed 付き PRNG (`mulberry32` 等) のみ。
4. **ハード制約**:
   - 全員配置 (未配置ゼロ)
   - テーブルサイズ 3-4 名
   - 男女基本 2:2 (`other` はバランス制約外、残り席に配置)
   - 登壇ペア同テーブル禁止
5. **ソフト制約 (最大化)**:
   - 男女バランスの偏り最小化
   - 相互投票の同席 (rank 1 > rank 2 > rank 3 の重み)
6. **入力は `votes` テーブルのみ**。`recommendations` はアルゴリズムに渡さず、UI 表示専用。

## パフォーマンス

- **N=20 (通常) で 100-300ms**、**Vercel Serverless 10 秒タイムアウト以内に完了**
- `pnpm bench` (vitest-bench 等) で N=20/50/100 のベンチマークを記録し、CI で回帰したら落とす
- 可視化用に**各反復のスナップショット**を返す iterator 版を用意する (フロントのノード/エッジアニメーション用)

## テスト必須ケース

`tests/matching/` に最低以下を置く:

- **決定性**: 同じ入力 + seed で出力が等しい (プロパティテスト)
- **制約充足**: 全テーブル 3-4 名 / 男女 2:2 (許容 ±1) / 登壇ペア分離 / 全員配置
- **Min-Regret**: 固定入力に対する既知の最適解を返す (ゴールデンテスト 3 ケース以上)
- **境界値**: 3 vs 3、3 vs 5 (5 対 3 の逆も)、0 vs N、`other` のみ
- **不完全投票**: 投票 0 人のユーザ / 一部のみ投票しても完了
- **動的リバランシング**: ドタキャンで人数変動時に硬制約を再計算できる

## コード品質

- 関数 50 行以内、ファイル 400 行以内目安
- 早期 return、ネスト 3 段まで
- 入出力は型定義 (`VoteSet`, `Participant`, `TableAssignment` など) を `src/domain/matching/types.ts` に集約
- `Result<Ok, Err>` 型で失敗を明示 (throw しない)

## 禁止事項

- `src/domain/matching/` で `console.log` をコミットしない (`logger` 注入)
- Mutable グローバル状態を持たない
- 本体に I/O (Supabase / fetch) を混ぜない。I/O は呼び出し側 (`src/application/matching/`)
- 外部マッチングライブラリを追加しない

## 参考

- `docs/tech_spec/05_d_voting_matching_epilogue.md` — k-partition 2-opt の詳細設計
- [tomokoi-guardrails.md](tomokoi-guardrails.md) — Votes のみ入力 / `other` 扱い
- [testing-tomokoi.md](testing-tomokoi.md) — プロパティテスト戦略
