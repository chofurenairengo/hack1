# トモコイ 技術仕様書 02 — メンバーA：スライド・管理

> メンバーAは **Phase 0 で基盤担当** → **Phase 1 以降でスライド・管理機能の専任** という2段構成です。
> 本ファイルは Phase 1 以降の作業仕様であり、Phase 0 については `01_基盤構築.md` を参照してください。

---

## 1. 担当範囲

### 1.1 機能スコープ

- スライド作成フロー全体（テンプレート選択 → 質問 → AI生成 → 編集 → 被紹介者確認 → 主催者審査 → 確定・公開）
- Gemini 3 Flash との連携（`@google/genai` SDK、構造化JSON出力、NGカテゴリ抑制）
- スライド本番レンダリングコンポーネント（Webレンダリング）
- PPTX エクスポート（お土産ダウンロード、Nice-to-have）
- 被紹介者確認画面
- 主催者管理画面（スライド審査、通報対応、イベント管理）
- 内面エピソード誘導UI（質問ガイダンス、具体性チェック、良い例/避けたい例）
- スライド内画像スロットのアップロード

### 1.2 スコープ外（他メンバー担当）

- プレゼン画面そのもの（スライド両脇のアバター配置 → B、スライド同期 → C）
- スタンプリアクション（C）
- 投票 → マッチング → チャット（D）
- VRM描画（B）

### 1.3 連携ポイント（要合意事項）

| 連携先 | 内容 | 期日 |
|-------|------|------|
| メンバーB | プレゼン画面のスライド描画領域サイズ・アバター両脇の配置座標 | Week 2 前半 |
| メンバーC | スライド同期 Broadcast のメッセージ仕様（現在ページ番号・アクティブペアID） | Week 1 終わりまで |
| メンバーD | 「盛り上がったで賞」表示をイベント終了画面に埋め込む枠 | Week 3 |

---

## 2. Domain層設計

### 2.1 エンティティ

`src/domain/slide/entities/` 配下に定義。

- **`SlideDeck`**：5枚1組のスライドデッキ。プレゼンペアに1つ紐づく
  - プロパティ：`id: SlideDeckId`、`presentationPairId: PresentationPairId`、`templateKey: string`、`slides: Slide[5]`、`status: SlideStatus`、`aiGeneratedAt: Date | null`、`introduceeConfirmedAt: Date | null`、`organizerApprovedAt: Date | null`
  - メソッド：`updateField(slideNumber, fieldKey, value): SlideDeck`、`submitForConfirmation(): SlideDeck`、`confirmByIntroducee(): SlideDeck`、`approveByOrganizer(): SlideDeck`、`rejectByOrganizer(reason): SlideDeck`
  - 不変条件：`slides.length === 5`、`status` 遷移は単方向（§2.3 参照）

- **`Slide`**：1枚分のスライド
  - プロパティ：`slideNumber: 1..5`、`theme: string`、`presenterScript: string`、`introduceeReaction: string`、`imageSlotIds: SlideImageId[]`、`regeneratedAt: Date | null`

- **`SlideReview`**：レビュー履歴（被紹介者・主催者共通）
  - プロパティ：`id`、`slideDeckId`、`reviewerRole: 'introducee' | 'organizer'`、`reviewerUserId`、`decision`、`reason`、`createdAt`

### 2.2 値オブジェクト

`src/domain/slide/value-objects/` 配下に定義。

- **`SlideTemplate`**：テンプレート種別。キー + 表示名 + 各スライドの質問リスト
- **`SlideStatus`**：`draft` / `pending_introducee` / `pending_organizer` / `approved` / `rejected`
- **`NgCategory`**：`appearance`（容姿）/ `spec`（スペック）/ `harassment`（ハラスメント）

### 2.3 状態遷移図

```
draft
  ↓ submitForConfirmation()
pending_introducee
  ↓ confirmByIntroducee()          ↓ rejectByIntroducee()  （辞退）
pending_organizer                   rejected
  ↓ approveByOrganizer()            ↑
approved                            │ rejectByOrganizer()
                                    │
  ↓ （差し戻しは draft に戻す）← ────
```

