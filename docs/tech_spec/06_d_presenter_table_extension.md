# 技術仕様書 06 — 紹介者専用テーブル拡張仕様

> **ステータス**: 仕様確定待ち（実装前レビュー用ドラフト）
> **レーン**: D（投票・マッチング）
> **関連**: PR #65 コメント / PR #70 / Issue #90

---

## 1. 背景と既存仕様との関係

### 1.1 確定済み仕様（PR #65 → PR #70 → Issue #90）

PR #65 のコメント（miyabi206, 2026-04-27）で合意し、PR #70 で型定義に反映済みの仕様：

| 項目                     | 旧仕様                          | 確定仕様                              |
| ------------------------ | ------------------------------- | ------------------------------------- |
| 紹介者の交流タイム卓参加 | 同卓禁止（卓には入る）          | **完全不参加**（ラウンジ/休憩エリア） |
| マッチング計算対象       | 全参加者                        | **被紹介者のみ**                      |
| 男女 2:2                 | ハード制約                      | **ソフト目的関数（辞書式第2位）**     |
| gender 型                | `'female' \| 'male' \| 'other'` | **`'female' \| 'male'` の2値のみ**    |
| 卓サイズ例外             | {3, 4}                          | {3, 4}、被紹介者 N=5 のみ {5} 例外    |

Issue #90 で定義された完全な制約・目的関数：

**ハード制約（必須充足）**

1. 全被紹介者を 1 卓に配置する
2. 卓サイズ ∈ {3, 4}（被紹介者 N=5 のみ {5} を例外許可）
3. イベント参加は紹介者+被紹介者の2人組必須（入力バリデーションで保証）

**ソフト目的関数（辞書式優先順位）**

1. 相互投票 rank 合計を最大化（rank1=3, rank2=2, rank3=1）
2. 男女 2:2 卓数を最大化（4人卓のうち female:male = 2:2 になる卓数）
3. 同性のみ卓を最小化 / 混合卓最大化

### 1.2 本仕様書が追加する変更

本仕様書は上記の確定仕様に**追加**する形で、交流タイム中の **紹介者専用テーブル** を導入する。

変更の要点：

- 「紹介者は被紹介者テーブルに参加しない」という確定仕様は**変更しない**
- ただし紹介者を「ラウンジで自由休憩」とする代わりに、**紹介者専用テーブルに自動配置**する
- 紹介者専用テーブルは k-partition 2-opt の出力（被紹介者テーブル）から**後処理で自動導出**する
- コアの k-partition 2-opt アルゴリズム自体は**変更しない**

---

## 2. 紹介者専用テーブルの仕様

### 2.1 基本ルール

交流タイム（mingling フェーズ）において、以下の2種類のテーブルが存在する：

| テーブル種別           | 参加者       | 決定方法                                   |
| ---------------------- | ------------ | ------------------------------------------ |
| **被紹介者テーブル**   | 被紹介者のみ | k-partition 2-opt（従来通り）              |
| **紹介者専用テーブル** | 紹介者のみ   | 被紹介者テーブルの結果から後処理で自動導出 |

両テーブルは **1:1 で対応**する。被紹介者テーブルが N 個作られた場合、紹介者専用テーブルも N 個作られる。

### 2.2 紹介者専用テーブルの導出ルール

紹介者専用テーブルのメンバーは、被紹介者テーブルのメンバーに対応する紹介者で構成される。

具体的には：

1. 被紹介者テーブル T に所属する各被紹介者 P について、P のペア紹介者 I を求める
2. これらの紹介者 I の集合が、テーブル T に対応する紹介者専用テーブルのメンバーとなる

**対応は紹介ペア（`(紹介者 ID, 被紹介者 ID)`）によって一意に決まる。**
紹介ペアは入力時点でバリデーション済み（1:1 対応が保証されている）。

### 2.3 具体例

以下の紹介ペアが存在するとする：

| 紹介者 | 被紹介者 |
| ------ | -------- |
| A      | B        |
| C      | D        |
| E      | F        |
| G      | H        |
| I      | J        |
| K      | L        |

k-partition 2-opt の結果、被紹介者テーブルが次のように決まったとする：

```
被紹介者テーブル 1: B, D, F
被紹介者テーブル 2: H, J, L
```

