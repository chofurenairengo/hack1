# トモコイ 技術仕様書 04 — メンバーC：リアルタイム基盤（Realtime + WebRTC + スタンプ + 状態遷移）

> メンバーCは **イベントの「生感」を司る全チャンネルのハブ**です。スライド同期・スタンプ・表情同期・音声・状態遷移（入場→プレゼン→投票→交流）のすべてがここを通ります。
> メンバーA（スライド）、B（アバター）、D（投票・マッチング）のすべてと接続点を持ち、障害が起きると全機能が止まるためリアルタイム系の **唯一の窓口** として責務を集約します。

---

## 1. 担当範囲

### 1.1 機能スコープ

- Supabase Realtime チャンネル全般の設計と実装
  - スライド同期（登壇ペアの操作を全観客に配信）
  - スタンプ送受信（4種絵文字、完全匿名、フロート演出）
  - 表情同期 Broadcast（Bが送る表情係数の配送経路）
  - イベント状態遷移（入場→プレゼン→投票→交流→次ラウンド）
  - 1:1 チャットの Broadcast 部分（Dと共同、チャンネルのみ C 管理）
- WebRTC 音声通信
  - プレゼン枠：登壇ペア 2 人の双方向音声 + 観客への一方向配信
  - 交流タイム：テーブル 3〜4 人のメッシュ型音声
- スタンプ集計（「盛り上がったで賞」自動算出のための非同期 DB 保存）
- 運営管理者画面の進行制御（状態遷移の手動トリガー）
- 会場 Wi-Fi / モバイル回線での接続性担保

### 1.2 スコープ外

- スライドの内容・生成・編集（A）
- アバター描画・表情トラッキング（B。Cは搬送路のみ）
- 投票 UI・マッチングアルゴリズム（D）
- 音声のエコーキャンセル・ノイズ除去（ブラウザ標準機能を使い、自前実装はしない）

### 1.3 信頼性目標

- スライド同期遅延：**登壇者操作 → 観客画面反映まで 500ms 以内**（99 パーセンタイル）
- スタンプ送受信遅延：**300ms 以内**
- 状態遷移のアトミック性：**管理者トリガー 1 回で全参加者の画面が 2 秒以内に切り替わる**
- イベント中の Realtime 切断から自動再接続まで：**5 秒以内**

---

## 2. Domain層設計

### 2.1 エンティティ

`src/domain/stamp/entities/`：

- **`Stamp`**：1 回のスタンプ送信
  - プロパティ：`id: StampId`、`eventId: EventId`、`roundNumber: number`、`presentationPairId: PairId`、`kind: StampKind`、`sentAt: Date`
  - 送信者は **記録しない**（匿名性担保のため）。
  - 不変条件：`kind` は `StampKind` 値オブジェクトの許容値のみ

`src/domain/event/entities/`：

- **`Event`**：イベント（既に A/D と共有するが、状態遷移の責務は C が握る）
  - プロパティ抜粋：`id`、`title`、`status: EventStatus`、`currentRound: number`、`currentPhase: EventPhase`
  - メソッド：`transitionTo(nextPhase)` — 遷移許容チェック

### 2.2 値オブジェクト

`src/domain/stamp/value-objects/`：

- **`StampKind`**：4 種の enum 相当
  - 値：`handshake`（🤝 いいコンビ）、`sparkle`（✨ 気になる）、`laugh`（😂 爆笑）、`clap`（👏 拍手）
  - DB の `stamps.kind` カラム制約と一致させる

`src/domain/event/value-objects/`：

- **`EventPhase`**：イベント進行フェーズ
  - 値：`pre_event`（開場前）、`entry`（入場・自己紹介）、`presentation`（プレゼン中）、`voting`（投票中）、`intermission`（集計中）、`mingling`（交流タイム）、`closing`（終了）
