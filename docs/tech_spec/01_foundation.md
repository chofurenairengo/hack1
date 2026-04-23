# トモコイ 技術仕様書 01 — 基盤構築

> 本ファイルは **Phase 0（Day 1-3）の基盤構築担当（メンバーA）** の作業指針であり、同時に **B/C/D が Phase 1 以降に参照する共通基盤のリファレンス** です。
> Phase 0 終了時点で本ファイルに書かれた内容がすべて実装・合意されていることを確認してから並列開発に入ります。

---

## 1. 基盤構築担当の責務とスコープ

### 1.1 責務

基盤担当（メンバーA）は Phase 0 の3日間で以下を完了させ、他3名が **待ち時間ゼロで並列着手できる状態** を作ります。

- リポジトリ初期化と依存ライブラリインストール
- ディレクトリ構造（クリーンアーキテクチャ3層）の物理的な雛形作成
- Supabase プロジェクトの作成・環境変数配布
- **DBスキーマ全テーブル**のマイグレーション投入
- **RLS ポリシー**の全テーブル分設定
- 認証基盤（Supabase Auth）の配線
- Server Action 規約・Repository パターン規約・エラー型の共通基盤整備
- Realtime チャンネル命名規則の決定
- Storage バケット作成と RLS 設定
- **CI/CD パイプライン**構築（GitHub Actions + Vercel + Supabase CLI）
- Git 運用ルール・PR テンプレ・コミット規約の文書化
- 引き渡しチェックリストの完了確認

### 1.2 スコープ外

以下は基盤担当が **やらない** こと（各メンバーが自分の担当範囲で設計する）：

- ドメインごとのエンティティの具体定義（例：Slide エンティティの詳細は A が Phase 2 以降で実装）
- ドメインごとの Use Case の具体実装
- UI の具体的なコンポーネント実装
- VRM / MediaPipe / WebRTC / Realtime の具体的な Adapter 実装

基盤担当は **ひな形（skeleton）とルール（convention）** を提供するところまでが責務です。

### 1.3 タイムライン

| 日 | タスク |
|----|--------|
| Day 1（4/13） | リポジトリ初期化、依存ライブラリ確定、ディレクトリ構造作成、Supabase プロジェクト作成、認証配線 |
| Day 2（4/14） | DBスキーマ全テーブル投入、RLS 設定、Storage バケット作成、Realtime チャンネル設計、Repository 規約、**クロスメンバー enum の値確定（§10.4.2）** |
| Day 3（4/15） | Server Action 規約、共通エラー型、**クロスメンバー Payload 型・Branded ID 型の確定（§10.4.1 / §10.4.3 / §10.4.4）**、CI/CD パイプライン、PR テンプレ、ドキュメント整備、引き渡しチェックリスト |

Day 4 以降は Phase 1 に入り、メンバーAは **自分の担当領域（スライド・管理）** に専念します。

---

## 2. リポジトリセットアップ

### 2.1 リポジトリ構成

- 単一リポジトリ（モノレポ不要）
- GitHub Organization 管理
- ブランチ保護：`main` は直接 push 禁止、PR 経由必須
- デフォルトブランチ：`main`

### 2.2 初期化コマンド

```
pnpm create next-app@latest tomokoi --typescript --tailwind --app --src-dir --import-alias "@/*"
cd tomokoi
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add @google/genai
pnpm add three @pixiv/three-vrm @react-three/fiber @react-three/drei
pnpm add @mediapipe/tasks-vision
pnpm add pptxgenjs
pnpm add resend
pnpm add zod
pnpm add -D @types/three
pnpm add -D eslint-config-prettier prettier
pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
pnpm add -D @playwright/test
pnpm dlx shadcn-ui@latest init
```

### 2.3 Node.js / pnpm バージョン

- Node.js `20.x` LTS（Vercel の既定に合わせる）
- pnpm `9.x`
- `.nvmrc` と `package.json` の `engines` フィールドで固定
- `pnpm-lock.yaml` は Git 管理対象

---

## 3. ディレクトリ構造（完全版）

下のツリーが **Phase 0 終了時点でリポジトリに存在すべき全ディレクトリ** です。空ディレクトリには `.gitkeep` を置きます。

