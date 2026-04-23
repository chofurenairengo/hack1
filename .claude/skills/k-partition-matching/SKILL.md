---
name: k-partition-matching
description: 独自 k-partition 2-opt マッチングアルゴリズムの詳細設計と実装ガイド。Votes テーブルからテーブル割当を計算する純粋 TypeScript 実装。技術アピール §1.1 の根幹。
tags: ["matching", "algorithm", "tomokoi", "domain"]
---

# Skill: k-partition 2-opt マッチング

## 起動タイミング

- `src/domain/matching/` の実装・変更時
- マッチング結果が期待と異なるとき
- パフォーマンスチューニング時
- プロパティテストの設計時
- レビュー時に「このアルゴリズムは何？」を問われたとき

## 全体像

**入力**: `votes` テーブル (投票者 ID / 被投票者 ID / rank 1-3) + 参加者属性 (gender / 登壇ペア所属)
**出力**: テーブル割当 (各テーブル 3-4 名 × k 枚)
**制約**:
- ハード: 全員配置、テーブルサイズ、男女 2:2 (`other` 残席)、登壇ペア分離
- ソフト: 男女バランス最大化、相互投票同席の最大化 (rank 1 > 2 > 3 の重み)

## フロー

```
1. 入力検証 (zod)
2. 初期解生成 (男女比ハード制約を満たす貪欲割当)
3. 2-opt 反復
   for each pair of tables (T_i, T_j):
     for each pair of members (m in T_i, n in T_j):
       if swap(m, n) improves soft score AND satisfies hard constraints:
         accept swap
   until no improvement in a full pass
4. Iterator 版なら各反復のスナップショットを yield
5. 結果返却 (table_id -> [user_ids])
```

## ハード制約の実装方針

**制約違反を「ペナルティで割引」しない**。ソフトスコア計算の前に**物理的に候補から弾く**:

```ts
function canSwap(assignment, tables, swap): boolean {
  // 男女比 2:2 (許容 ±1)
  if (!checksGenderBalance(tables, swap)) return false
  // 登壇ペアが同テーブルにならない
  if (breaksPresentationPairSeparation(tables, swap)) return false
  // テーブルサイズ 3-4 名を崩さない
  if (violatesTableSize(tables, swap)) return false
  return true
}
```

## `other` (非二元 / 未回答) の扱い

- 男女 2:2 の制約からは**除外**
- 全員配置の後、残席に `other` を埋める
- 例: テーブル 4 席のうち `female: 2, male: 2` で埋まったら `other` は次のテーブルへ

## 決定性 (seed 固定)

```ts
function matchingWithSeed(input: MatchingInput, seed: number): MatchingResult {
  const rng = mulberry32(seed)
  // 全ての「ランダム選択」箇所は rng に集約する
  return kPartition2Opt(input, rng)
}
```

- `Math.random()` を使わない
- 全ての候補選択は `rng()` 経由
- テストでは固定 seed を使い、出力が完全一致することを 1000 ケース検証

## Iterator 版 (可視化)

フロントのノード/エッジアニメーション用に**各反復のスナップショット**を yield:

```ts
export function* iterateKPartition2Opt(
  input: MatchingInput,
  seed: number
): Generator<Snapshot, MatchingResult, void> {
  let state = initialAssignment(input, seed)
  yield { iter: 0, state, improvements: 0 }
  // 2-opt pass...
  yield { iter: N, state, improvements: M }
  return finalResult(state)
}
```

## パフォーマンス目標

| N (参加者数) | p50 | p95 | 限界 |
|---|---|---|---|
| 20 (通常) | < 150ms | < 300ms | Vercel 10 秒以内 |
| 50 | < 1s | < 2s | |
| 100 | < 5s | < 8s | |

## テスト必須ケース

- **決定性**: 同一入力 + seed で同一出力 (`fast-check`, 1000 ケース)
- **ハード制約充足**: 出力が常に制約を満たす
- **ゴールデン**: 固定入力 3 ケースで既知の最適解
- **境界値**: 3 vs 3 / 3 vs 5 / 5 vs 3 / 0 vs N / `other` のみ / 投票 0 人ユーザ
- **動的リバランシング**: ドタキャン時に再計算可能

## 禁止事項

- 外部マッチングライブラリ (`matching`, `networkx`, `blossom` 等) を使わない
- ハード制約をソフト制約 + ペナルティに格下げしない
- `Math.random()` を使わない
- Domain 層に I/O を混入させない
- `src/application/matching/` 以外から k-partition 本体を直接呼ばない

## 関連ファイル

- [.claude/rules/matching-algorithm.md](../../rules/matching-algorithm.md) — アルゴリズムルール
- [.claude/agents/matching-reviewer.md](../../agents/matching-reviewer.md) — 自動レビュアー
- [.claude/commands/match-test.md](../../commands/match-test.md) — テスト実行コマンド
- `docs/tech_spec/05_d_voting_matching_epilogue.md` — 仕様書の真のソース