- **`EventStatus`**：全体ステータス（`draft` / `scheduled` / `live` / `finished` / `cancelled`）
- **`PhaseTransition`**：遷移定義（どの状態からどの状態に進めるか）
  - 例：`entry → presentation → voting → intermission → mingling → (次ラウンドあれば entry or presentation へ)` / `mingling → closing`

### 2.3 ドメインサービス

- **`EventPhaseTransitionService`**：状態遷移の正当性チェック
  - 「投票中に交流へ飛ぶのは不可」「プレゼン中に投票への移行は全ペア完了済のみ」等のルールを保持
  - 副作用なし（I/O は Application 層で実行）

### 2.4 リポジトリインタフェース

- `StampRepository`：`save(stamp)`、`countByPairInRound(eventId, round)` → 集計用
- `EventStateRepository`：`loadCurrent(eventId)`、`updatePhase(eventId, phase)`、`incrementRound(eventId)`

---

## 3. Application層設計

### 3.1 ユースケース

`src/application/stamp/use-cases/`：

- **`RecordStamp`**：スタンプ 1 回分の記録
  - 入力：`eventId`、`roundNumber`、`presentationPairId`、`kind`、（実行ユーザID：送信制限判定のみに使用、保存はしない）
  - 処理：(1) 送信可否チェック（登壇中ペア本人は自分達には不可など、§6.4）、(2) Broadcast 送信（Infrastructure 経由）、(3) DB へ非同期 INSERT（fire-and-forget、失敗時は warn ログのみ）
  - 戻り値：`ActionResult<void>`

`src/application/event/use-cases/`：

- **`AdvanceEventPhase`**：管理者によるフェーズ進行
  - 入力：`eventId`、`targetPhase`、`actorUserId`
  - 処理：管理者権限チェック → `EventPhaseTransitionService` で遷移許容確認 → DB 更新 → 状態 Broadcast → Dの `ComputeMatching` トリガー（`voting → intermission` 遷移時）
- **`StartNextRound`**：次ラウンド開始（ラウンドカウンタ +1 + フェーズを entry or presentation へ）
- **`ListActivePhase`**：現在のフェーズ取得（観客入場時の初期同期に使用）

`src/application/realtime/use-cases/`：

- **`BroadcastSlideSync`**：A の Server Action から呼ばれる。ペア登壇者のスライドめくり操作を観客へ配信
- **`JoinPresenterRoom`** / **`LeavePresenterRoom`**：登壇ペアの WebRTC 参加
- **`JoinBreakoutRoom`** / **`LeaveBreakoutRoom`**：交流タイムのテーブル参加
- **`AggregateStampsByPair`**：ラウンド終了時に各プレゼン枠のスタンプ数を集計し、D の受賞判定に渡す

### 3.2 ポート

- `RealtimeBroadcasterPort`（01 §9 で定義したものを利用）
- `EmailSenderPort` は C では使わない（D のみ）

---

## 4. Infrastructure層設計

### 4.1 ディレクトリ

```
src/infrastructure/realtime/
├── supabase-channel.factory.ts     # createChannel(name) ラッパー（シングルトン管理）
├── channels.ts                     # チャンネル名ユーティリティ（01 §10 準拠）
├── slide-sync.broadcaster.ts       # A が呼ぶ → 観客配信
├── slide-sync.subscriber.ts        # 観客側の受信 hook 用
├── stamp.broadcaster.ts
├── stamp.subscriber.ts
├── expression.broadcaster.ts       # B と共有（B の送信 / B の受信）
├── state.broadcaster.ts
├── state.subscriber.ts
├── chat.broadcaster.ts             # D と共有（Broadcast 部分のみ C 管理）
└── reconnection.manager.ts         # 切断検知と自動再接続

src/infrastructure/webrtc/
├── signaling.channel.ts            # Supabase Realtime Presence + Broadcast を利用
├── presenter-mesh.ts               # 登壇ペア 2名双方向 + 観客への一方向音声
├── breakout-mesh.ts                # 交流テーブル 3〜4名メッシュ
├── peer-connection.factory.ts      # RTCPeerConnection ラッパー（STUN/TURN 設定）
├── audio-track.manager.ts          # マイク取得・ミュート・デバイス切替
└── connection-stats.collector.ts   # デモ用の回線品質ログ

src/infrastructure/repositories/
├── supabase-stamp.repository.ts
└── supabase-event-state.repository.ts
```