各遷移は Use Case の中で呼び出され、不正遷移はドメインエラー（`InvalidStateTransitionError`）を返す。

### 2.4 ドメインサービス

**`NgDetectionService`**：NGカテゴリの簡易検出

- 入力：スライドテキスト（紹介者セリフ + 被紹介者リアクション）
- 出力：検出されたNGカテゴリの列挙
- 実装：禁止ワードリスト（`src/shared/constants/ng-words.ts`）との部分一致 + 正規表現
- 用途：主催者画面で「AI検出：疑いあり」のヒント表示に使う（人力チェックの補助、置き換えではない）

### 2.5 リポジトリインターフェース

**`SlideDeckRepository`**（`src/domain/slide/repositories/slide-deck.repository.ts`）：

- `findById(id: SlideDeckId): Promise<SlideDeck | null>`
- `findByPresentationPairId(pairId: PresentationPairId): Promise<SlideDeck | null>`
- `findPendingOrganizerReview(): Promise<SlideDeck[]>`（主催者画面用）
- `save(deck: SlideDeck): Promise<void>`
- `delete(id: SlideDeckId): Promise<void>`

---

## 3. Application層設計

### 3.1 Use Case 一覧

`src/application/slide/` 配下。

| Use Case | 入力 | 出力 | 備考 |
|---------|------|------|------|
| `GenerateSlideDeckUseCase` | `{ pairId, templateKey, answers: Record<slideNumber, answerText> }` | `SlideDeckDTO` | 初回のAI生成。`status=draft` で保存 |
| `RegenerateFieldUseCase` | `{ deckId, slideNumber, fieldKey }` | `FieldDTO` | 1フィールドだけ再生成 |
| `UpdateSlideFieldUseCase` | `{ deckId, slideNumber, fieldKey, value }` | `SlideDeckDTO` | 手動編集 |
| `UploadSlideImageUseCase` | `{ deckId, slideNumber, slotIndex, fileBlob }` | `SlideImageDTO` | 画像スロットへのアップロード |
| `SubmitForConfirmationUseCase` | `{ deckId }` | `SlideDeckDTO` | `draft → pending_introducee` |
| `ConfirmByIntroduceeUseCase` | `{ deckId, decision, reason? }` | `SlideDeckDTO` | 承認 / 修正依頼 / 辞退 |
| `ApproveByOrganizerUseCase` | `{ deckId }` | `SlideDeckDTO` | 主催者承認 |
| `RejectByOrganizerUseCase` | `{ deckId, ngCategory, reason }` | `SlideDeckDTO` | 差し戻し |
| `ExportPptxUseCase` | `{ deckId }` | `PptxFileDTO` | PPTX生成（Week 3 後半以降） |

### 3.2 外部ポート

`src/application/shared/ports/` に以下の抽象インターフェースを定義：

- **`AiGeneratorPort`**：Gemini 抽象。`generateSlideDeck(template, answers)` / `regenerateField(context)` を持つ
- **`PptxExporterPort`**：PPTX 抽象。`export(deck, imageUrls)` でバイナリを返す
- **`SignedUrlIssuerPort`**：画像アップロードのサイン付きURL発行抽象
- **`EmailSenderPort`**：メール送信抽象。被紹介者への確認依頼通知、主催者への差し戻し通知

Application 層から見るとこれらはインターフェース。実装は Infrastructure 層で対応する Adapter を書く（§4 参照）。

### 3.3 入出力 DTO

- `SlideDeckDTO`：エンティティをシリアライズしたクライアント返却用
- `FieldDTO`：`{ slideNumber, fieldKey, value }`
- `PptxFileDTO`：`{ base64: string, fileName: string }` または Readable Stream

---

## 4. Infrastructure層設計

### 4.1 Supabase Repository 実装

**`SupabaseSlideDeckRepository`**（`src/infrastructure/supabase/repositories/supabase-slide-deck.repository.ts`）：

