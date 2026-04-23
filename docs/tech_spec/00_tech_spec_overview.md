# トモコイ 技術仕様書 00 — 概要

> 本ドキュメントは「トモコイ v5.3 要件定義書」を実装レベルに落とし込む技術仕様書の **総合インデックス** です。
> 以降のファイル（01〜05）はすべて本ファイルから参照される構成になっています。

---

## 1. 本仕様書の目的

本仕様書は以下を達成するために作られています。

- **要件定義書 v5.3** を、クリーンアーキテクチャ3層（Domain / Application / Infrastructure）に従って実装可能な粒度に分解する
- **4名のエンジニア**が並列作業する際の責任境界・契約境界（API・DBスキーマ・イベント）を事前に合意する
- **1名が先に基盤を構築してから4名の並列作業に分岐する**開発体制を前提に、合流点と引き渡しを明文化する
- ハッカソン4週間のスケジュール（4/13〜5/10）に対して、各メンバーがブロッカーなしで作業できる事前情報を提供する

本仕様書は **要件定義書 v5.3 の変更を伴わず** 実装方針のみ規定します。要件変更が必要になった場合は要件定義書を先に更新し、本仕様書を追従させてください。

---

## 2. プロダクト概要（要件定義書の再掲要約）

**トモコイ**：友達があなたをアバターでプレゼンする、ライブイベント型オンラインマッチング。

- 参加枠は **プレゼン枠（ペア必須）** と **オーディエンス枠** の2種類
- 紹介者と被紹介者がペアで登壇し、**スライド5枚で掛け合い型ピッチ**
- 視聴者は **4種のスタンプ** で盛り上げ、スタンプ獲得最多ペアに「盛り上がったで賞」を自動表彰
- ピッチ後、視聴者全員が **0〜3名に優先順位付きで秘密投票**
- **制約付きk-partition 2-opt**（TypeScript純関数）で1テーブル3〜4人のテーブル分割を決定
- **非アニメ風VRM** 3Dアバター＋MediaPipe表情トラッキングで2〜4体同時描画
- マッチ成立後は **1:1 チャット** + **双方合意時のみ顔写真相互公開**

詳細は要件定義書 `tomokoi_spec_v5_3.md` §1〜§17 を参照。

---

## 3. 技術スタック（実装全体像）

### 3.1 基盤レイヤ

| 領域 | 選定技術 |
|------|----------|
| フロントエンド | Next.js 14（App Router）+ TypeScript |
| UIキット | shadcn/ui + Tailwind CSS |
| 状態管理 | React Server Components + Server Actions（クライアント側は最小限の useState / Zustand） |
| バックエンド | Supabase（PostgreSQL + Auth + Realtime + Storage） |
| ホスティング | Vercel（Serverless Functions, Edge Middleware を含む） |
| パッケージ管理 | pnpm（ワークスペースは使わず単一パッケージ構成） |

**Vercel 一元化の帰結**：Cloud Run / Supabase Edge Functions / Docker はローカル・本番ともに利用しない。`pnpm dev` のみでローカル全機能が動作する。

### 3.2 機能レイヤ

| 領域 | 選定技術 |
|------|----------|
| リアルタイム配信 | Supabase Realtime（Broadcast / Presence） |
| 音声通話 | WebRTC（プレゼン2者 + 交流3〜4人、SFU不要のメッシュ構成） |
| 3Dレンダリング | Three.js + React Three Fiber |
| VRM読み込み | @pixiv/three-vrm |
| 表情トラッキング | MediaPipe Face Landmarker (JS) |
| AI文面生成 | Google Gemini 3 Flash（`gemini-3-flash-preview`、`@google/genai` SDK） |
| PPTXエクスポート | pptxgenjs |
| メール通知 | Resend（MVP、Supabase Auth メールとは別系統） |
| マッチングアルゴリズム | TypeScript純関数（制約付きk-partition 2-opt、200〜400行） |

### 3.3 運用レイヤ

| 領域 | 選定技術 |
|------|----------|
| CI | GitHub Actions（lint / typecheck / test / build） |
| CD | Vercel（main → Production、PR → Preview）＋ Supabase CLI マイグレーション |
| モニタリング | Vercel Analytics + Supabase ログ + Sentry（MVPは任意） |
| スキーマ管理 | Supabase CLI（`supabase/migrations/` に SQL で管理） |