### 4.2 Supabase Realtime チャンネル設計（詳細）

01 §10 で決めた命名規約（`<domain>:<resource>:<id>`）に従う。

| チャンネル名例 | 用途 | Payload 概要 | 送信者 | 受信者 | 推定ピーク頻度 |
|---------------|------|-------------|--------|--------|---------------|
| `event:<eventId>:state` | イベント全体のフェーズ同期 | `{ phase, round, startedAt }` | 管理者 | 全参加者 | 1 遷移/ラウンド |
| `event:<eventId>:slide-sync:<pairId>` | スライドめくり | `{ deckId, slideIndex, updatedAt }` | 登壇ペア | 全観客 | 〜10/分 |
| `event:<eventId>:stamp` | スタンプエフェクト | `{ pairId, kind, clientNonce }` | 観客 | 全参加者 | 〜20/秒（ピーク） |
| `event:<eventId>:expression:<pairId>` | 表情係数同期 | `{ userId, blendShapes, timestamp }` | 登壇者 | 観客 | 15fps 固定 |
| `breakout:<eventId>:<tableId>:signal` | WebRTC シグナリング | `{ type: offer/answer/candidate, from, to, sdp }` | テーブル参加者 | 同テーブル | 接続時のみバースト |
| `chat:<matchId>` | 1:1 チャット即時配信 | `{ messageId, senderId, text, sentAt }` | マッチ相手 | マッチ相手 | 〜5/分 |

#### 4.2.1 Presence の扱い

- `event:<eventId>:state` のみ Presence を有効化 → 現在の参加人数を管理画面に表示
- 他のチャンネルは Broadcast のみ（Presence のオーバーヘッドを避ける）

#### 4.2.2 Rate Limit 対策

- Supabase Realtime はクライアントあたり概ね 100 msg/秒でスロットリングされる
- スタンプは **クライアント側で 0.3〜0.5 秒のクールダウン** を設けて送信レートを抑える（§5.3）
- 表情係数は 15fps 固定（§6.4 B の送信レート仕様に準拠）

### 4.3 WebRTC シグナリング

- Supabase Realtime を転用（専用のシグナリングサーバは立てない）
- 手順：(1) 参加者がシグナリングチャンネルへ join、(2) Presence で参加者一覧把握、(3) 後から入った側が offer を送る、(4) answer / candidate を相互交換
- ICE 設定：
  - STUN：Google 公開 STUN（無料、`stun:stun.l.google.com:19302` 等）
  - TURN：**Week 3 に会場環境テストで必要性判定**。必要なら Metered または自前 coturn を環境変数で切替可能にしておく（`NEXT_PUBLIC_TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`）

### 4.4 音声ルーティング方針

- **プレゼン枠**（2 名登壇ペア）
  - ペア同士は双方向 P2P（メッシュ 2 人）
  - 観客へは **1 方向配信のみ**。ペア各々の MediaStream を観客ブラウザが別々に購読する形でシンプルに実装（SFU は立てない、MVP は 2 ストリーム直接配信で耐える）
  - 観客のマイクは全員ミュート固定（スタンプで反応）
  - 観客側の受信ストリーム数は 2（ペア 2 名分）で済む
- **交流タイム**（テーブル 3〜4 名）
  - フルメッシュ P2P。最大 4 名想定で接続数は 6 本、NAT 越えが必要な環境では TURN 経由にフォールバック
- **全般**
  - マイク権限は **プレゼン直前 / 交流タイム開始時** にリクエスト（ページロード時には要求しない＝ブロック回避）
  - iOS Safari は自動再生ポリシーに注意：音声要素に `playsInline` を付け、最初のユーザ操作後に `audio.play()` を呼ぶ