このとき、後処理で自動導出される紹介者専用テーブルは：

```
紹介者専用テーブル 1: A, C, E   （被紹介者テーブル 1 に対応）
紹介者専用テーブル 2: G, I, K   （被紹介者テーブル 2 に対応）
```

**被紹介者テーブルと紹介者専用テーブルは、インデックスによって 1:1 対応している。**

### 2.4 紹介者専用テーブルの性質

紹介者専用テーブルは以下の性質を持つ：

- **テーブルサイズ**: 対応する被紹介者テーブルと同数になる（被紹介者テーブルが3人なら紹介者専用テーブルも3人）
- **最適化目的関数なし**: 紹介者専用テーブルは k-partition 2-opt の最適化対象ではない。被紹介者テーブルの副産物として機械的に決まる
- **ハード制約**: 「全紹介者が必ずいずれかの紹介者専用テーブルに配置される」は、ペアの1:1対応により自動充足される

---

## 3. アルゴリズムへの影響

### 3.1 k-partition 2-opt コア（変更なし）

`src/domain/matching/services/k-partition-2opt.service.ts` は**変更しない**。

コアアルゴリズムの入力・出力・制約・目的関数はすべて Issue #90 で確定した通りで固定される。

```
入力: 被紹介者のみの VoteSet + SeatPolicy + seed
出力: 被紹介者テーブルの TableAssignmentPlan
```

紹介者専用テーブルはアルゴリズムの**外部**で処理される。

### 3.2 後処理の位置づけ

紹介者専用テーブルの導出は `ComputeMatching` Use Case（`src/application/matching/ComputeMatching.ts`）の責務とする。

処理順序：

```
1. k-partition 2-opt を被紹介者のみで実行
   → 被紹介者テーブルの TableAssignmentPlan を得る

2. (後処理) 被紹介者テーブルの各テーブルについて、
   メンバーの被紹介者 ID → ペア紹介者 ID に変換して
   紹介者専用テーブルのメンバーリストを生成する

3. 被紹介者テーブルと紹介者専用テーブルをセットで保存する
```

コアアルゴリズムの純粋性（副作用なし・I/O なし）は後処理によって損なわれない。

---

## 4. 型定義（実装時の指針）

> 本節は実装時の参考であり、現時点では仕様上の記述に留める。実際の型定義は実装 PR で確定する。

### 4.1 追加が必要な型（src/domain/matching/types.ts への追加候補）

```ts
/**
 * 被紹介者テーブルと紹介者専用テーブルのペア
 * index により 1:1 対応を保証する
 */
interface TablePair {
  readonly index: number;
  readonly presenteeTable: {
    readonly members: readonly PresenteeId[];
    readonly seatCount: 3 | 4 | 5;
  };
  readonly presenterTable: {
    readonly members: readonly PresenterId[];
    readonly seatCount: 3 | 4 | 5; // presenteeTable.seatCount と同値
  };
}

/**
 * ComputeMatching の出力（被紹介者テーブル + 紹介者専用テーブルのセット）
 */
interface FullTableAssignmentPlan {
  readonly tablePairs: readonly TablePair[];
  readonly presenteeScore: number; // 被紹介者テーブルの最適化スコア（ログ・デバッグ用）
}
```

### 4.2 ペアマップ（後処理に必要）

```ts
/**
 * 被紹介者 ID → 紹介者 ID のマップ（1:1 対応）
 * ComputeMatching Use Case が entries テーブルから生成して後処理に渡す
 */
type PresenteeToPresentersMap = ReadonlyMap<PresenteeId, PresenterId>;
```

### 4.3 既存型への影響

`Participant`（`src/domain/matching/types.ts`）は Issue #90 / PR #70 で確定済み：

```ts
type ParticipantRole = 'presenter' | 'presentee';

interface Participant {
  readonly id: string;
  readonly role: ParticipantRole;
  readonly gender: Gender; // 'female' | 'male'
}
```

k-partition 2-opt コアに渡す `participants` は引き続き `role === 'presentee'` のみにフィルタしてから渡す。紹介者 ID の変換は後処理で行う。

---

## 5. DB 保存方針（実装時の指針）

> 本節は実装時の参考であり、現時点では仕様上の記述に留める。スキーマ変更は migration PR で確定する。