---

## 4. クリーンアーキテクチャ方針

### 4.1 3層構造

| 層 | 責務 | 依存方向 |
|----|------|---------|
| **Domain** | ビジネスルール・エンティティ・値オブジェクト・リポジトリ **インターフェース**・ドメインサービス（例：マッチングアルゴリズム） | 他の層に依存しない |
| **Application** | ユースケース（Use Case）・アプリケーションサービス・入出力DTO | Domain のみに依存 |
| **Infrastructure** | Supabase / Gemini / PPTX / Three.js / MediaPipe / WebRTC / UI（Next.js `app/` + React コンポーネント）・Repository **実装**・メール送信 Adapter | Domain・Application に依存（逆は禁止） |

### 4.2 依存ルール（厳守）

- Domain は `import` で他層から何も取り込んではならない（`Supabase` も `React` も禁止）
- Application は Domain の **Repository インターフェース** と **エンティティ・値オブジェクト** のみを使う
- Server Action は Infrastructure 層の薄いエントリポイント扱い：**内部では Use Case を1つ呼び出すだけ**、業務ロジックを直接書かない
- React コンポーネントは Application の DTO / Server Action のみを介して Use Case と通信する

### 4.3 Next.js App Router の位置づけ

Next.js の `app/` ディレクトリはプロジェクトルートの `src/app/` に置くことが Next.js の都合上必須です。本仕様ではこれを **Infrastructure 層の UI 入口** とみなし、3層構造を崩していないと解釈します。`src/app/` 配下では Use Case を直接呼び出すラッパ（Server Action）と最小限の JSX のみ記述し、ロジックは Application 層へ押し出します。

### 4.4 Server Action と Repository の結線

```
ユーザー操作（Client Component）
   ↓ Server Action 呼び出し
Server Action（src/app/actions/*.ts）   ← Infrastructure
   ↓ Use Case 呼び出し（DI）
Use Case（src/application/*）            ← Application
   ↓ Repository Interface（Domain定義）を呼び出し
Repository Impl（src/infrastructure/persistence/*） ← Infrastructure
   ↓ Supabase Client
Supabase（PostgreSQL / Auth / Storage / Realtime）
```

**DI 方針**：MVP では複雑な DI コンテナを導入せず、Server Action 側で Repository 実装を `new` してUse Case に渡す。後続フェーズで必要になれば `tsyringe` や手製 Composition Root に切り替える余地を残す。

### 4.5 ディレクトリ構造の骨格

```
tomokoi/
├── .github/workflows/         ← CI/CD
├── docs/                      ← 本技術仕様書群（00〜05）
├── src/
│   ├── app/                   ← Next.js App Router（UI入口、Infrastructure扱い）
│   ├── domain/                ← Domain層
│   ├── application/           ← Application層
│   ├── infrastructure/        ← Infrastructure層（UI部品・Adapter・Repository実装）
│   └── shared/                ← 横断的ユーティリティ・型・定数
├── supabase/
│   ├── migrations/            ← SQLマイグレーション
│   └── config.toml
├── public/                    ← 静的アセット（VRMプリセット等）
└── tests/                     ← ユニット・インテグレーション・E2E
```

完全版ツリーは **01_基盤構築.md §4** を参照。

---

## 5. 開発フェーズとチーム体制

### 5.1 フェーズ分解

| フェーズ | 期間 | 内容 | 担当 |
|---------|------|------|------|
| **Phase 0：基盤構築** | 4/13〜4/15（Day 1-3） | 1人で集中構築 | メンバーA |
| **Phase 1：PoC並列** | 4/16〜4/19（Day 4-7） | Week 1後半、4人並列開始 | A/B/C/D |
| **Phase 2：機能実装1** | 4/20〜4/26 | Week 2、中間発表 4/25 | A/B/C/D |
| **Phase 3：機能実装2** | 4/27〜5/3 | Week 3 GW集中開発 | A/B/C/D |
| **Phase 4：統合・デモ化** | 5/4〜5/10 | Week 4、最終発表 5/9〜5/10 | 全員 |

Phase 0 の3日間を **基盤担当1人**に委ねる理由は以下：