---

## 5. スタンプ詳細仕様

### 5.1 UI

- 画面下部に 4 個のスタンプボタン固定バー：🤝 ✨ 😂 👏
- ボタン押下 → 即座に画面中央下からエフェクトが浮上＋上昇しながらフェードアウト（1.2 秒）
- 自分が押した瞬間は少し大きく表示（フィードバック）
- **カウント表示なし**：累計数を数字で見せると「人気投票」化するため、要件定義書 §4.3 に従い完全匿名・数値非表示

### 5.2 ブロードキャスト挙動

- 送信者：チャンネルに Broadcast（`clientNonce` で自分の送信か判定し演出の出し分け）
- 受信者：同じチャンネルをサブスクライブし、各クライアントで独立にエフェクトを描画
- サーバ集計は別経路（後述）

### 5.3 送信制限

- クールダウン：同一種別は 0.3 秒、異種別は 0.1 秒（連打気持ちよさと DoS 防止の折衷）
- 送信可否：
  - 登壇中ペア本人 → 自分達が被写体のプレゼン枠には送信不可（自画自賛防止）
  - 登壇中ペア本人 → 他ペアのプレゼン枠には送信可能
  - オーディエンス枠 → 全プレゼン枠に送信可能
  - 判定は UI で disable する + Server Action でも検証（Broadcast は Use Case 経由）

### 5.4 集計（「盛り上がったで賞」用）

- Broadcast とは別に、Use Case 層で DB に非同期 INSERT（fire-and-forget）
- ラウンド終了時（`voting → intermission` 遷移時）に `AggregateStampsByPair` が走り、各ペアの総数を算出 → D に渡して `awards` テーブルへ格納
- DB INSERT 失敗は表示には影響しない（受賞集計のみ誤差が出る）— ログで監視

---

## 6. スライド同期詳細

### 6.1 登壇者側

- A の SlideRenderer（§02）のプレゼンモードで左右矢印キーまたはボタン押下
- Server Action `nextSlide` / `prevSlide` を呼ぶ
- Server Action 内で `BroadcastSlideSync` ユースケース経由で Realtime 配信

### 6.2 観客側

- 観客クライアントが `event:<eventId>:slide-sync:<pairId>` をサブスクライブ
- 受信時に SlideRenderer の `slideIndex` state を更新 → 即座に表示差し替え

### 6.3 遅延参加者の初期同期

- 観客がプレゼン途中で参加した場合、`slide_decks` テーブルの `current_slide_index`（A が Server Action 内で併せて更新）を読んで初期表示
- その後 Broadcast を購読

### 6.4 楽観的挙動と整合性

- Server Action が DB 更新と Broadcast を行う順序は **DB → Broadcast**
- DB 更新成功時のみ Broadcast が飛ぶ → 後発購読者の初期値と Broadcast 値が食い違わない

---

## 7. 表情同期（Bとの連携）

### 7.1 担当の切り分け

- Bの担当：MediaPipe から表情係数を取り出す / VRM ブレンドシェイプに適用する
- Cの担当：係数を Broadcast で相手に届ける / 受信した係数を B のコンポーネントに渡すイベントバス

### 7.2 Payload 仕様

- チャンネル：`event:<eventId>:expression:<pairId>`
- 頻度：15fps（B が送信側で間引き済み、C は素通し）
- ペイロード：`{ userId, weights: { happy, sad, angry, relaxed, surprised, aa, ih, ou, ee, oh }, lookAt: { x, y } | null, ts }`
- サイズ圧縮：数値を小数 2 桁に丸める（B 側で round、C では追加加工しない）

### 7.3 受信側の補間

- 受信は非等間隔になり得るので B のコンポーネントが `lerp` 補間。C は **生データをそのまま渡すだけ**

---

## 8. 交流タイム（円卓）