### 5.1 テーブル種別カラムの追加候補

既存の `event_tables` テーブルに `table_type` カラムを追加する。

```sql
ALTER TABLE event_tables
  ADD COLUMN table_type text NOT NULL DEFAULT 'presentee'
    CHECK (table_type IN ('presentee', 'presenter'));
```

### 5.2 seat_count 制約の更新候補

Issue #90 / PR #70 で確定した「被紹介者 N=5 のみ 5 人卓を例外許可」を保存できるように、`event_tables.seat_count` の CHECK 制約も 5 人卓に対応させる必要がある。

```sql
ALTER TABLE event_tables
  DROP CONSTRAINT IF EXISTS event_tables_seat_count_check;

ALTER TABLE event_tables
  ADD CONSTRAINT event_tables_seat_count_check
    CHECK (seat_count BETWEEN 3 AND 5);
```

実際に 5 人卓を作成できる条件（被紹介者 N=5 のみ）は、DB 制約ではなく ComputeMatching / TableRepository 側のアプリケーション制約として検証する。

### 5.3 対応関係の保存候補

被紹介者テーブルと紹介者専用テーブルの 1:1 対応を保存するため、`event_tables` テーブルに対応先テーブル ID を持たせる方針が考えられる。

```sql
ALTER TABLE event_tables
  ADD COLUMN paired_table_id uuid REFERENCES event_tables(id) ON DELETE SET NULL;
```

`presentee` テーブルの `paired_table_id` → 対応する `presenter` テーブルの ID
`presenter` テーブルの `paired_table_id` → 対応する `presentee` テーブルの ID

### 5.4 RLS への影響

| テーブル                         | 変更点                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| `event_tables` / `table_members` | `table_type = 'presenter'` の行について、紹介者本人のみが `SELECT` 可能なポリシーを追加する |
| 被紹介者テーブルの行             | 従来通り（自分のテーブルのメンバーのみ参照可能）、変更なし                                  |

---

## 6. 関数・Use Case（実装時の指針）

### 6.1 後処理関数（新規追加候補）

```
derivePresenterTables(
  presenteeAssignment: TableAssignmentPlan,
  pairMap: PresenteeToPresentersMap
): readonly PresenterTableAssignment[]
```

- **責務**: 被紹介者テーブルのメンバーリストを元に、紹介者専用テーブルのメンバーリストを生成する純粋関数
- **配置場所**: `src/domain/matching/services/` または `src/application/matching/`（副作用なし・純粋関数であれば Domain 層）
- **I/O**: なし（純粋関数）

### 6.2 ComputeMatching Use Case の変更点（概要）

既存フロー（Issue #90 §3.2 参照）に以下を追加：

```
(既存) k-partition-2-opt を被紹介者のみで実行
         ↓
(追加) derivePresenterTables で紹介者専用テーブルを生成
         ↓
(変更) TableRepository.saveAssignment に FullTableAssignmentPlan を渡す
       （被紹介者テーブルと紹介者専用テーブルを同一トランザクションで保存）
```

### 6.3 GetMyTable Use Case の変更点（概要）

`GetMyTable` は呼び出したユーザの `role` に応じて返すテーブルを切り替える：

- `role === 'presentee'` → `table_type = 'presentee'` のテーブルを返す（従来通り）
- `role === 'presenter'` → `table_type = 'presenter'` のテーブルを返す（新規）

---

## 7. テスト観点（実装時の指針）

> 本節は実装時の参考であり、現時点では仕様上の記述に留める。実際のテストコードは実装 PR で作成する。

### 7.1 後処理関数のユニットテスト

| ケース           | 検証内容                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| 基本ケース       | 被紹介者テーブルのメンバーに対応する紹介者が正しく配置されること                               |
| 1:1 対応検証     | `tablePairs[i].presenteeTable` と `tablePairs[i].presenterTable` の `seatCount` が一致すること |
| 全紹介者配置     | 全ての紹介者が必ずいずれかの紹介者専用テーブルに現れること（漏れなし・重複なし）               |
| ペアマップ整合性 | `PresenteeToPresentersMap` に存在しない被紹介者 ID が入力された場合にエラーを返すこと          |
| 純粋性           | 同じ入力に対して常に同じ出力を返すこと（副作用なし）                                           |