- コンストラクタで `SupabaseClient` を受け取る
- `findById` は `slide_decks` から `id` で取得 → `content_json` をエンティティに変換
- `save` はエンティティを `slide_decks.content_json` に JSON シリアライズして UPSERT
- `findPendingOrganizerReview` は `status='pending_organizer'` の行を `created_at asc` で取得

### 4.2 Gemini Adapter

**`GeminiSlideGeneratorAdapter`**（`src/infrastructure/ai/gemini-slide-generator.adapter.ts`）：

- `AiGeneratorPort` を実装
- `@google/genai` SDK の `GoogleGenAI` クライアントを初期化
- モデル：`gemini-3-flash-preview`
- 設定：
  - `responseMimeType: 'application/json'`
  - `responseSchema`：5枚分のスライド構造（§4.3）
  - `thinkingLevel: 'minimal'`
  - `temperature: 0.8`（創造性とブレをバランス）
- プロンプトは `src/infrastructure/ai/prompts/slide-generation.prompt.ts` に分離
- エラー時（API障害・レート制限）は `AiGenerationError` を投げ、Use Case 側でフォールバック処理（プレースホルダ埋めに戻す）

### 4.3 Gemini `responseSchema` の構造（概念）

- `slides`：配列、長さ5
  - 各要素：`slideNumber`（1〜5整数）、`presenterScript`（日本語、100〜200字目安）、`introduceeReaction`（日本語、20〜60字目安）
- すべて必須フィールド

### 4.4 Gemini プロンプト方針

システムプロンプトの骨子：

- 役割：掛け合い誘発型スライドの「整形役」、語り手は紹介者
- NGカテゴリ：容姿描写（身長・体重・顔立ち）、スペック（学歴・年収・職場名・車）を明示的に禁止
- 出力言語：日本語のみ
- 一文の長さ：口頭ピッチ用に短めに整形
- 紹介者回答が抽象形容詞（優しい・面白い等）だけの場合、具体化を促す出力を返す（§7.5 参照）
- JSON以外を出力しない（`responseMimeType` で強制されるが、プロンプト上も明示）

### 4.5 PPTX Adapter

**`PptxGenJsExporterAdapter`**（`src/infrastructure/pptx/pptxgenjs-exporter.adapter.ts`）：

- `PptxExporterPort` を実装
- `pptxgenjs` を使い、テンプレに応じた基本レイアウトで5枚生成
- 日本語フォント：`public/fonts/NotoSansJP-*.ttf` をプレゼンテーションに埋め込み
- 画像スロットは Supabase Storage のパブリックURLからフェッチして PPTX に埋め込み
- 生成結果は Readable Stream として返し、Server Action から直接レスポンスで返す
- Server Action 経由で呼び出すため Node.js ランタイム（`export const runtime = 'nodejs'`）を明示

### 4.6 Storage Adapter

**`SlideImageStorageAdapter`**（`src/infrastructure/storage/slide-image.adapter.ts`）：

- `slide-images` バケットへのアップロード
- アップロード時に画像形式検証（JPEG/PNG/WebP のみ）とサイズ制限（5MB以下）
- パス規則：`slide-images/<deckId>/<slideNumber>/<slotIndex>/<uuid>.ext`

---

## 5. Server Action 実装

### 5.1 ファイル配置

`src/app/actions/slide/` 配下。§11 の共通規約に準拠。

### 5.2 主要 Action

- `generateDeck(input)`：`GenerateSlideDeckUseCase` を呼ぶ
- `updateField(input)`：`UpdateSlideFieldUseCase`
- `regenerateField(input)`：`RegenerateFieldUseCase`
- `uploadImage(input)`：`UploadSlideImageUseCase`（FormData を受け取る）
- `submitForConfirmation(input)`：`SubmitForConfirmationUseCase`
- `confirmByIntroducee(input)`：`ConfirmByIntroduceeUseCase`
- `approveByOrganizer(input)`：管理者権限チェック → `ApproveByOrganizerUseCase`
- `rejectByOrganizer(input)`：管理者権限チェック → `RejectByOrganizerUseCase`
- `exportPptx(input)`：`ExportPptxUseCase`、バイナリをレスポンスで返す