### 8.1 全体フロー

1. 投票締切 → `voting → intermission` 遷移
2. D の `ComputeMatching` ユースケースがテーブル割当を決定し `tables` / `table_members` に格納
3. `intermission → mingling` 遷移時、各参加者は自分の `table_members` レコードからテーブル ID を取得
4. C がそのテーブル ID で breakout チャンネル（`breakout:<eventId>:<tableId>:signal`）に join
5. B の `RoundtableScene` がテーブルメンバー 3〜4 名分のアバターを円形配置し、C が供給する各メンバーの MediaStream をリップシンクのソースに流す

### 8.2 UI

- 画面中央にテーブル俯瞰ビュー（B のシーン）
- 下部にメンバー名（本名 or ニックネームは §10 のポリシーに従う。MVP はニックネーム表示）
- ミュート / マイクデバイス切替ボタン

### 8.3 終了

- 管理者が `mingling → closing` へ遷移（または次ラウンド運用なら `mingling → entry`）
- 各クライアントは breakout チャンネルから leave、RTCPeerConnection を close

---

## 9. イベント状態遷移

### 9.1 遷移図

```
pre_event → entry → presentation → voting → intermission → mingling
                        ↑                                        |
                        └──────── (複数ラウンド運用時) ─────────┘
                                                                 ↓
                                                              closing
```

### 9.2 トリガー主体

| 遷移 | トリガー | 自動/手動 |
|------|---------|-----------|
| `pre_event → entry` | 管理者 | 手動 |
| `entry → presentation` | 管理者（全員入場確認後） | 手動 |
| `presentation → voting` | 管理者（全ペア発表完了後） | 手動 |
| `voting → intermission` | 管理者 or 締切時刻 | 手動優先 |
| `intermission → mingling` | 自動（`ComputeMatching` 完了時） | 自動 |
| `mingling → closing` | 管理者 or タイマー | 手動優先 |

### 9.3 管理者コンソール

- `/admin/events/[eventId]/console`
- 現在のフェーズ、参加者人数（Presence ベース）、次フェーズボタン、スタンプ累計、直近のエラーログ
- 「強制リセット」「フェーズ戻し」も用意（ただし DB 更新＋Broadcast 再送）

### 9.4 全クライアントの同期反映

- 状態 Broadcast を受け取ったら：
  - `presentation` → SlidePlayer 起動
  - `voting` → 投票 UI 表示（D）
  - `mingling` → テーブル Scene 起動（B） & WebRTC join（C）
  - その他は適切な待機画面

---

## 10. チャット Broadcast（Dと共有）

- チャンネル：`chat:<matchId>`
- C が Broadcast の仕組みを提供（`chat.broadcaster.ts`）
- D が Use Case / DB 書き込み（履歴保存） / UI / 報告・ブロックを担当
- リアルタイム配信失敗時も DB の履歴からポーリングで回復可能にする（MVP：Broadcast 優先、フォールバックはなし。Week 4 に判断）

---

## 11. UI 画面と責務（C が触るもの）

| 画面 | ファイル | 主要コンポーネント |
|------|---------|-------------------|
| イベントライブ基盤 | `src/app/(app)/events/[id]/live/layout.tsx` | `<EventStateProvider>`（Cが提供）で子画面に現在フェーズを供給 |
| 観客プレゼン画面 | `src/app/(app)/events/[id]/live/presentation/page.tsx` | `<SlidePlayer>`（A提供）+ `<AvatarPanel>`（B提供）+ `<StampBar>`（C）+ `<FloatingStampLayer>`（C） |
| 登壇画面 | `src/app/(app)/events/[id]/live/presenter/page.tsx` | `<PresenterControls>`（スライド送り）+ `<MicControls>`（C） |
| 交流タイム | `src/app/(app)/events/[id]/live/mingling/page.tsx` | `<RoundtableScene>`（B）+ `<MicControls>`（C）+ `<StampBar>`（無効化 or 省略） |
| 管理者コンソール | `src/app/(admin)/admin/events/[id]/console/page.tsx` | `<PhaseSwitcher>`、`<ParticipantCounter>`、`<RealtimeLog>` |