- 依存ライブラリ・環境変数・DBスキーマ・RLS・Realtime チャンネル命名・Server Action 規約が全員から触られる共通基盤であり、**初期に合議で決めると全員が待ち状態になる**
- 4/13〜4/15 に1人が集中決定 → 4/16 以降は「決定を受け入れる前提で並列作業」とすると、チーム全体のスループットが最大化する

### 5.2 4人の役割分担

| メンバー | 担当領域 | 主な成果物 | 担当ファイル |
|---------|---------|-----------|-----------|
| **A（基盤→スライド・管理）** | Day 1-3：基盤構築 / Day 4〜：スライド作成フロー + Gemini 3 Flash + PPTX + 管理画面 + 被紹介者確認 | スライド生成〜本番レンダリング〜お土産PPTX | **01_基盤構築.md** + **02_メンバーA_スライド・管理.md** |
| **B（アバター）** | VRM 3D描画 + MediaPipe表情 + アバター同期 + プレゼン画面レイアウト | プレゼン中・交流タイム・スタンバイ画面のアバター | **03_メンバーB_アバター.md** |
| **C（リアルタイム基盤）** | WebRTC音声 + Realtime（スライド同期・表情同期・スタンプ）+ 交流タイムUI（円卓） | イベント当日の配信・同期・エフェクト全般 | **04_メンバーC_リアルタイム.md** |
| **D（投票・マッチング・事後）** | 投票UI + k-partition 2-opt 実装 + テーブル案内 + マッチ通知 + 推薦フラグ + スタンプ集計 + 1:1チャット + 顔写真合意公開 | 投票からマッチ成立後のチャット・顔写真公開まで | **05_メンバーD_投票・マッチング・事後.md** |

### 5.3 並列作業時の合流点

| 合流点 | 内容 | 責任者 |
|--------|------|--------|
| **イベントルーム画面** | プレゼン中のスライド表示（A）× アバター表示（B）× スライド同期・スタンプ（C）× 投票導線（D） | C が画面レイアウト責任、A/B/D が部品供給 |
| **マッチング入力** | 投票データ（D）× 参加者性別属性（A：プロフィール、基盤）× イベント参加者リスト（基盤） | D が統合責任 |
| **スライド本番レンダリング** | スライド構造（A）× Realtime同期（C）× VRM両脇表示（B） | A がスライドコンポーネント、C が同期制御 |

---

## 6. 6ファイル構成とナビゲーション

| # | ファイル名 | 主な読者 | 内容 |
|---|-----------|---------|------|
| 00 | **概要.md**（本書） | 全員 | プロジェクト全体像、技術スタック、クリーンアーキテクチャ方針、6ファイルの索引 |
| 01 | **基盤構築.md** | メンバーA、全員（参照） | ディレクトリ構造完全版、DBスキーマ全テーブル、RLS、Server Action 規約、Repository 規約、CI/CD、Git運用、環境変数、引き渡しチェックリスト |
| 02 | **メンバーA_スライド・管理.md** | メンバーA | Slide/Deck の Domain・Application・Infrastructure 設計、Gemini 3 Flash 連携、PPTXエクスポート、被紹介者確認、主催者管理画面、内面エピソード誘導UI |
| 03 | **メンバーB_アバター.md** | メンバーB | VRM 3D描画、MediaPipe 表情トラッキング、ブレンドシェイプマッピング、リップシンク、プレゼン画面レイアウト、非アニメ風VRM選定プロセス、スマホPoC |
| 04 | **メンバーC_リアルタイム.md** | メンバーC | WebRTC 音声通話、Supabase Realtime スライド同期・表情同期、スタンプリアクション（エフェクト＋クールタイム）、交流タイム円卓UI、イベント進行ステートマシン |
| 05 | **メンバーD_投票・マッチング・事後.md** | メンバーD | 投票UI、k-partition 2-opt アルゴリズム、テーブル案内、マッチ通知、推薦フラグ、スタンプ集計・表彰、1:1チャット、顔写真相互公開（RLS設計詳細） |

読む順番：

- **最初にAが読む**：00 → 01（を書きながら固める） → 02
- **B/C/D は4/16以降に**：00 → 01（§4〜§16 は必読、他はリファレンス扱い） → 自分の担当ファイル