### 5.3 認可ロジック

- 紹介者自身のデッキのみ更新可：`auth.uid() === presenter_user_id` を Use Case 内で確認
- 被紹介者は自分がペアになっているデッキのみ確認可
- 主催者は `users.is_admin=true` のみ審査 Action 実行可

---

## 6. UI・画面設計

### 6.1 画面一覧

| パス | 画面 | 主要コンポーネント |
|------|------|----------------|
| `/slides/new` | テンプレート選択 + 質問入力 | `TemplatePicker`、`QuestionForm` |
| `/slides/[deckId]/edit` | フィールド編集 + 再生成 + 画像アップロード | `SlideEditor`、`FieldEditor`、`ImageSlotUploader` |
| `/slides/[deckId]/preview` | 本番レンダリングのプレビュー | `SlideRenderer` |
| `/slides/[deckId]/confirm` | 被紹介者確認画面 | `SlideRenderer`、`ConfirmActions` |
| `/admin/slides` | 主催者審査一覧 + 詳細 | `ReviewQueue`、`ReviewPanel` |
| `/admin/reports` | 通報対応（メンバーDと共用設計、Aが枠組み提供） | `ReportList` |
| `/admin/events` | イベント管理（一覧・作成） | `EventForm`、`EventList` |

### 6.2 SlideRenderer（本番レンダリング）

- **これはイベント当日のプレゼン画面でも再利用される重要コンポーネント**
- プロパティ：`deck: SlideDeckDTO`、`currentSlide: number`、`mode: 'preview' | 'live'`
- `mode='live'` の場合：スライド同期 Broadcast（C担当）から `currentSlide` を受け取る
- 画像は Supabase Storage のパブリック URL を `<img>` で表示
- レイアウトは Tailwind + CSS Grid で固定アスペクト比（16:9）
- メンバーBがアバター両脇表示を加える際、このコンポーネントが中央に配置される

### 6.3 QuestionForm（内面エピソード誘導UI）

- 各スライドに対応した質問 3〜5個
- 質問下に以下を常時表示：
  - ガイダンステキスト：「容姿・スペックではなく、具体エピソードを書いてください」
  - 良い回答例・避けてほしい回答例（折りたたみ展開）
  - 文字数カウンタ（下限 20 文字推奨、超過警告はなし）
- 抽象形容詞のみの検出：
  - クライアントサイドで `src/shared/constants/abstract-adjectives.ts` のリストと照合
  - 該当したら赤字ヒント「もう少し具体的に書けますか？」を表示（ブロックはしない）

### 6.4 FieldEditor

- 各スライド × 各フィールド（紹介者セリフ / 被紹介者リアクション）単位でテキストエリア
- 右下に「AI再生成」ボタン → `regenerateField` Action を呼ぶ
- 編集中は debounce 800ms でオートセーブ（`updateField`）

### 6.5 ImageSlotUploader

- ドラッグ&ドロップ + クリック選択
- アップロード前にクライアント側で画像形式・サイズ検証
- プログレス表示
- 画像プレビュー（Storage のパブリック URL）

### 6.6 ReviewPanel（主催者審査）

- 左：スライドプレビュー（SlideRenderer）
- 右：操作パネル
  - NG検出ヒント（`NgDetectionService` の結果、Infrastructure から Use Case 経由で取得）
  - 承認ボタン
  - 差し戻しフォーム：NGカテゴリ選択 + 理由テキスト
- 差し戻し時にメール送信（`EmailSenderPort`）

---

## 7. 内面エピソード誘導UI の詳細設計

### 7.1 設計原則

- 要件定義書 §7.3.5 の4段構成に準拠：
  1. 質問ガイダンステキスト
  2. 回答の具体性チェック（クライアント側）
  3. エピソード誘導プロンプト（各質問のコツ）
  4. AI側のガイダンス（Geminiプロンプト）