### 7.2 ComputeMatching 統合テスト（追加観点）

| ケース                          | 検証内容                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| 被紹介者/紹介者テーブル数の一致 | 保存後に `table_type = 'presentee'` の件数と `table_type = 'presenter'` の件数が等しいこと |
| ペア対応の保存                  | `paired_table_id` が正しくセットされ、双方向に参照できること                               |
| トランザクション原子性          | 後処理中にエラーが起きた場合、被紹介者テーブルも保存されないこと（ロールバック）           |

### 7.3 GetMyTable テスト（追加観点）

| ケース                           | 検証内容                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| 紹介者ユーザへの返却             | `role = 'presenter'` のユーザが紹介者専用テーブルのメンバー一覧を受け取れること       |
| 被紹介者テーブルへのアクセス拒否 | 紹介者が被紹介者テーブルのメンバー一覧を受け取れないこと（RLS / Use Case 内フィルタ） |

### 7.4 RLS テスト（追加観点）

| ケース                               | 検証内容                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| 紹介者専用テーブルの参照制限         | 自分が配置されていない紹介者専用テーブルの `table_members` を SELECT できないこと |
| 被紹介者への紹介者専用テーブル非公開 | 被紹介者が紹介者専用テーブルの情報を SELECT できないこと                          |

---

## 8. 未決定事項・決定が必要な点

本仕様書の時点で確定していない事項を列挙する。実装前にチームで合意する必要がある。

| 項目               | 選択肢                                                                                                    | 備考                               |
| ------------------ | --------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| UI 表示            | 紹介者が交流画面を開いたとき、紹介者専用テーブル番号を表示するか否か                                      | 現行の交流画面 UI 設計に影響する   |
| テーブル番号の体系 | 被紹介者テーブルと紹介者専用テーブルに通し番号を振るか、種別ごとに番号を振るか                            | 会場アナウンスや誘導表示に影響する |
| C レーンへの通知   | `mingling` フェーズ遷移時に、紹介者専用テーブル情報も Broadcast するか否か                                | C レーンとの調整事項               |
| B レーンへの影響   | `GetMyTable` の戻り値に `avatarPresetKey` が含まれる場合、紹介者専用テーブルにも VRM アバターを表示するか | B レーンとの調整事項               |

---

## 9. 既存仕様との差分サマリ

| 変更対象                       | 変更前（Issue #90 確定仕様）         | 変更後（本仕様追加後）                                                                                        |
| ------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| 紹介者の交流タイム             | ラウンジ/休憩エリアで自由行動        | 紹介者専用テーブルに自動配置                                                                                  |
| テーブル種別                   | 被紹介者テーブルのみ                 | 被紹介者テーブル + 紹介者専用テーブル（1:1 対応）                                                             |
| k-partition 2-opt アルゴリズム | 変更なし                             | **変更なし**（後処理として追加するのみ）                                                                      |
| ComputeMatching Use Case       | 被紹介者テーブルのみ保存             | 被紹介者テーブル + 紹介者専用テーブルを同一トランザクションで保存                                             |
| GetMyTable Use Case            | 被紹介者テーブルのみ返す             | role に応じて被紹介者/紹介者テーブルを返す                                                                    |
| DB テーブル                    | `event_tables`, `table_members` のみ | `event_tables.table_type` カラム追加、`event_tables.paired_table_id` 追加、`seat_count` の 5 人卓対応（候補） |
| RLS                            | 自テーブルのメンバーのみ参照可       | 紹介者専用テーブルの参照制限ポリシー追加                                                                      |

---

## 10. 参照

- PR #65 コメント（miyabi206, 2026-04-27）— 交流タイム仕様変更の合意内容
- PR #70 — gender 2値化・型定義刷新（`ParticipantRole` 追加）
- Issue #90 — Lane D 親 Issue（仕様 v2: 紹介者不参加・gender 2値化・ソフト制約化）
- [docs/tech_spec/05_d_voting_matching_epilogue.md](./05_d_voting_matching_epilogue.md) — 既存の D レーン技術仕様書
- `.claude/rules/matching-algorithm.md` — k-partition 2-opt ルール
- `.claude/rules/tomokoi-guardrails.md` — 不変量（紹介者不参加・RLS 必須 等）
- `.claude/rules/supabase-rls.md` — RLS パターン