---

## 7. 命名・規約の横断ルール（全メンバー共通）

詳細は **01_基盤構築.md §12〜§15** に記載。ここでは骨子のみ：

- **ファイル名**：`kebab-case.ts`（例：`generate-slide-deck.use-case.ts`）
- **型・クラス名**：`PascalCase`
- **関数・変数名**：`camelCase`
- **定数**：`SCREAMING_SNAKE_CASE`
- **エンティティ**：`*.entity.ts`、値オブジェクト：`*.vo.ts`、Use Case：`*.use-case.ts`、Repository インターフェース：`*.repository.ts`、Repository 実装：`supabase-*.repository.ts`
- **Server Action**：`src/app/actions/<domain>/<action>.ts` で `"use server"` を必ず最初の行に記述
- **テーブル名**：`snake_case` 複数形（例：`slide_decks`、`match_messages`）
- **エラー**：Domain 層で定義した `DomainError` を継承し、Application 層で `Result<T, E>` 型に詰めて返す
- **Realtime チャンネル**：`<domain>:<resource>:<id>` 形式（例：`slide_sync:event:<eventId>`）

---

## 8. 用語集

| 用語 | 定義 |
|------|------|
| **紹介者（presenter）** | スライドを作成し、ピッチでメインを務めるユーザー。実名性が担保される側 |
| **被紹介者（introducee）** | 紹介者の友人で、スライドの主役となるユーザー。匿名性が担保される側 |
| **プレゼン枠** | 紹介者＋被紹介者のペアで参加する枠。被紹介者のみマッチング対象 |
| **オーディエンス枠** | 視聴と盛り上げ（スタンプ）のみ。マッチング対象外、投票権なし |
| **掛け合い型ピッチ** | 紹介者メイン＋被紹介者リアクションの2人進行ピッチ。v5.0で確定 |
| **スライドデッキ（SlideDeck）** | 5枚1組のスライド構造体。紹介ペアに1つ紐づく |
| **推薦フラグ** | 紹介者が最大3名に付けるマーク。UI表示用、アルゴリズム入力には含まれない |
| **はぐれ処理** | 参加人数が4で割り切れない際に、他テーブルを調整して3名テーブルを作ること |
| **スタンプ獲得総数** | プレゼン中に送られた4種のスタンプ合計。オーディエンス送信分も含む |
| **顔写真相互公開** | マッチ成立後、双方が合意ボタンを押した時のみチャット画面内に顔写真を表示する機能 |
| **Server Action** | Next.js App Router のサーバー側関数。`"use server"` で宣言 |
| **Use Case** | Application 層の単一責任のビジネスシナリオ単位。例：`GenerateSlideDeckUseCase` |

---

## 9. ドキュメント外の依存関係

以下は本仕様書の外で別途管理します。

- **VRM アセット選定リスト**：Week 2 前半までにチームレビューで確定、`docs/assets/vrm-preset-candidates.md` に記録（B 担当）
- **デモデー脚本**：最終発表の進行台本、`docs/demo-day-script.md` で管理（全員で合議）
- **事前録画ダミーペア**：Week 3 後半以降に撮影、動画ファイルは Vercel Blob か別途共有ドライブで管理（全員）
- **利用規約・コミュニティガイドライン**：運営管理画面に表示するテキスト、`docs/legal/` 以下で管理（A 担当、運営ロジックと近いため）

---

## 10. 参照

- 要件定義書 `tomokoi_spec_v5_3.md` 全章
- 本技術仕様書 `01_基盤構築.md`（共通基盤・DB・CI/CD）
- 本技術仕様書 `02_メンバーA_スライド・管理.md`
- 本技術仕様書 `03_メンバーB_アバター.md`
- 本技術仕様書 `04_メンバーC_リアルタイム.md`
- 本技術仕様書 `05_メンバーD_投票・マッチング・事後.md`
- Clean Architecture（Robert C. Martin, 2017）— 3層分割の依存ルール
- DDD戦術的設計（Evans, 2003）— エンティティ / 値オブジェクト / リポジトリ の用語定義
- Next.js 14 App Router 公式ドキュメント（Server Action / Route Handler の挙動）
- Supabase 公式ドキュメント（Auth / Realtime / Storage / RLS）

---