### 7.2 抽象形容詞リストの運用

- `src/shared/constants/abstract-adjectives.ts` に初期リストを置く（優しい・面白い・いい人・素敵 等）
- Week 2 の中間発表フィードバックを踏まえて Week 3 前半にチューニング
- 誤検出が多い場合は「単独出現時のみ検出」などの条件を調整

### 7.3 良い例・避けてほしい例

- テンプレート毎・スライド毎に複数バリエーションを保持
- `src/shared/constants/question-examples.ts` に構造化して配置
- デモデーでも「良い例」を見せられるよう、内容を審査員向けに練る

### 7.4 AI 側の誘導（再掲）

抽象形容詞のみの回答を受け取った場合、Gemini は **容姿・スペックには絶対に向かわず、「具体エピソードが提示されていない」と示唆する文面** で整形する。これによりユーザーは再編集で具体化するインセンティブを持つ。

プロンプト上の指示例（要件定義書 §7.3.5 準拠）：

> 紹介者の回答が抽象的な形容詞のみの場合、容姿やスペックの方向には絶対に向かわず、「具体的なエピソードがあると魅力がもっと伝わります」と示唆するセリフに整形せよ。

### 7.5 UI の実装箇所

- `src/infrastructure/ui/components/slide/question-form.tsx`
- `src/infrastructure/ui/hooks/use-abstract-adjective-detection.ts`

---

## 8. PPTX エクスポート（Nice-to-have）

### 8.1 実装範囲

- テンプレに応じた基本レイアウト5枚
- タイトル・紹介者セリフ・被紹介者リアクション想定をテキストボックスに配置
- 画像スロットは画像を埋め込み（Slide 2 / 4 / 5）
- フォントは Noto Sans JP を埋め込み

### 8.2 実装タイミング

- Week 3 後半の Nice-to-have
- 本番機能（スライド生成・本番レンダリング）が安定していれば実装
- 時間切れの場合は Phase 2 送りで可

### 8.3 ダウンロード導線

- `/slides/[deckId]/edit` 画面の「PPTXダウンロード」ボタン
- `status=approved` のときのみ有効化
- Server Action 経由でバイナリ返却 → `<a download>` で保存

### 8.4 障害対応

- 日本語フォント埋め込みに失敗した場合はシステムフォントにフォールバック
- 画像フェッチに失敗した画像スロットは空白にして続行
- いずれも本番に影響しない（本番はWebレンダリング）

---

## 9. 主催者管理画面

### 9.1 画面構成

- `/admin/slides`：`status=pending_organizer` のデッキ一覧 + 差し戻し履歴
- `/admin/events`：イベント一覧・作成・編集
- `/admin/reports`：通報一覧（メンバーDがチャット通報まわりの本体を書くが、枠組みはAが提供）

### 9.2 認可

- `(admin)` レイアウトで `users.is_admin=true` をガード
- Service Role Key はサーバー側でのみ使用、UI からは触らない

### 9.3 MVP 運用ポリシー

- 開発チーム = 運営として、5/9・5/10 のデモ当日は交代で監視
- スライド審査はイベント開始6時間前を締切にする（運用上の目安）

---

## 10. 他メンバーとの連携点

### 10.1 メンバーB（アバター）

- **プレゼン画面のスライド描画領域サイズ** を Week 2 前半に合意
- `SlideRenderer` を Page 側で呼び出す際、`AvatarStage` が両脇（左：紹介者、右：被紹介者）に並ぶレイアウトを B が実装
- スライドのアスペクト比固定（16:9）を維持する前提で、アバター側のサイズを B が調整

### 10.2 メンバーC（リアルタイム）

- スライド同期 Broadcast のメッセージ仕様：
  - チャンネル：`event:slide-sync:<eventId>`
  - メッセージ例：`{ kind: 'slide-change', pairId, currentSlide }`、`{ kind: 'pair-change', nextPairId }`