---

## 12. Server Action 設計（Cが実装するもの）

| Action | 実体の Use Case | 呼び出し元 |
|--------|-----------------|-----------|
| `src/app/actions/event/advance-phase.ts` | `AdvanceEventPhase` | 管理者コンソール |
| `src/app/actions/event/start-next-round.ts` | `StartNextRound` | 管理者コンソール |
| `src/app/actions/stamp/record-stamp.ts` | `RecordStamp` | 観客画面 `<StampBar>` |
| `src/app/actions/slide/broadcast-sync.ts` | `BroadcastSlideSync` | A のスライド送り Action が内部呼出 |
| `src/app/actions/webrtc/join-presenter-room.ts` | `JoinPresenterRoom` | 登壇画面 |
| `src/app/actions/webrtc/join-breakout.ts` | `JoinBreakoutRoom` | 交流画面 |

01 §8 の Server Action 規約（`"use server"`、`ActionResult<T>`、zod 入力検証、Use Case 1 回だけ呼ぶ）に従う。

---

## 13. DB テーブルと RLS（C が関与するもの）

| テーブル | 用途 | 主な RLS |
|----------|------|---------|
| `events` | フェーズ・状態 | SELECT：全ユーザ可（公開情報）／ UPDATE：管理者のみ |
| `stamps` | スタンプログ（受賞集計用） | INSERT：認証済みユーザ（送信者は記録しない）／ SELECT：管理者と集計ロールのみ |
| `presentation_pairs` | プレゼンペア | SELECT：イベント参加者／ UPDATE：管理者のみ |

RLS の詳細は 01 §6 参照。スタンプについて **送信者 ID を記録しない** ことで、行レベルで誰が押したかが漏れないようにする（匿名性を DB 層で保証）。

---

## 14. ローカル開発 / デバッグ

- **2 タブエコーテスト**：同一 Realtime チャンネルを 2 タブで購読し、片方から Broadcast を飛ばして反映を確認（毎日の smoke test）
- **WebRTC ローカル検証**：Chrome + Firefox の 2 ブラウザでループバック接続
- **Supabase Realtime Inspector**：Supabase ダッシュボードの Realtime タブで生のメッセージを観察
- **Connection Stats ログ**：`connection-stats.collector.ts` が `RTCPeerConnection.getStats()` を 10 秒おきに取り、デモ当日の品質ログとして console に流す
- **疑似遅延**：Chrome DevTools の Network スロットリング + `setTimeout` での Broadcast 遅延注入オプション（環境変数 `NEXT_PUBLIC_RT_DEBUG_DELAY_MS`）

---

## 15. 他メンバーとの連携点

- **A（スライド）**：スライド送り Server Action の内部で `BroadcastSlideSync` を呼ぶ。Payload スキーマ（`{ deckId, slideIndex, updatedAt }`）は A と合意して型定義を `src/domain/event/value-objects/slide-sync.payload.ts` に置き両者参照
- **B（アバター）**：
  - 表情：C は `event:<eventId>:expression:<pairId>` の Broadcast / Subscribe のみ提供、B が使う hook `useExpressionBroadcast` の下回り
  - 音声：C が提供する `useRemoteAudioStream(peerId)` から B の `useLipSync` が RMS を計算
- **D（投票・マッチング）**：
  - `voting → intermission` 遷移で `ComputeMatching` が自動起動する発火点を C が所有
  - 結果テーブル配置の完了通知を受けて C が `intermission → mingling` を自動遷移
  - チャット：C が Broadcast チャンネルを提供、D が履歴 DB とマッチ判定

---

## 16. テスト方針

