---
description: 'k-partition 2-opt マッチングアルゴリズム (純粋 TypeScript) の設計規約 — 決定性 / ハード制約 / パフォーマンス / 外部ライブラリ禁止'
globs:
  [
    'src/domain/matching/**/*',
    'src/domain/vote/**/*',
    'src/application/matching/**/*',
    'tests/matching/**/*',
  ]
alwaysApply: true
---

# Matching Algorithm (k-partition 2-opt) ルール

`src/domain/matching/` はトモコイ最大の技術アピール (§1.1) — **k-partition 2-opt を純粋 TypeScript で自前実装**する。品質基準を最も高く保つ。

## 実装方針

1. **外部マッチングライブラリ禁止**。`matching`, `networkx` のマッチング機能、`blossom` 等を**使わない**。
2. **純粋関数**: `src/domain/matching/` は副作用を持たず、入力 (`VoteSet` + `ParticipantSet` + 制約 + seed) から結果 (`TableAssignment[]`) を返すだけ。I/O は呼び出し側 (`src/application/matching/ComputeMatching.ts`) に隔離。
3. **決定性**: 同じ入力 + 同じ seed で必ず同じ出力を返す。ランダム要素は seed 付き PRNG (`mulberry32` 等) のみ。
4. **ハード制約**:
   - 全被紹介者配置 (紹介者は卓不参加)
   - テーブルサイズ {3, 4} 名 (被紹介者 N=5 のみ {5} を例外許可)
   - 登壇ペア分離は紹介者不参加により自動充足
   - イベント参加: 紹介者+被紹介者の 2 人組必須 (入力バリデーション)
5. **ソフト目的関数 (辞書式優先)**:
   1. 男女 2:2 卓数を最大化 (4 人卓のうち 2:2 になる卓数、`other` を含む卓は混合扱い)
   2. 同性のみ卓を最小化 (混合卓最大化)
   3. 相互投票 rank 合計を最大化 (rank1=3, rank2=2, rank3=1)
6. **入力は `votes` テーブルのみ**。`recommendations` はアルゴリズムに渡さず、UI 表示専用。

## パフォーマンス

- **N=20 (通常) で 100-300ms**、**Vercel Serverless 10 秒タイムアウト以内に完了**
- `pnpm bench` (vitest-bench 等) で N=20/50/100 のベンチマークを記録し、CI で回帰したら落とす
- 可視化用に**各反復のスナップショット**を返す iterator 版を用意する (フロントのノード/エッジアニメーション用)

## テスト必須ケース

`tests/matching/` に最低以下を置く:

- **決定性**: 同じ入力 + seed で出力が等しい (プロパティテスト)
- **制約充足**: 全被紹介者配置 / 卓人数 {3,4} (N=5 のみ {5}) / 紹介者不参加により登壇ペア分離自動充足
- **ソフト目的検証**: 男女 2:2 卓数が辞書式優先で最大化されていること
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
