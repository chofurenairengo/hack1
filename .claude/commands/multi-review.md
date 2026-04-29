---
name: /multi-review
description: Agent Teams で 4 視点（コード品質 / セキュリティ / アーキテクチャ / パフォーマンス）を並列レビュー。変更内容に応じて専門エージェント（rls-auditor / matching-reviewer 等）を自動追加し、集約レポートを出力する。
---

# /multi-review [path...]

**用途**: PR 前・コードレビュー依頼前の多角的品質チェック。4 視点のエージェントを Agent Teams で**同時並列起動**し、最後に全結果を集約した単一レポートを出力する。

## 引数

| 呼び方 | スコープ |
|---|---|
| `/multi-review` | `git diff main...HEAD` — 現在ブランチの全変更 |
| `/multi-review src/domain/matching/` | 指定パス以下のファイル |
| `/multi-review src/app/ src/domain/` | 複数パスを空白区切りで指定 |

---

## 実行プロトコル

### Step 0: スコープ確定と専門エージェント判定

**引数なしの場合:**
```bash
git diff main...HEAD --name-only
git diff main...HEAD
```

**引数ありの場合:**
```bash
git diff main...HEAD --name-only -- <path...>
git diff main...HEAD -- <path...>
```

変更ファイル一覧から以下を判定し、追加起動する専門エージェントを決める:

| 条件 | 追加エージェント |
|---|---|
| `supabase/migrations/*.sql` を含む | `rls-auditor` |
| `src/domain/matching/**` または `src/application/matching/**` を含む | `matching-reviewer` |
| `src/infrastructure/ai/gemini/**` を含む | `gemini-prompt-reviewer` |
| `src/infrastructure/realtime/**` または `src/stores/realtime/**` を含む | `realtime-reviewer` |

---

### Step 1: 全エージェントを同時並列起動 (Agent Teams)

以下を **1 つの Agent Teams メッセージで全て同時に起動**する。

#### 常時起動 (4 エージェント)

1. **`code-quality-reviewer`** — コード品質 (TypeScript 厳格性 / イミュータブル / 関数サイズ / Server Action 規約)

   渡す情報:
   - 変更ファイル名一覧
   - `git diff main...HEAD` の出力 (または指定パスのファイル内容)
   - 「変更されたファイルを対象にコード品質レビューを実施してください」

2. **`security-reviewer`** — セキュリティ (シークレット / RLS / 投票秘匿 / XSS / CSRF / zod 検証)

   渡す情報:
   - 変更ファイル名一覧
   - `git diff main...HEAD` の出力
   - 「変更されたファイルを対象にセキュリティレビューを実施してください」

3. **`architecture-reviewer`** — アーキテクチャ (レーン境界 / Domain 純粋性 / Server-Client 境界 / DIP)

   渡す情報:
   - 変更ファイル名一覧
   - `git diff main...HEAD` の出力
   - 「変更されたファイルを対象にアーキテクチャレビューを実施してください」

4. **`performance-reviewer`** — パフォーマンス (N+1 / Realtime 負荷 / k-partition 計算量 / バンドルサイズ)

   渡す情報:
   - 変更ファイル名一覧
   - `git diff main...HEAD` の出力
   - 「変更されたファイルを対象にパフォーマンスレビューを実施してください」

#### 条件付き起動 (Step 0 の判定結果による)

5. **`rls-auditor`** (migration 変更時のみ) — RLS ポリシーの完全性
6. **`matching-reviewer`** (matching 変更時のみ) — k-partition 純粋性 / 決定性
7. **`gemini-prompt-reviewer`** (Gemini 変更時のみ) — 4 役割プロンプト構造
8. **`realtime-reviewer`** (Realtime 変更時のみ) — 4 チャンネル構成 / offline-first

---

### Step 2: 集約レポート出力

全エージェントの結果を受け取り、severity 別に統合して以下の形式で出力する:

```
## Multi-Review Report — YYYY-MM-DD HH:mm

> スコープ: <ブランチ差分 / 指定パス>
> 変更ファイル数: N件
> 起動エージェント: N個

---

### 🔥 Critical (N件) — マージ前に必須対応

- **[security]** `src/infrastructure/supabase/client.ts:12`: service role key が client に露出
  - リスク: RLS バイパス権限がブラウザに届く
  - 修正案: `client-admin.ts` に移動し `server-only` を import

- **[architecture]** `src/domain/matching/kPartition2Opt.ts:5`: Supabase import が Domain 層に混入
  - 影響: Domain 純粋性の破壊、テスト不能化
  - 修正案: Supabase アクセスを `src/application/matching/` に移動

---

### ⚠️ High (N件) — 対応推奨

- **[code-quality]** `src/app/actions/vote.ts:34`: Server Action に zod 検証なし
  ...

---

### 📌 Medium (N件) — 改善提案

- **[performance]** `src/components/features/avatar/AvatarCanvas.tsx:8`: R3F frameloop="always"
  - 修正案: `frameloop="demand"` に変更
  ...

---

### ℹ️ Low (N件) — 参考情報

...

---

### ✅ 問題なし

- code-quality: イミュータブル、命名規則、関数サイズ — OK
- security: シークレット混入なし — OK
- architecture: レーン境界、Domain 純粋性 — OK
- performance: N+1 なし — OK

---

### 起動したエージェント

| エージェント | 状態 | 備考 |
|---|---|---|
| code-quality-reviewer | ✅ 完了 | |
| security-reviewer | ✅ 完了 | |
| architecture-reviewer | ✅ 完了 | |
| performance-reviewer | ✅ 完了 | |
| rls-auditor | ✅ 完了 | migrations 変更を検出 |
| matching-reviewer | — スキップ | matching 変更なし |
| gemini-prompt-reviewer | — スキップ | Gemini 変更なし |
| realtime-reviewer | — スキップ | Realtime 変更なし |

### 総評

Critical N件 / High N件 / Medium N件 / Low N件

<マージ前の推奨アクション>
```

---

## 注意事項

- **読み取り専用**: このコマンドはコードを変更しない。指摘に基づいた修正は開発者が行う。
- **並列実行**: 全エージェントは同時起動のため、依存関係のあるレビュー (例: rls-auditor の結果を security が参照する) は含まれない。独立した視点での指摘が得られる。
- **差分レビュー**: `git diff` の出力を渡すため、変更のない既存コードへの指摘は含まれない場合がある。

## 関連コマンド

- `/feature-development` — 機能開発の全体フロー (plan → TDD → review → commit)
- `/rls-audit` — RLS のみの詳細監査
- `/match-test` — k-partition のテスト + ベンチマーク
- `/database-migration` — migration 作成 + RLS + 型再生成

## 関連エージェント

- [.claude/agents/code-quality-reviewer.md](../agents/code-quality-reviewer.md)
- [.claude/agents/security-reviewer.md](../agents/security-reviewer.md)
- [.claude/agents/architecture-reviewer.md](../agents/architecture-reviewer.md)
- [.claude/agents/performance-reviewer.md](../agents/performance-reviewer.md)
- [.claude/agents/rls-auditor.md](../agents/rls-auditor.md)
- [.claude/agents/matching-reviewer.md](../agents/matching-reviewer.md)
- [.claude/agents/gemini-prompt-reviewer.md](../agents/gemini-prompt-reviewer.md)
- [.claude/agents/realtime-reviewer.md](../agents/realtime-reviewer.md)