- **Domain**：`EventPhaseTransitionService` の遷移許容表を全パターン網羅テスト
- **Application**：`AdvanceEventPhase` の管理者権限チェック、`RecordStamp` の送信制限チェック
- **Infrastructure**：Supabase Realtime モック（`@supabase/supabase-js` の channel をスタブ）で Broadcaster/Subscriber のシリアライズ確認
- **E2E**：Playwright で「観客タブ＋登壇タブ」を起動し、スライド送り・スタンプ送信・状態遷移を検証（Week 4）
- **負荷**：20 同時接続で 1 分間スタンプ連打 → Realtime rate limit に抵触しないことを確認

---

## 17. スケジュール（4 週間）

| 週 | C のタスク | 完了基準 |
|----|-----------|---------|
| Week 1（4/13-19） | 基盤引き渡し後すぐ、Realtime 2タブエコー PoC、スライド同期 Payload 決定 | 2タブでスタンプ・スライド同期が動く |
| Week 2（4/20-26） | 状態遷移 DB + Broadcast、管理者コンソール骨格、WebRTC 音声 PoC（2人） | 管理者がフェーズを進めると全員の画面が切り替わる |
| Week 3（4/27-5/3） | スタンプ送信制限・集計、breakout メッシュ、表情チャンネル結線、チャット Broadcast | 模擬イベント通し稼働（B/D 統合） |
| Week 4（5/4-10） | 負荷試験、会場 Wi-Fi 実機検証、TURN 導入判定、障害時の再接続UX磨き | デモ環境で 20 人参加の通しリハ完了 |

---

## 18. リスクと緩和策

| リスク | 緩和策 |
|--------|--------|
| 会場 Wi-Fi で WebRTC P2P が張れない | TURN サーバ切替を事前導入、観客音声はそもそも OFF なので影響限定、プレゼンペアのみダウンするシナリオはスマホテザリングフォールバック |
| Realtime rate limit に観客多数で抵触 | スタンプクールダウン、表情係数 15fps 上限、観客側 Broadcast は受信のみ |
| iOS Safari の自動再生ブロックで音声が出ない | 入場時に「開始」ボタンで `audio.play()` を initiate、`playsInline` 必須 |
| Supabase Realtime 障害 | 状態遷移は DB 直読みでも復旧可能にする（フェーズ表示は `events.current_phase` を最終的な真実とする） |
| スタンプ DoS（botが大量送信） | 認証必須 + クライアント側クールダウン + Server Action 側でも簡易レート制限（同一ユーザ 1 秒 5 回まで）|
| 観客ブラウザのメモリ／CPU負荷（スライド＋VRM＋スタンプ＋音声） | B と連携してスマホ時はフレームレート抑制、スタンプエフェクトは同時発生上限 30 個 |

---

## 19. 参照

- 要件定義書 `tomokoi_spec_v5_3.md` §4.3（スタンプ仕様）§5（イベント進行フロー）§6.3（スライド同期）§7.2（リアルタイム機能）§7.3（WebRTC音声）§8.2（通信技術スタック）§9.2（役割分担）§13（リスク）
- 本技術仕様書 `00_概要.md` §5.2（役割分担）§7（命名規約）
- 本技術仕様書 `01_基盤構築.md` §6（DBスキーマ）§7（RLS）§8（Server Action規約）§9（ポート）§10（Realtimeチャンネル設計）
- 本技術仕様書 `02_メンバーA_スライド・管理.md` §6（SlideRenderer）§7（Server Action：スライド送り）
- 本技術仕様書 `03_メンバーB_アバター.md` §7（表情同期 Payload 仕様）§8（リップシンク外部入力）
- 本技術仕様書 `05_メンバーD_投票・マッチング・事後.md` §4（マッチング計算発火点）§7（テーブル配置）§9（チャット履歴 DB）
- Supabase Realtime 公式ドキュメント（Broadcast / Presence / Rate Limit）
- WebRTC 仕様（W3C）および MDN RTCPeerConnection ドキュメント
- Next.js Server Actions 公式ドキュメント

---