```
tomokoi/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                              # lint / typecheck / test / build
│   │   └── db-migration.yml                    # Supabase マイグレーション適用
│   ├── pull_request_template.md
│   └── CODEOWNERS
├── .vscode/
│   ├── settings.json                           # ESLint / Prettier on save
│   └── extensions.json
├── .husky/
│   └── pre-commit                              # lint-staged 実行
├── docs/                                       # 本技術仕様書群
│   ├── 00_概要.md
│   ├── 01_基盤構築.md
│   ├── 02_メンバーA_スライド・管理.md
│   ├── 03_メンバーB_アバター.md
│   ├── 04_メンバーC_リアルタイム.md
│   └── 05_メンバーD_投票・マッチング・事後.md
├── public/
│   ├── vrm/                                    # VRMアセット（B担当が Week 2 前半までに配置）
│   │   ├── preset-01.vrm
│   │   └── ...
│   ├── mediapipe/                              # MediaPipe モデルファイル
│   │   └── face_landmarker.task
│   └── fonts/
│       └── NotoSansJP-*.ttf                    # PPTXエクスポート用
├── src/
│   ├── app/                                    # Next.js App Router（UI入口、Infrastructure扱い）
│   │   ├── (public)/                           # 未認証エリア
│   │   │   ├── page.tsx                        # ランディング
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (app)/                              # 認証必須エリア
│   │   │   ├── layout.tsx                      # 認証ガード
│   │   │   ├── events/
│   │   │   │   ├── page.tsx                    # イベント一覧
│   │   │   │   └── [eventId]/
│   │   │   │       ├── page.tsx                # イベント詳細 / エントリー
│   │   │   │       └── live/
│   │   │   │           ├── page.tsx            # イベント当日進行
│   │   │   │           ├── presenting/
│   │   │   │           ├── voting/
│   │   │   │           └── breakout/
│   │   │   ├── slides/
│   │   │   │   ├── new/page.tsx                # テンプレート選択→質問
│   │   │   │   └── [deckId]/
│   │   │   │       ├── edit/page.tsx
│   │   │   │       ├── preview/page.tsx
│   │   │   │       └── confirm/page.tsx        # 被紹介者確認画面
│   │   │   ├── matches/
│   │   │   │   └── page.tsx                    # マッチ結果一覧
│   │   │   ├── chat/
│   │   │   │   └── [matchId]/page.tsx          # 1:1 チャット
│   │   │   └── settings/
│   │   │       ├── profile/page.tsx
│   │   │       └── photo/page.tsx              # 顔写真非公開アップロード
│   │   ├── (admin)/                            # 管理者エリア
│   │   │   ├── layout.tsx                      # 管理者認可ガード
│   │   │   ├── slides/page.tsx                 # スライド審査画面
│   │   │   ├── reports/page.tsx                # 通報対応
│   │   │   └── events/page.tsx                 # イベント管理
│   │   ├── actions/                            # Server Actions（ドメイン別）
│   │   │   ├── auth/
│   │   │   │   ├── sign-up.action.ts
│   │   │   │   └── sign-in.action.ts
│   │   │   ├── event/
│   │   │   │   ├── list-events.action.ts
│   │   │   │   ├── get-event.action.ts
│   │   │   │   └── enter-event.action.ts
│   │   │   ├── slide/
│   │   │   │   ├── generate-deck.action.ts
│   │   │   │   ├── update-field.action.ts
│   │   │   │   ├── regenerate-field.action.ts
│   │   │   │   ├── upload-image.action.ts
│   │   │   │   ├── submit-for-confirmation.action.ts
│   │   │   │   ├── confirm-by-introducee.action.ts
│   │   │   │   ├── approve-by-organizer.action.ts
│   │   │   │   ├── reject-by-organizer.action.ts
│   │   │   │   └── export-pptx.action.ts
│   │   │   ├── vote/
│   │   │   │   └── submit-vote.action.ts
│   │   │   ├── match/
│   │   │   │   ├── compute-matching.action.ts
│   │   │   │   ├── get-my-table.action.ts
│   │   │   │   └── agree-to-match.action.ts
│   │   │   ├── stamp/
│   │   │   │   ├── send-stamp.action.ts        # Broadcast経由が主だが統計用
│   │   │   │   └── aggregate-stamps.action.ts
│   │   │   ├── recommend/
│   │   │   │   └── set-recommendation-flag.action.ts
│   │   │   ├── chat/
│   │   │   │   ├── send-message.action.ts
│   │   │   │   ├── list-messages.action.ts
│   │   │   │   ├── report-message.action.ts
│   │   │   │   └── block-user.action.ts
│   │   │   └── photo/
│   │   │       ├── upload-profile-photo.action.ts
│   │   │       ├── consent-to-reveal.action.ts
│   │   │       ├── revoke-reveal.action.ts
│   │   │       └── request-reveal-url.action.ts
│   │   ├── api/                                # Route Handler（Webhookなど特殊用途のみ）
│   │   │   └── webhooks/
│   │   │       └── supabase/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── error.tsx
│   ├── domain/                                 # Domain層
│   │   ├── user/
│   │   │   ├── entities/
│   │   │   │   ├── user.entity.ts
│   │   │   │   └── profile.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── gender.vo.ts
│   │   │   │   ├── age.vo.ts
│   │   │   │   └── nickname.vo.ts
│   │   │   └── repositories/
│   │   │       └── user.repository.ts           # インターフェース
│   │   ├── event/
│   │   │   ├── entities/
│   │   │   │   ├── event.entity.ts
│   │   │   │   ├── entry.entity.ts
│   │   │   │   └── presentation-pair.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   └── entry-type.vo.ts             # presenter_pair / audience
│   │   │   └── repositories/
│   │   │       ├── event.repository.ts
│   │   │       └── entry.repository.ts
│   │   ├── slide/
│   │   │   ├── entities/
│   │   │   │   ├── slide-deck.entity.ts
│   │   │   │   ├── slide.entity.ts
│   │   │   │   ├── slide-field.entity.ts
│   │   │   │   └── slide-review.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── slide-template.vo.ts
│   │   │   │   ├── ng-category.vo.ts
│   │   │   │   └── slide-status.vo.ts           # draft / pending / approved / rejected
│   │   │   ├── services/
│   │   │   │   └── ng-detection.service.ts      # NGカテゴリ検出ドメインサービス
│   │   │   └── repositories/
│   │   │       └── slide-deck.repository.ts
│   │   ├── avatar/
│   │   │   ├── entities/
│   │   │   │   └── avatar-preset.entity.ts
│   │   │   └── value-objects/
│   │   │       └── blend-shape-key.vo.ts
│   │   ├── matching/
│   │   │   ├── entities/
│   │   │   │   ├── vote.entity.ts
│   │   │   │   ├── table.entity.ts
│   │   │   │   └── recommendation.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── vote-priority.vo.ts
│   │   │   │   └── table-composition.vo.ts      # 2:2 / 2:1 / 1:2 の男女比
│   │   │   └── services/
│   │   │       └── k-partition-2opt.service.ts  # マッチングアルゴリズム本体
│   │   ├── stamp/
│   │   │   ├── entities/
│   │   │   │   └── stamp-event.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   └── stamp-kind.vo.ts              # 🤝✨😂👏
│   │   │   └── repositories/
│   │   │       └── stamp.repository.ts
│   │   ├── chat/
│   │   │   ├── entities/
│   │   │   │   ├── match.entity.ts
│   │   │   │   ├── message.entity.ts
│   │   │   │   ├── photo-consent.entity.ts
│   │   │   │   └── report.entity.ts
│   │   │   └── repositories/
│   │   │       ├── match.repository.ts
│   │   │       ├── message.repository.ts
│   │   │       └── photo-consent.repository.ts
│   │   └── shared/
│   │       ├── errors/
│   │       │   ├── domain-error.ts
│   │       │   ├── not-found.error.ts
│   │       │   ├── forbidden.error.ts
│   │       │   └── validation.error.ts
│   │       └── types/
│   │           ├── result.ts                   # Result<T, E> 型
│   │           └── id.ts                        # ブランド型 UserId / EventId 等
│   ├── application/                            # Application層（Use Case）
│   │   ├── auth/
│   │   ├── event/
│   │   │   ├── list-events.use-case.ts
│   │   │   ├── get-event-detail.use-case.ts
│   │   │   └── enter-event.use-case.ts
│   │   ├── slide/
│   │   │   ├── generate-slide-deck.use-case.ts
│   │   │   ├── regenerate-field.use-case.ts
│   │   │   ├── update-slide-field.use-case.ts
│   │   │   ├── upload-slide-image.use-case.ts
│   │   │   ├── submit-for-confirmation.use-case.ts
│   │   │   ├── confirm-by-introducee.use-case.ts
│   │   │   ├── approve-by-organizer.use-case.ts
│   │   │   ├── reject-by-organizer.use-case.ts
│   │   │   └── export-pptx.use-case.ts
│   │   ├── vote/
│   │   │   └── submit-vote.use-case.ts
│   │   ├── matching/
│   │   │   ├── compute-matching.use-case.ts
│   │   │   └── get-my-table.use-case.ts
│   │   ├── stamp/
│   │   │   ├── record-stamp.use-case.ts
│   │   │   └── aggregate-stamps.use-case.ts
│   │   ├── recommend/
│   │   │   └── set-recommendation-flag.use-case.ts
│   │   ├── chat/
│   │   │   ├── send-message.use-case.ts
│   │   │   ├── list-messages.use-case.ts
│   │   │   ├── report-message.use-case.ts
│   │   │   └── block-user.use-case.ts
│   │   ├── photo/
│   │   │   ├── upload-profile-photo.use-case.ts
│   │   │   ├── consent-to-reveal.use-case.ts
│   │   │   ├── revoke-reveal.use-case.ts
│   │   │   └── request-reveal-url.use-case.ts
│   │   └── shared/
│   │       ├── dto/                            # 入出力 DTO
│   │       └── ports/                          # 外部サービスの抽象インターフェース
│   │           ├── ai-generator.port.ts        # Geminiの抽象
│   │           ├── pptx-exporter.port.ts
│   │           ├── email-sender.port.ts
│   │           ├── realtime-broadcaster.port.ts
│   │           └── signed-url-issuer.port.ts
│   ├── infrastructure/                         # Infrastructure層
│   │   ├── supabase/
│   │   │   ├── client-browser.ts               # ブラウザ用クライアント
│   │   │   ├── client-server.ts                # Server Component / Server Action 用
│   │   │   ├── client-admin.ts                 # service_role（RLSバイパス、管理用途のみ）
│   │   │   ├── middleware.ts                   # Next.js middleware からの認証同期
│   │   │   └── repositories/
│   │   │       ├── supabase-user.repository.ts
│   │   │       ├── supabase-event.repository.ts
│   │   │       ├── supabase-entry.repository.ts
│   │   │       ├── supabase-slide-deck.repository.ts
│   │   │       ├── supabase-stamp.repository.ts
│   │   │       ├── supabase-match.repository.ts
│   │   │       ├── supabase-message.repository.ts
│   │   │       └── supabase-photo-consent.repository.ts
│   │   ├── ai/
│   │   │   ├── gemini-client.ts
│   │   │   ├── gemini-slide-generator.adapter.ts   # AIGeneratorPort 実装
│   │   │   ├── prompts/
│   │   │   │   └── slide-generation.prompt.ts
│   │   │   └── response-schema.ts
│   │   ├── pptx/
│   │   │   ├── pptxgenjs-exporter.adapter.ts        # PptxExporterPort 実装
│   │   │   └── layouts/
│   │   ├── email/
│   │   │   ├── resend-sender.adapter.ts              # EmailSenderPort 実装
│   │   │   └── templates/
│   │   ├── realtime/
│   │   │   ├── channels.ts                            # チャンネル命名規則
│   │   │   ├── slide-sync.broadcaster.ts
│   │   │   ├── stamp.broadcaster.ts
│   │   │   ├── expression-sync.broadcaster.ts
│   │   │   └── chat.broadcaster.ts
│   │   ├── webrtc/
│   │   │   ├── presenter-mesh.ts                    # プレゼン2者
│   │   │   └── breakout-mesh.ts                      # 交流タイム3〜4人
│   │   ├── vrm/
│   │   │   ├── preset-registry.ts
│   │   │   ├── vrm-loader.ts
│   │   │   └── blend-shape-mapper.ts
│   │   ├── mediapipe/
│   │   │   ├── face-landmarker.ts
│   │   │   └── lip-sync-analyzer.ts
│   │   ├── three/
│   │   │   ├── avatar-scene.tsx
│   │   │   ├── roundtable-scene.tsx
│   │   │   └── presenter-scene.tsx
│   │   ├── storage/
│   │   │   ├── slide-image.adapter.ts
│   │   │   └── profile-photo.adapter.ts
│   │   └── ui/                                      # UI部品（Infrastructure扱い）
│   │       ├── components/
│   │       │   ├── ui/                              # shadcn/ui 自動生成
│   │       │   ├── slide/
│   │       │   │   ├── slide-card.tsx
│   │       │   │   ├── slide-editor.tsx
│   │       │   │   └── slide-renderer.tsx           # 本番レンダリング
│   │       │   ├── avatar/
│   │       │   │   ├── avatar-picker.tsx
│   │       │   │   ├── avatar-stage.tsx
│   │       │   │   └── avatar-thumb.tsx
│   │       │   ├── event/
│   │       │   │   ├── event-card.tsx
│   │       │   │   └── entry-form.tsx
│   │       │   ├── stamp/
│   │       │   │   ├── stamp-bar.tsx
│   │       │   │   └── floating-stamp.tsx
│   │       │   ├── vote/
│   │       │   │   └── vote-panel.tsx
│   │       │   ├── chat/
│   │       │   │   ├── message-list.tsx
│   │       │   │   ├── message-input.tsx
│   │       │   │   └── photo-reveal-panel.tsx
│   │       │   └── common/
│   │       │       ├── loading.tsx
│   │       │       ├── empty.tsx
│   │       │       └── error-boundary.tsx
│   │       ├── hooks/
│   │       │   ├── use-supabase-session.ts
│   │       │   ├── use-realtime-channel.ts
│   │       │   ├── use-webrtc-room.ts
│   │       │   ├── use-vrm-avatar.ts
│   │       │   ├── use-face-landmarker.ts
│   │       │   └── use-stamp-broadcast.ts
│   │       └── contexts/
│   │           ├── session.context.tsx
│   │           └── event.context.tsx
│   └── shared/
│       ├── constants/
│       │   ├── vrm-presets.ts
│       │   ├── stamp-kinds.ts
│       │   ├── ng-words.ts
│       │   └── limits.ts                        # 参加上限 / スタンプクールタイム 等
│       ├── config/
│       │   └── env.ts                           # 環境変数のパース（zod）
│       ├── utils/
│       │   ├── date.ts
│       │   ├── id.ts                            # ID生成（ulid / nanoid）
│       │   └── error.ts
│       └── types/
│           └── api.ts                           # Server Action の共通レスポンス型
├── supabase/
│   ├── migrations/                             # タイムスタンプ prefix 付き SQL
│   │   ├── 00001_init_users.sql
│   │   ├── 00002_init_events.sql
│   │   ├── 00003_init_slides.sql
│   │   ├── 00004_init_voting_matching.sql
│   │   ├── 00005_init_stamps.sql
│   │   ├── 00006_init_chat_photo.sql
│   │   └── 00007_rls_policies.sql
│   ├── seed.sql                                # 開発用シード
│   └── config.toml
├── tests/
│   ├── unit/
│   │   ├── domain/
│   │   │   └── matching/
│   │   │       └── k-partition-2opt.test.ts
│   │   └── application/
│   ├── integration/
│   │   └── repositories/
│   └── e2e/
│       └── playwright/
├── .env.example
├── .env.local                                  # Git 管理外
├── .eslintrc.json
├── .gitignore
├── .nvmrc
├── .prettierrc
├── .prettierignore
├── commitlint.config.ts
├── next.config.mjs
├── package.json
├── pnpm-lock.yaml
├── playwright.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

### 3.1 層間のインポート制約

ESLint ルールで以下を強制します（詳細は §17）：

- `domain/**` は `application/`・`infrastructure/`・`app/` から import 禁止
- `application/**` は `infrastructure/`・`app/` から import 禁止
- `infrastructure/**` と `app/**` は自由（ただし `app/` は `application/` と Infrastructure UI のみを参照するのが望ましい）

---

## 4. 環境変数仕様

### 4.1 `.env.example`

```
# ===== Supabase =====
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # サーバーのみ、RLSバイパス用途、厳重管理

# ===== Google Gemini =====
GEMINI_API_KEY=                    # Google AI Studio で発行

# ===== Email (Resend) =====
RESEND_API_KEY=
RESEND_FROM_ADDRESS=noreply@tomokoi.example

# ===== App =====
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_EVENT_MAX_PARTICIPANTS=20

# ===== Feature flags =====
FEATURE_PPTX_EXPORT=false          # Week 3 後半に true に切替候補
FEATURE_CHAT=false                 # Week 4 に true
FEATURE_PHOTO_REVEAL=false         # Week 4 に true
```

### 4.2 環境変数パース（zod）

`src/shared/config/env.ts` にて `zod` で型付きパースを行い、プロジェクト内ではここから export される `env` オブジェクトのみを使用する。`process.env.XXX` への直接アクセスを ESLint で禁止。

### 4.3 Vercel 側設定

Vercel の Environment Variables に **Production / Preview / Development** の3系統で同じキーを登録。特に以下を厳守：

- `SUPABASE_SERVICE_ROLE_KEY` は Production / Preview でのみ設定、Development では未設定（ローカル用はローカル Supabase を使う）
- `NEXT_PUBLIC_*` プレフィックスの変数のみ **クライアントバンドルに含まれる**。サービスロールキー等は絶対に `NEXT_PUBLIC_` を付けない

---

## 5. Supabase セットアップ

### 5.1 プロジェクト作成

- リージョン：`Northeast Asia (Tokyo)` 固定（低遅延のため）
- プラン：Free（MVP期間）、最終発表前に Pro へ切替検討
- DB 名：`tomokoi`

### 5.2 ローカル開発

- Supabase CLI を使ったローカル起動は **本件では採用しない**（要件：Docker 不要）
- ローカル開発はリモートの Supabase Dev プロジェクト（別名：`tomokoi-dev`）を共有する
- 全メンバーが同じ Dev プロジェクトに接続し、スキーマ変更は migration PR を経由

### 5.3 マイグレーション運用

- マイグレーションファイルは `supabase/migrations/NNNNN_description.sql` 形式
- 番号は 5 桁ゼロ詰め、重複は PR レビューで解消
- 適用は CI（§17 参照）から `supabase db push` で実施

---

## 6. データベーススキーマ（全テーブル）

以下、Phase 0 で作成する全テーブルを列挙します。カラム型・制約・インデックス・外部キーを明示します。

### 6.1 ユーザー系

**`users`**：Supabase Auth の `auth.users` を参照するプロフィール拡張テーブル

| カラム | 型 | 制約 | 備考 |
|-------|----|------|------|
| id | uuid | PK, FK→auth.users.id | Auth IDと同一 |
| nickname | text | NOT NULL | |
| age | int | NOT NULL, CHECK 18〜80 | |
| gender | text | NOT NULL, CHECK 'male','female' | MVPは2値（LGBTQ+ は Phase 2） |
| residence_pref | text | NULL許容 | 都道府県コード |
| bio | text | NULL許容 | |
| hobbies | text[] | NULL許容 | 配列 |
| avatar_preset_key | text | NULL許容 | 選択したVRMプリセットキー |
| email_domain_verified | boolean | DEFAULT false | Phase 1で運用開始 |
| is_admin | boolean | DEFAULT false | 管理者フラグ |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

- インデックス：`gender`, `residence_pref`
- トリガ：`updated_at` の自動更新

**`profile_photos`**：顔写真の非公開保存（RLS必須）

| カラム | 型 | 制約 |
|-------|----|------|
| user_id | uuid | PK, FK→users.id |
| storage_path | text | NOT NULL, UNIQUE |
| uploaded_at | timestamptz | DEFAULT now() |

- Storage バケット `private-profile-photos` と対応
- 本人以外（運営含む）は閲覧不可（§9.3 参照）

**`friendships`**：フレンド関係

| カラム | 型 | 制約 |
|-------|----|------|
| id | uuid | PK |
| requester_id | uuid | FK→users.id |
| addressee_id | uuid | FK→users.id |
| status | text | CHECK 'pending','accepted','rejected' |
| created_at | timestamptz | |

- 複合ユニーク：`(requester_id, addressee_id)`
- CHECK：`requester_id != addressee_id`

**`blocks`**：ブロック関係

| カラム | 型 | 制約 |
|-------|----|------|
| id | uuid | PK |
| blocker_id | uuid | FK→users.id |
| blocked_id | uuid | FK→users.id |
| created_at | timestamptz | |

### 6.2 イベント系

**`events`**：イベント

| カラム | 型 | 制約 |
|-------|----|------|
| id | uuid | PK |
| title | text | NOT NULL |
| description | text | |
| starts_at | timestamptz | NOT NULL |
| ends_at | timestamptz | NOT NULL |
| presenter_pair_capacity | int | NOT NULL |
| audience_capacity | int | NOT NULL |
| presenter_pair_price | int | DEFAULT 0 |
| audience_price | int | DEFAULT 0 |
| status | text | CHECK 'scheduled','live','closed' |
| created_at | timestamptz | |

**`entries`**：イベント参加エントリー

| カラム | 型 | 制約 |
|-------|----|------|
| id | uuid | PK |
| event_id | uuid | FK→events.id |
| entry_type | text | CHECK 'presenter_pair','audience' |
| user_id | uuid | FK→users.id |
| created_at | timestamptz | |

- 複合ユニーク：`(event_id, user_id)`

**`presentation_pairs`**：プレゼン枠のペア紐づけ

| カラム | 型 | 制約 |
|-------|----|------|
| id | uuid | PK |
| event_id | uuid | FK→events.id |
| presenter_entry_id | uuid | FK→entries.id |
| introducee_entry_id | uuid | FK→entries.id |
| status | text | CHECK 'invited','accepted','declined' |
| created_at | timestamptz | |

- CHECK：`presenter_entry_id != introducee_entry_id`
- 被紹介者が参加辞退した場合、ペアごとイベントから外れる

### 6.3 スライド系

**`slide_decks`**：スライドデッキ（5枚1組の単位）

| カラム | 型 | 制約 |
|-------|----|------|
| id | uuid | PK |
| presentation_pair_id | uuid | FK→presentation_pairs.id, UNIQUE |
| template_key | text | NOT NULL |
| content_json | jsonb | NOT NULL | 5枚分のフィールド構造 |
| status | text | CHECK 'draft','pending_introducee','pending_organizer','approved','rejected' |
| ai_generated_at | timestamptz | NULL許容 |
| introducee_confirmed_at | timestamptz | NULL許容 |
| organizer_approved_at | timestamptz | NULL許容 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

- `content_json` は §6.3.1 のスキーマに従う

**`slide_images`**：スライドに貼る任意画像

| カラム | 型 | 制約 |
|-------|----|------|
| id | uuid | PK |
| slide_deck_id | uuid | FK→slide_decks.id |
| slide_number | int | CHECK 1〜5 |
| slot_index | int | CHECK 0〜1 | Slide 4 の A/B 用など |
| storage_path | text | NOT NULL |
| uploaded_at | timestamptz | |

**`slide_reviews`**：被紹介者・主催者レビュー履歴

| カラム | 型 | 制約 |
|-------|----|------|
| id | uuid | PK |
| slide_deck_id | uuid | FK→slide_decks.id |
| reviewer_role | text | CHECK 'introducee','organizer' |
| reviewer_user_id | uuid | FK→users.id |
| decision | text | CHECK 'approved','revision_requested','rejected' |
| reason | text | |
| created_at | timestamptz | |

#### 6.3.1 `content_json` の構造（参考）

```
{
  "slides": [
    {
      "slideNumber": 1,
      "theme": "一言で言うと、こんな人",
      "presenterScript": "...",
      "introduceeReaction": "...",
      "imageSlotIds": [],
      "regeneratedAt": null
    },
    ...（5枚分）
  ]
}
```

### 6.4 投票・マッチング系

**`votes`**：投票

| カラム | 型 | 制約 |
|-------|----|------|
| id | uuid | PK |
| event_id | uuid | FK→events.id |
| voter_user_id | uuid | FK→users.id |
| target_user_id | uuid | FK→users.id |
| priority | int | CHECK 1〜3 |
| round | int | CHECK 1〜3 |
| created_at | timestamptz | |

- 複合ユニーク：`(event_id, voter_user_id, target_user_id, round)`
- CHECK：`voter_user_id != target_user_id`

**`recommendations`**：紹介者の推薦フラグ

| カラム | 型 | 制約 |
|-------|----|------|
| id | uuid | PK |
| presentation_pair_id | uuid | FK→presentation_pairs.id |
| recommended_user_id | uuid | FK→users.id |
| rank | int | CHECK 1〜3 |
| created_at | timestamptz | |

**`tables`**：テーブル割り振り結果

| カラム | 型 | 制約 |
|-------|----|------|
| id | uuid | PK |
| event_id | uuid | FK→events.id |
| round | int | CHECK 1〜3 |
| table_index | int | |
| composition | text | CHECK '2m2f','2m1f','1m2f' |
| created_at | timestamptz | |

**`table_members`**：テーブル構成員

| カラム | 型 | 制約 |
|-------|----|------|
| id | uuid | PK |
| table_id | uuid | FK→tables.id |
| user_id | uuid | FK→users.id |

- 複合ユニーク：`(table_id, user_id)`

### 6.5 スタンプ系

**`stamps`**：スタンプ送信イベント

| カラム | 型 | 制約 |
|-------|----|------|
| id | uuid | PK |
| event_id | uuid | FK→events.id |
| presentation_pair_id | uuid | FK→presentation_pairs.id |
| sender_user_id | uuid | FK→users.id | ※オーディエンスも含む |
| kind | text | CHECK '共感','素敵','面白い','拍手' |
| sent_at | timestamptz | DEFAULT now() |

- インデックス：`(presentation_pair_id)`（集計用）

**`awards`**：アワード結果

| カラム | 型 | 制約 |
|-------|----|------|
| id | uuid | PK |
| event_id | uuid | FK→events.id |
| award_kind | text | CHECK '盛り上がったで賞' |
| presentation_pair_id | uuid | FK→presentation_pairs.id |
| stamp_total | int | |
| awarded_at | timestamptz | |

### 6.6 マッチ成立・事後系

**`matches`**：マッチ成立（双方承諾時）

| カラム | 型 | 制約 |
|-------|----|------|
| id | uuid | PK |
| event_id | uuid | FK→events.id |
| user_a_id | uuid | FK→users.id | 辞書順で小さい側 |
| user_b_id | uuid | FK→users.id | 辞書順で大きい側 |
| agreed_a_at | timestamptz | NULL許容 |
| agreed_b_at | timestamptz | NULL許容 |
| matched_at | timestamptz | NULL許容 | 両者承諾時点 |
| status | text | CHECK 'pending','matched','closed' |
| created_at | timestamptz | |

- CHECK：`user_a_id < user_b_id`（ペアの一意性担保）
- 複合ユニーク：`(event_id, user_a_id, user_b_id)`

**`match_messages`**：1:1チャット

| カラム | 型 | 制約 |
|-------|----|------|
| id | uuid | PK |
| match_id | uuid | FK→matches.id |
| sender_user_id | uuid | FK→users.id |
| body | text | NOT NULL, CHECK length <= 2000 |
| sent_at | timestamptz | DEFAULT now() |

- インデックス：`(match_id, sent_at)`（時系列取得）

**`photo_reveal_consents`**：顔写真公開合意

| カラム | 型 | 制約 |
|-------|----|------|
| id | uuid | PK |
| match_id | uuid | FK→matches.id |
| user_id | uuid | FK→users.id |
| consent_state | text | CHECK 'consented','revoked' |
| state_changed_at | timestamptz | DEFAULT now() |

- 複合ユニーク：`(match_id, user_id)`（最新状態のみ保持）

**`reports`**：通報

| カラム | 型 | 制約 |
|-------|----|------|
| id | uuid | PK |
| reporter_user_id | uuid | FK→users.id |
| target_kind | text | CHECK 'message','user' |
| target_id | uuid | |
| reason | text | NOT NULL |
| status | text | CHECK 'pending','resolved','dismissed' |
| created_at | timestamptz | |

---

## 7. RLS ポリシー方針

### 7.1 基本方針

- **全テーブル RLS 有効化**（例外は運営管理テーブルのみ、サービスロール経由で操作）
- **デフォルト拒否**：ポリシー未定義のテーブルは全アクセス不可
- **最小権限**：SELECT / INSERT / UPDATE / DELETE を別々に許可
- **サービスロール**（`supabase.auth.admin` 相当）は本番・Preview で管理画面・システム処理に限定して使用

### 7.2 主要テーブルのポリシー概要

**`users`**

- SELECT：他者は `nickname, avatar_preset_key` までのビュー経由のみ（後述）
- UPDATE：本人のみ

**`profile_photos`**

- SELECT：`user_id = auth.uid()` のみ（運営も閲覧不可）
- INSERT：`user_id = auth.uid()` のみ
- DELETE：`user_id = auth.uid()` のみ
- 合意公開時はサーバー側（Service Role）で双方の `photo_reveal_consents` を確認してから **サイン付きURL** を発行

**`slide_decks`**

- SELECT：紹介者・被紹介者・同イベント参加者（本番中）・管理者
- UPDATE：`status='draft'` の間のみ紹介者

**`votes`**

- SELECT：本人のみ（秘密性担保）
- INSERT：本人 + 同イベント参加者 + プレゼン枠のみ（オーディエンスは不可）

**`stamps`**

- INSERT：同イベント参加者（プレゼン枠・オーディエンス枠）、ただし登壇中のペアは送信不可（アプリ側でガード + DB層は Realtime 経由が主）
- SELECT：本人 / 管理者 / 集計用ビュー

**`matches`**

- SELECT：`user_a_id = auth.uid() OR user_b_id = auth.uid()`
- UPDATE：当事者のみ（承諾時のみ）

**`match_messages`**

- SELECT：マッチ当事者のみ
- INSERT：マッチ当事者 + `matches.status='matched'` のとき
- ブロック関係（`blocks`）が張られていたら INSERT 不可

**`photo_reveal_consents`**

- SELECT：本人のみ
- INSERT / UPDATE：本人のみ
- 合意成立の確認はサーバー側で Service Role で行う

### 7.3 ポリシーのテスト

- Day 2 の最後に、各テーブルで **Bob アカウントで Alice のデータにアクセスを試みる** ネガティブテストを全員で実施
- 詳細は §23「引き渡しチェックリスト」を参照

---

## 8. 認証基盤

### 8.1 Supabase Auth 設定

- 認証方式：メール + パスワード（MVP）
- メール確認：有効
- 将来的に追加：大学・企業メールドメイン認証（Phase 1）

### 8.2 Next.js 連携

- `@supabase/ssr` を使用
- `src/infrastructure/supabase/client-browser.ts`：ブラウザコンポーネント用
- `src/infrastructure/supabase/client-server.ts`：Server Component / Server Action 用
- `src/infrastructure/supabase/client-admin.ts`：Service Role 用（管理操作のみ）
- `src/infrastructure/supabase/middleware.ts`：Next.js `middleware.ts` から呼び出してセッション同期

### 8.3 認証ガード

- `src/app/(app)/layout.tsx`：セッション未取得なら `/login` リダイレクト
- `src/app/(admin)/layout.tsx`：セッション未取得または `users.is_admin=false` なら 403

---

## 9. Storage バケット設計

| バケット名 | 公開/非公開 | 用途 | RLS |
|-----------|-----------|------|-----|
| `slide-images` | Public | スライド内任意画像 | INSERT は本人、SELECT は全員（URL知っていればアクセス可） |
| `vrm-presets` | Public | 固定VRMアセット（実際は `public/vrm/` 同梱でも可） | — |
| `private-profile-photos` | Private | 顔写真非公開保存 | 本人のみ SELECT、合意成立時はサーバー側がサイン付きURL発行 |

### 9.1 顔写真のサイン付きURL発行フロー

1. 両者が `photo_reveal_consents.consent_state='consented'` を持っている
2. チャット画面を開くたびに、サーバー側 Use Case が両者の合意状態を検証
3. 成立していれば、Service Role クライアントで **TTL 10分のサイン付きURL** を発行して返す
4. どちらかが `revoked` にすると、次のサイン付きURL発行リクエストは失敗する

---

## 10. Realtime チャンネル設計

### 10.1 命名規則

`<domain>:<resource>:<id>` 形式。全員がこの形式を遵守することで衝突を防ぎます。

| チャンネル名 | 用途 | メッセージ種別 | 担当 |
|------------|------|-------------|------|
| `event:slide-sync:<eventId>` | スライド同期（ページ番号・アクティブ発表ペア） | Broadcast | C |
| `event:stamp:<eventId>` | スタンプエフェクト | Broadcast | C |
| `event:expression:<pairId>` | 表情・口パクブレンドシェイプ同期 | Broadcast | B/C |
| `event:state:<eventId>` | イベントフェーズ遷移（プレゼン/投票/交流） | Broadcast | C |
| `breakout:voice:<tableId>` | 交流タイム WebRTC シグナリング | Broadcast | C |
| `chat:<matchId>` | 1:1 チャット | Broadcast + DB INSERT | D |

### 10.2 送信権限

- Broadcast は **匿名接続でも送信可能**な仕様のため、Realtime 側で権限ガードはできない
- クライアント側で送信前に検証 + **サーバー側で DB 書き込みを伴うものは Server Action 経由**で RLS を通す
- 例：スタンプ送信はクライアントから Broadcast + 非同期で `stamps` テーブルに INSERT（Server Action）

### 10.3 クールタイム（スタンプ）

- クライアント側：0.3〜0.5 秒のローカルクールタイム
- サーバー側：直近1秒以内の同 user 同 kind の INSERT をレート制限（DBトリガまたはアプリ層）

### 10.4 クロスメンバー型の合意

Day 1 で全員着手可能にするため、**Day 2-3 中に以下の型ファイル・enum を確定値で作成して main にマージ** します。内容が空でも **ファイル・型名・フィールド・enum 値は確定** させ、以降の変更は PR レビュー必須とします。

#### 10.4.1 チャンネル Payload 型

| 型名 | 配置ファイル | チャンネル | フィールド構成 | 送信 / 購読 |
|------|-------------|-----------|--------------|-------------|
| `SlideSyncPayload` | `src/domain/event/value-objects/slide-sync.payload.ts` | `event:slide-sync:<eventId>` | `deckId: DeckId` / `pairId: PairId` / `slideIndex: number` / `updatedAt: string`（ISO8601） | 送信＝A（Server Action 内部） / 購読＝A（観客 SlideRenderer） |
| `ExpressionPayload` | `src/domain/avatar/value-objects/expression.payload.ts` | `event:expression:<pairId>` | `userId: UserId` / `weights: { happy, sad, angry, relaxed, surprised, aa, ih, ou, ee, oh: number }`（各 0〜1、小数2桁に丸め） / `lookAt: { x: number, y: number } \| null` / `ts: number`（epoch ms） | 送信＝B（登壇者クライアント、15fps 固定） / 購読＝B（観客クライアント、lerp 補間） |
| `StatePayload` | `src/domain/event/value-objects/state.payload.ts` | `event:state:<eventId>` | `phase: EventPhase` / `round: number` / `startedAt: string`（ISO8601） | 送信＝C（管理者 Server Action 経由） / 購読＝全クライアント |
| `StampPayload` | `src/domain/stamp/value-objects/stamp.payload.ts` | `event:stamp:<eventId>` | `pairId: PairId` / `kind: StampKind` / `clientNonce: string`（UUID v4、自分の送信判定用） | 送信＝観客クライアント / 購読＝全クライアント |
| `ChatMessagePayload` | `src/domain/chat/value-objects/chat-message.payload.ts` | `chat:<matchId>` | `messageId: MessageId` / `senderId: UserId` / `body: string` / `sentAt: string`（ISO8601） | 送信＝D（Server Action 内部） / 購読＝マッチ両者 |

実装時の決めごと：

- フィールド名は **snake_case ではなく camelCase** に統一（TypeScript 側の命名規約と揃える）。DB カラムは snake_case、Repository の mapper で変換
- すべての Payload は **Zod スキーマを同ファイル内に併記** し、受信時の再検証に使う（Broadcast は改ざん可能な前提）
- Payload は **不変（readonly）オブジェクト**として扱う

#### 10.4.2 ドメイン共通 enum

| enum 名 | 配置ファイル | 値 | 備考 |
|---------|-------------|---|------|
| `EventPhase` | `src/domain/event/value-objects/event-phase.vo.ts` | `pre_event` / `entry` / `presentation` / `voting` / `intermission` / `mingling` / `closing` | DB の `events.current_phase` カラムの CHECK 制約とも一致させる |
| `StampKind` | `src/domain/stamp/value-objects/stamp-kind.vo.ts` | `handshake` / `sparkle` / `laugh` / `clap` | DB の `stamps.kind` カラムの CHECK 制約と一致。UI の絵文字マッピング（🤝✨😂👏）は Infrastructure 層で対応 |
| `Gender` | `src/domain/user/value-objects/gender.vo.ts` | `female` / `male` / `other` | §3 のディレクトリツリーに既存記載あり、Day 2 で値を確定 |
| `EntryType` | `src/domain/event/value-objects/entry-type.vo.ts` | `presenter_pair` / `audience` | §3 に既存、Day 2 で値を確定 |
| `VotePriority` | `src/domain/matching/value-objects/vote-priority.vo.ts` | `1` / `2` / `3`（branded number 型） | §3 に既存、Day 2 で分岐ユニオン型として確定 |
| `MatchStatus` | `src/domain/match/value-objects/match-status.vo.ts` | `active` / `blocked` / `reported` | 05 §2.1 の Match エンティティで使用 |
| `PhotoConsentState` | `src/domain/match/value-objects/photo-consent-state.vo.ts` | `pending` / `consented` / `revoked` | 05 §2.1 の PhotoConsent エンティティで使用 |
| `SlideStatus` | `src/domain/slide/value-objects/slide-status.vo.ts` | `draft` / `pending_introducee` / `pending_organizer` / `approved` / `rejected` | §3 に既存、値を 02 §2.1 と整合させる |

#### 10.4.3 ドメイン共通データ型（Use Case 戻り値）

| 型名 | 配置ファイル | フィールド構成 | 用途 |
|------|-------------|--------------|------|
| `TableMemberData` | `src/domain/matching/value-objects/table-member.data.ts` | `userId: UserId` / `displayName: string` / `avatarPresetKey: string` / `gender: Gender` | `GetMyTable` ユースケース戻り値、B の `RoundtableScene` に渡される |
| `TableAssignmentPlan` | `src/domain/matching/value-objects/table-assignment.plan.ts` | `tables: { id, seatCount, members: UserId[] }[]` / `leftovers: UserId[]` / `score: number` | `KPartition2OptService` の戻り値、05 §2.2 に既載 |
| `ActionResult<T>` | `src/shared/types/action-result.ts` | `{ ok: true, data: T } \| { ok: false, code: string, message: string }` | 全 Server Action の共通戻り値、§11 に既載 |

#### 10.4.4 Branded ID 型

型安全のため、ID 系は **branded type** で定義（`string` の取り違えを防ぐ）：

| 型名 | 配置 | 元 |
|------|------|---|
| `UserId` / `EventId` / `PairId` / `DeckId` / `SlideId` / `MatchId` / `MessageId` / `TableId` / `VoteId` / `RecommendationId` / `StampId` / `PhotoId` | `src/shared/types/ids.ts` | `string & { __brand: 'UserId' }` 形式 |

#### 10.4.5 Day 2-3 の追加タスク

上記の型定義は **メンバーA が Day 2-3 に確定** し main にマージします。ただし：

- Payload 型の**具体的フィールド追加・変更**は、各担当（A/B/C/D）が Week 1 中に PR で提案 → 全員レビュー → マージ
- enum の値変更は **全員合意の上 PR** 必須
- Day 3 終了時点で、各メンバーが `import { SlideSyncPayload, ExpressionPayload, ... } from '@/domain/...'` して型エラーなくコンパイルできる状態を作る

これにより Day 4（4/16）以降、B は `ExpressionPayload` 型を使って表情同期のローカル実装を進められ、D は `TableMemberData` 型を使って `GetMyTable` の戻り値を構築でき、A は `SlideSyncPayload` 型で Broadcast スタブを呼び出せます。

---

## 11. Server Action 規約

### 11.1 共通ルール

- ファイル先頭に `"use server";` を必ず記述
- Server Action 内では **Use Case を1つ呼び出すだけ**、ビジネスロジックを書かない
- 戻り値は共通レスポンス型 `ActionResult<T>`（`src/shared/types/api.ts` 定義）に統一
- 入力バリデーションは `zod` でスキーマ検証、失敗時は `validation_error` を返す
- 認証必須 Action は冒頭で `supabase.auth.getUser()` を呼び、未認証なら `unauthenticated` を返す

### 11.2 `ActionResult<T>` の契約

```
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: 'validation_error' | 'unauthenticated' | 'forbidden' | 'not_found' | 'conflict' | 'internal_error'; message: string; details?: unknown }
```

クライアント側は `ok` フラグで分岐し、UI にエラーメッセージを表示する。

### 11.3 Use Case の依存性注入

Server Action 内部で以下のパターンで Use Case を組み立てる：

1. `supabase = createServerClient()` でクライアント取得
2. `userRepo = new SupabaseUserRepository(supabase)` で Repository 実装を生成
3. `useCase = new XXXUseCase(userRepo, ...)` で Use Case 組み立て
4. `result = await useCase.execute(input)`

MVP ではこのパターンで十分。将来 DI コンテナに切り替える場合は Use Case のコンストラクタ仕様のみ維持する。

---

## 12. Repository パターン規約

### 12.1 インターフェース（Domain層）

- `src/domain/<domain>/repositories/<name>.repository.ts` に **インターフェースのみ** 定義
- 戻り値は `Promise<Entity | null>` または `Promise<Entity[]>`、例外はドメインエラー
- Supabase 依存の型（`PostgrestResponse` など）は絶対に露出させない

### 12.2 実装（Infrastructure層）

- `src/infrastructure/supabase/repositories/supabase-<name>.repository.ts` に実装
- コンストラクタで `SupabaseClient` を受け取る
- Supabase のレスポンスを **Domain のエンティティ / 値オブジェクト** に変換して返す
- DB エラーは Infrastructure 層で捕捉し、`DomainError` または `InfrastructureError` にマッピング

### 12.3 トランザクション

- MVP 段階では単純な単一テーブル操作が多く、明示的なトランザクションは最小限
- マッチング結果書き込み（`tables` + `table_members` 一括作成）のような複数テーブル操作のみ、Supabase の `rpc()` で呼び出す PostgreSQL 関数にまとめる

---

## 13. ドメインエンティティ規約

- エンティティは **クラス** として定義、プロパティは `readonly` で公開
- イミュータブル前提：状態変更は新しいインスタンスを返す `withX()` メソッドで
- ID はブランド型（例：`UserId = string & { __brand: 'UserId' }`）で区別
- バリデーションはコンストラクタ内で実行、失敗時は `ValidationError`
- `equals(other)` メソッドでID比較

値オブジェクトは同様に不変、`equals()` は全フィールド比較。

---

## 14. 共通エラー型

`src/domain/shared/errors/` に以下を定義：

- `DomainError`：抽象基底
- `NotFoundError`、`ForbiddenError`、`ValidationError`、`ConflictError` が継承
- `src/shared/utils/error.ts` に `toActionResult(error): ActionResult<never>` 変換関数

Infrastructure 層のエラー（Supabase接続失敗等）は `InfrastructureError` として別途定義、Server Action で `internal_error` に変換。

---

## 15. ロギング・モニタリング

- MVP では `console.log` + Vercel ログ閲覧で十分
- エラーは `console.error` + Sentry（任意、Week 3 以降に導入検討）
- Supabase ログは Supabase ダッシュボードで確認
- デモ当日はチームメンバー2名が Vercel ダッシュボードを常時監視

---

## 16. CI/CD パイプライン

### 16.1 GitHub Actions

**`.github/workflows/ci.yml`**：PR 時と main push 時に実行

ジョブ：

1. `checkout` + `pnpm install --frozen-lockfile`
2. `pnpm lint`（ESLint、層間 import 違反検出含む）
3. `pnpm typecheck`（`tsc --noEmit`）
4. `pnpm test`（Vitest ユニット / インテグレーション）
5. `pnpm build`（Next.js ビルド検証）
6. PR にステータスコメント

いずれか失敗したら PR マージ不可。

**`.github/workflows/db-migration.yml`**：`supabase/migrations/` に差分がある PR のみ発火

- `supabase db push` を Preview 環境向けに実行
- main マージ時に本番環境向けに再実行
- Supabase CLI のアクセストークンは GitHub Secrets で管理

### 16.2 Vercel 連携

- GitHub 連携で自動デプロイ
- `main` ブランチ → Production
- PR ブランチ → Preview（ユニーク URL）
- Environment Variables を Production / Preview / Development で分離
- Ignored Build Step：`docs/` 変更のみの PR はビルドスキップ（`git diff --quiet HEAD^ HEAD -- ':!docs/*'`）

### 16.3 環境別設定

| 環境 | Supabase | Vercel | 用途 |
|------|---------|--------|------|
| Development（ローカル） | tomokoi-dev（共有） | — | 各メンバーの開発 |
| Preview | tomokoi-dev（共有） | Preview URL | PR レビュー |
| Production | tomokoi-prod（本番） | 本番 URL | 最終発表・デモ当日 |

Preview と Dev の Supabase を共有する運用は PR 間で DB が汚れるリスクがあるため、Week 3 後半で本番専用プロジェクトに切替。

---

## 17. Git 運用ルール

### 17.1 ブランチ戦略

- `main`：常にデプロイ可能
- `feat/<member>-<topic>`：機能ブランチ、例 `feat/a-slide-editor`
- `fix/<topic>`：バグ修正
- `chore/<topic>`：環境・依存関係

### 17.2 PR ルール

- PR テンプレ（`.github/pull_request_template.md`）に沿って記述
- 1 PR = 1 責務、大きくなりすぎたら分割
- レビュー必須（メンバーB/C/D は互いにレビュー、Aは基盤関連のみレビュー）
- CI グリーンでマージ可能
- マージは `Squash and merge`（履歴を1コミットに集約）

### 17.3 コミット規約

Conventional Commits に準拠：

- `feat: スライド生成Use Case追加`
- `fix: スタンプクールタイムのオフバイワン修正`
- `chore: 依存ライブラリ更新`
- `docs: 01_基盤構築.md のDBスキーマ追記`
- `refactor: Repository Interface を Domain 層に移動`
- `test: k-partition-2opt のはぐれ吸収テスト追加`

`commitlint` + `husky pre-commit` で強制。

### 17.4 コードレビュー基準

- 層間 import 違反がないか（ESLint でも検出されるが目視でも確認）
- Server Action が Use Case を1つ呼ぶだけか
- Repository インターフェースが Domain 層にあるか
- RLS が絡む変更は **ネガティブテストが含まれているか**
- 環境変数を `process.env` から直接読んでいないか

---

## 18. リント・フォーマッタ・型チェック

- ESLint：Next.js 既定 + 追加ルール：
  - `no-restricted-imports`：`domain/**` から外部層の import 禁止、`application/**` から Infrastructure の import 禁止
  - `no-process-env`：`process.env` 直接アクセス禁止（`src/shared/config/env.ts` 経由必須）
- Prettier：シングルクォート、セミコロン、width 100
- TypeScript：`strict: true`、`noUncheckedIndexedAccess: true`
- `pnpm lint` / `pnpm format` / `pnpm typecheck` のスクリプト提供

---

## 19. テスト方針

### 19.1 層別テスト戦略

| 層 | テスト種別 | ツール |
|----|----------|--------|
| Domain | ユニット | Vitest |
| Application | ユニット（Repository はモック） | Vitest |
| Infrastructure | インテグレーション（Supabase Dev 接続） | Vitest |
| UI / E2E | E2E | Playwright |

### 19.2 Phase 0 で用意するテスト

- `k-partition-2opt.service.ts` のユニットテスト雛形（D が Week 3 に本体を書く際の土台）
- Repository のインテグレーションテスト雛形
- E2E のログインフロー雛形

MVP 期間中は **重要ロジック（マッチングアルゴリズム、RLS）** に絞ってテストを厚くし、UI は手動検証中心。

---

## 20. スクリプト一覧（package.json）

- `pnpm dev`：ローカル開発
- `pnpm build`：本番ビルド
- `pnpm start`：本番サーバ起動
- `pnpm lint`：ESLint
- `pnpm format`：Prettier 整形
- `pnpm typecheck`：tsc --noEmit
- `pnpm test`：Vitest
- `pnpm test:ui`：Vitest UI
- `pnpm e2e`：Playwright
- `pnpm db:push`：Supabase CLI マイグレーション適用
- `pnpm db:reset`：ローカル接続先の Supabase Dev をリセット（確認プロンプトあり）

---

## 21. セキュリティ初期設定

- Vercel の `headers()` で CSP、HSTS、X-Frame-Options を設定
- Supabase Storage のバケット公開範囲を最小化（§9 参照）
- Service Role Key は Vercel Production / Preview にのみ設定、GitHub Secrets には格納しない
- 環境変数の露出テスト：`NEXT_PUBLIC_` プレフィックスが付いていない変数がクライアントバンドルに含まれないことをビルド成果物で目視確認

---

## 22. 基盤引き渡し時点の状態

Phase 0 終了時（4/15 夜）に、以下すべてが満たされた状態で B/C/D に引き渡します。

### 22.1 リポジトリ

- 全ディレクトリが §3 の通り存在
- ディレクトリ雛形の ESLint エラーなし、`pnpm build` 成功
- README.md に「セットアップ手順」「スクリプト一覧」「ドキュメントへのリンク」

### 22.2 Supabase

- 全テーブル作成済み
- RLS 全テーブル有効
- Storage バケット3種作成済み
- シードデータ投入（管理者1名、テストユーザー数名、ダミーイベント1件）

### 22.3 認証

- ログイン・サインアップ・ログアウトが動く
- 管理者フラグ認可の動作確認

### 22.4 CI/CD

- GitHub Actions 緑
- Vercel Preview デプロイが PR で自動発火
- Supabase マイグレーションが CI で適用される

### 22.5 Realtime / Storage

- チャンネル命名規則のドキュメント化
- Supabase Dev 環境で Realtime Broadcast が疎通確認済み

### 22.6 クロスメンバー型

- `src/domain/*/value-objects/` 配下に §10.4 の全 Payload 型ファイルが存在する
- §10.4.2 の全 enum が値を含めて定義されている
- `src/shared/types/ids.ts` に Branded ID 型が定義されている
- `src/shared/types/action-result.ts` に `ActionResult<T>` が定義されている
- 全ファイルが lint/typecheck を通過している

---

## 23. 引き渡しチェックリスト

Phase 0 終了時、以下を **全員で** 確認：

- [ ] `pnpm install && pnpm dev` で画面が起動する
- [ ] ログイン・ログアウトができる
- [ ] 管理者アカウントで `/admin/slides` にアクセスできる、非管理者ではアクセスできない
- [ ] `users` テーブルの他人の行を SELECT できない（RLSが効いている）
- [ ] `profile_photos` は本人以外（運営含む）SELECT できない
- [ ] `votes` は本人以外 SELECT できない
- [ ] `match_messages` はマッチ外の第三者から SELECT できない
- [ ] PR を切ると Vercel Preview URL が生成される
- [ ] PR で lint/typecheck/test 失敗時にマージがブロックされる
- [ ] Supabase マイグレーションが CI から適用される
- [ ] Realtime Broadcast で送受信できる（2タブで動作確認）
- [ ] 各メンバーが自分の担当領域から `import { SlideSyncPayload, ExpressionPayload, StatePayload, StampPayload, ChatMessagePayload } from '@/domain/...'` して型エラーなくコンパイルできる
- [ ] 各メンバーが `import { EventPhase, StampKind, Gender, EntryType, VotePriority, MatchStatus, PhotoConsentState, SlideStatus } from '@/domain/...'` して型エラーなくコンパイルできる
- [ ] 各メンバーが `import { UserId, EventId, PairId, ... } from '@/shared/types/ids'` および `ActionResult` を使える
- [ ] 全員が自分の担当分 **02〜05** ファイルを読み、不明点を 4/15 夜の同期MTGに持ち寄る

---

## 24. 基盤構築後のメンバーAの役割

基盤引き渡し後、メンバーAは **02_メンバーA_スライド・管理.md** に従って以下を担当します：

- スライド作成フロー（質問 UI / Gemini 3 Flash / フィールド編集 / 画像スロット）
- 被紹介者確認画面
- 主催者管理画面（スライド審査・通報対応）
- PPTXエクスポート
- 内面エピソード誘導UI

ただし、Phase 1 以降に基盤に関する質問・障害対応・共通コンポーネントの追加依頼は、原則として **メンバーA がファーストレスポンダ** となります（基盤に最も詳しいため）。大規模な変更は PR で全員レビューを通す。

---

## 25. 参照

- 要件定義書 `tomokoi_spec_v5_3.md` §8（技術スタック）§9（チーム体制）§10（スケジュール）§16（次のアクション）
- 本技術仕様書 `00_概要.md` §4（クリーンアーキテクチャ方針）§5（開発フェーズ）§6（6ファイル構成）
- 本技術仕様書 `02_メンバーA_スライド・管理.md` §2（Slide 関連テーブル運用）
- 本技術仕様書 `03_メンバーB_アバター.md` §9（VRMアセット配置先）
- 本技術仕様書 `04_メンバーC_リアルタイム.md` §4（Realtime チャンネル仕様）§6（WebRTCシグナリング）
- 本技術仕様書 `05_メンバーD_投票・マッチング・事後.md` §6（マッチングアルゴリズム）§11（顔写真 RLS 詳細）
- Next.js 14 App Router 公式ドキュメント（Server Action / Route Handler）
- Supabase 公式ドキュメント（Auth / Realtime / Storage / RLS）
- Conventional Commits 仕様 v1.0
- Clean Architecture（Robert C. Martin, 2017）— 3層分割と依存ルール

---

## 26. 更新履歴

| 版 | 日付 | 変更内容 |
|----|------|---------|
| 初版 | 2026/04/23 | 全セクション初版作成 |
| +§10.4 | 2026/04/24 | クロスメンバー型合意セクション（§10.4）追加。§1.3 Day 2/3 タスク更新、§22.6 検証項目追加、§23 ハンドオフチェック項目追加。Day 4 以降の B/D の独立着手を保証するため、Payload 型・enum・Branded ID を Day 3 までに確定させる運用を明文化 |

---
