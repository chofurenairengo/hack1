---
name: /member-d-matching
description: メンバー D レーン (投票・k-partition 2-opt・マッチ・1:1 チャット・顔写真同意) の作業開始プロトコル。
---

# /member-d-matching

**対象**: メンバー D。投票・マッチングアルゴリズム (k-partition 2-opt)・マッチ成立後のチャット・顔写真公開同意の管轄。**技術アピール §1.1 の根幹**を担う。

## 管轄ディレクトリ

- `src/domain/matching/` — k-partition 2-opt 本体 (純粋 TypeScript)
- `src/domain/vote/` — `Vote` エンティティ・値オブジェクト (`VoteSet`, `Rank` 等)
- `src/domain/match/` — `Match`, `MatchMessage`, `PhotoRevealConsent`
- `src/application/vote/` — `SubmitVote`
- `src/application/matching/` — `ComputeMatching` (service role で呼ぶ)
- `src/application/match/` — `AcceptMatch`, `SendMessage`, `RevealPhoto` 等
- `src/app/(dashboard)/match/**` — マッチ後 UI (テーブル案内、チャット、顔写真)

## 作業開始プロトコル

### Step 1: 関連ルール確認

次を**必ず読む**:
- [.claude/rules/matching-algorithm.md](../rules/matching-algorithm.md) — k-partition 2-opt 全規約、外部ライブラリ禁止、決定性
- [.claude/rules/testing-tomokoi.md](../rules/testing-tomokoi.md) — プロパティテスト、ゴールデン、ベンチマーク
- [.claude/rules/supabase-rls.md](../rules/supabase-rls.md) — votes / matches / profile_photos の RLS
- [.claude/rules/security-tomokoi.md](../rules/security-tomokoi.md) — 投票秘匿、顔写真 10 分 TTL
- [.claude/rules/tomokoi-guardrails.md](../rules/tomokoi-guardrails.md) — 紹介者代理マッチング禁止、`other` 扱い
- `docs/tech_spec/05_d_voting_matching_epilogue.md` — D レーン仕様

### Step 2: k-partition 2-opt 実装の優先順位

1. **まず純粋関数** (`src/domain/matching/kPartition2Opt.ts`) を書く。I/O なし。
2. **プロパティテスト** (`tests/matching/properties.test.ts`) を**先に書いて**、決定性と制約充足を 1000 ケース以上で検証。
3. **ゴールデンテスト** 3 ケース以上。
4. **ベンチマーク** (`tests/matching/benchmark.bench.ts`) で N=20/50/100 の p95 計測。
5. **Application 層** (`ComputeMatching`) で Supabase から votes を集め、k-partition に渡し、`tables` / `table_members` に保存。

### Step 3: 入力制約

- **`votes` テーブルのみが入力**。`recommendations` は UI の星マーク表示用、アルゴリズムに渡さない
- 男女比は `users.gender` を読み、`female` / `male` を 2:2 のハード制約。`other` は残席
- 登壇ペアは `presentation_pairs` から読み、**同テーブル禁止**のハード制約

### Step 4: 投票フェーズの UX (TDD: テスト先行)

> k-partition と同様に `tdd-guide` エージェントを使い、RED → GREEN → REFACTOR で進める。

- 投票は**本人のみ**可能 (紹介者代理禁止、RLS で本人 INSERT のみ許可)
- 同一被投票者に対して rank 重複不可 (DB 制約)
- 投票完了後は変更不可 (イベントフェーズが voting → mingling に遷移したら)
- オフライン時はローカルキューで保持、再接続時に送信 (C 提供のフック利用)

### Step 5: マッチ成立後 (TDD: テスト先行)

> k-partition・投票と同様に `tdd-guide` エージェントを使い、RED → GREEN → REFACTOR で進める。

- `matches` テーブル: `user_a < user_b` で順序正規化
- 1:1 チャット (`match_messages`) は RLS で当事者 2 人のみ
- 顔写真:
  - `photo_reveal_consents` の state: `pending` → `consented` / `revoked`
  - 双方 `consented` のときのみ `createSignedUrl({ expiresIn: 600 })` で 10 分 TTL URL を発行
  - 同意前は型レベル + RLS で二重防御

### Step 6: matching-reviewer エージェント

`src/domain/matching/**` / `src/application/matching/**` を変更すると **`matching-reviewer` が PROACTIVE 起動**する。以下を確認させる:

- 外部マッチングライブラリ依存の有無
- 純粋関数性 (Domain に I/O なし)
- ハード制約の実装 (ペナルティではなく物理的に弾く)
- seed の扱いと決定性
- Iterator 版の動作

### Step 7: テスト実行

```bash
pnpm test tests/matching
pnpm bench tests/matching
```

あるいは `/match-test` で一括実行。

## Phase ごとの D の主な仕事

| Phase | 主な作業 |
|---|---|
| 1 (4/16-19) | k-partition 2-opt 純粋関数 PoC (小規模入力で決定性確認) |
| 2 (4/20-26) | 投票 UI、推薦 UI、k-partition 本体 + プロパティテスト |
| 3 (4/27-5/3) | マッチング結果表示、1:1 チャット、顔写真同意、パフォーマンスチューニング (GW 集中) |
| 4 (5/4-10) | 統合テスト、エッジケース対応、ベンチマーク回帰検知 |

## 関連

- [.claude/rules/matching-algorithm.md](../rules/matching-algorithm.md)
- [.claude/agents/matching-reviewer.md](../agents/matching-reviewer.md)
- [.claude/commands/match-test.md](match-test.md)
- `docs/tech_spec/05_d_voting_matching_epilogue.md`