- Week 1 終わりまでに C と合意、`src/shared/types/broadcast.ts` に型定義
- `SlideRenderer` は `mode='live'` のとき `useRealtimeChannel(...)` でメッセージを購読（C が hook を提供）

### 10.3 メンバーD（事後）

- イベント終了画面に「盛り上がったで賞」表示枠を配置
- A は画面枠を用意、D が表彰結果を埋める
- マッチ成立通知メールのテンプレートは D が作るが、運営メール（スライド差し戻し等）のテンプレ基盤は A が整備しておく

---

## 11. DB/API スキーマ（担当範囲）

### 11.1 使用するテーブル

- `slide_decks`（CRUD）
- `slide_images`（INSERT / SELECT）
- `slide_reviews`（INSERT / SELECT）
- `presentation_pairs`（SELECT のみ、基盤担当が初期化済み）
- `entries`（SELECT のみ）
- `reports`（SELECT / UPDATE、管理画面用）

### 11.2 RLS ポリシー（確認項目）

- `slide_decks`：
  - SELECT：紹介者・被紹介者・同イベント参加者（ライブ中）・管理者
  - UPDATE：紹介者 かつ `status='draft'`
- `slide_reviews`：
  - SELECT：紹介者・被紹介者・レビュアー・管理者
  - INSERT：被紹介者（自分担当分）・管理者

§7（RLS）の基盤担当設定を踏襲、Phase 1 で齟齬があれば基盤担当（自分）として調整。

---

## 12. テスト方針

### 12.1 ユニットテスト

- `SlideDeck` の状態遷移（各遷移の成功・失敗）
- `NgDetectionService` の禁止ワード検出
- `GenerateSlideDeckUseCase`（Gemini モック、Repository モック）
- `UpdateSlideFieldUseCase` の認可判定

### 12.2 インテグレーションテスト

- Gemini 実 API を叩くテストは CI では回さず、ローカルで手動確認
- Supabase Repository の CRUD は Dev プロジェクトに対してインテグレーションテスト

### 12.3 手動検証

- 被紹介者確認フローは手動シナリオテスト（Week 2 後半）
- 主催者審査フローも手動（Week 3 前半）
- PPTX の日本語レンダリング確認（Week 3 後半、実装した場合のみ）

---

## 13. スケジュール対応

| Week | タスク |
|------|--------|
| Week 1（4/16-4/19、Day 4-7） | 基盤引き継ぎ後、Gemini SDK 素振り、テンプレ5枚構成確定、質問リスト草案 |
| Week 2（4/20-4/26） | スライド生成〜編集UI 一通り、Gemini 統合、内面エピソード誘導UI、4/25 中間発表 |
| Week 3（4/27-5/3） | 被紹介者確認画面、主催者管理画面、本番レンダリング、画像スロット。後半で PPTX エクスポート着手（可能なら） |
| Week 4（5/4-5/10） | 連携テスト、バグ修正、デモ脚本用スライドの準備、管理者運用手順書 |

---

## 14. 参照

- 要件定義書 `tomokoi_spec_v5_3.md` §6.8（スライド作成方針）§7.3（スライド作成機能）§7.3.5（内面エピソード誘導）§8.5（AI / 生成系）§8.6（ストレージ・PPTX）§9.2（役割分担）
- 本技術仕様書 `00_概要.md` §4（クリーンアーキテクチャ方針）§5.2（役割分担）
- 本技術仕様書 `01_基盤構築.md` §3（ディレクトリ構造）§6.3（スライド系テーブル）§7（RLS）§11（Server Action 規約）
- 本技術仕様書 `03_メンバーB_アバター.md` §5（プレゼン画面レイアウト連携）
- 本技術仕様書 `04_メンバーC_リアルタイム.md` §5（スライド同期 Broadcast 仕様）
- 本技術仕様書 `05_メンバーD_投票・マッチング・事後.md` §9（アワード表示連携）
- Google Gen AI SDK（`@google/genai`）公式ドキュメント
- pptxgenjs 公式ドキュメント
- Next.js 14 App Router 公式ドキュメント（Server Action）

---
