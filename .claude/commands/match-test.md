---
name: /match-test
description: k-partition 2-opt の決定性・制約充足プロパティテスト + ゴールデン + N=20 ベンチマーク回帰検知。
---

# /match-test

**用途**: `src/domain/matching/` を変更したとき、またはマッチング結果が期待と異なるときに回帰検知する。

## 実行プロトコル

### Step 1: Unit / Property テスト

```bash
pnpm test tests/matching
pnpm test --coverage src/domain/matching
```

確認項目 ([testing-tomokoi.md](../rules/testing-tomokoi.md) 準拠):

- [ ] 決定性プロパティ (同一入力 + seed で同一出力、1000 ケース)
- [ ] 制約充足プロパティ
  - 全員配置 (未配置ゼロ)
  - 各テーブル 3-4 名
  - 男女 2:2 (許容 ±1、`other` は残席)
  - 登壇ペア分離
- [ ] Min-Regret ゴールデン 3 ケース以上が期待値通り
- [ ] 境界値: 3 vs 3 / 3 vs 5 / 5 vs 3 / 0 vs N / `other` のみ / 投票 0 人ユーザ
- [ ] カバレッジ **100%** (Domain 層の特別目標)

### Step 2: Benchmark

```bash
pnpm bench tests/matching/benchmark
```

- [ ] N=20 で **< 300ms** (p95)
- [ ] N=50 で < 2 秒
- [ ] N=100 で < 8 秒 (Vercel 10 秒以内)
- [ ] 前回実行より 20% 以上遅くなっていない (回帰検知)

### Step 3: Matching Reviewer エージェント

`matching-reviewer` エージェントを起動し、コード変更が以下を壊していないか確認:

- 外部マッチングライブラリへの依存が追加されていないか
- 純粋関数性が保たれているか (`src/domain/matching/` に I/O が混入していないか)
- ハード制約が「ソフト制約 + ペナルティ」に格下げされていないか (男女比は物理的に弾く)
- seed の扱いに変更がないか (決定性)
- Iterator 版 (可視化用) が壊れていないか

### Step 4: レポート

```
## /match-test 結果 — YYYY-MM-DD

### ✅ Passed
- Property tests: 1000/1000 (決定性 + 制約)
- Golden tests: 3/3
- Coverage: 100% (src/domain/matching/)

### Benchmark
- N=20: 145ms (前回比 +2ms, OK)
- N=50: 820ms (前回比 -15ms, 改善)
- N=100: 4.8s (前回比 +100ms, OK)

### Reviewer 指摘
- なし / <具体指摘>
```

## Red Flags (見つけたら即停止)

- 決定性テストが 1 ケースでも失敗 → PRNG の不正 mutable state の可能性
- 制約違反が 1 件でも出る → ハード制約の実装ミス
- ベンチマークが 20% 超悪化 → 計算量オーダーのバグ
- 外部マッチングライブラリの import が追加されている → **ルール違反**、PR をブロック

## 関連

- [.claude/rules/matching-algorithm.md](../rules/matching-algorithm.md)
- [.claude/agents/matching-reviewer.md](../agents/matching-reviewer.md)
- `docs/tech_spec/05_d_voting_matching_epilogue.md`
