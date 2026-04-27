# トモコイ 技術仕様書 05 — メンバーD：投票・マッチング・事後コミュニケーション

> メンバーDは **プロダクトの「答え合わせ」を担当** します。投票 → テーブル割り振り（制約付き k-partition + 2-opt） → マッチ成立 → 通知 → チャット → 顔写真相互公開まで、参加者にとっての "成果" の経路すべてを所有します。
> マッチングアルゴリズムは **ドメインロジックの中核** であり、純粋 TypeScript 関数として Domain 層に配置、Next.js Server Action 経由で Vercel 上で実行されます（Cloud Run・別サーバは使わない）。
> 顔写真は **本人しか見られない RLS** を前提に、相互同意後のみ 10 分 TTL の署名付きURLで一時的に解禁する、慎重なフローを要します。

---

## 1. 担当範囲

### 1.1 機能スコープ

- 投票 UI（0〜3 名を優先順位付きで秘密投票）
- 推薦フラグ（紹介者が被紹介者のために最大 3 名を「おすすめ」として示す、アルゴリズムには入力しない）
- 制約付き k-partition + 2-opt マッチングアルゴリズム（純粋 TypeScript 関数）
- テーブル割り振り UI（自分のテーブル案内 / 交流開始画面）
- マッチ成立判定（相互投票 → `matches` レコード生成）
- マッチ通知（Resend 経由のメール。プッシュ通知は MVP 外）
- 「盛り上がったで賞」等のアワード確定・表示（スタンプ集計は C から受領）
- 1:1 チャット（Postgres 履歴 + 通報・ブロック。Broadcast 搬送路は C 提供）
- プロフィール写真アップロード・保存（プライベート Storage）
- 顔写真相互公開の同意管理・署名付きURL発行
- 通報・ブロック機能

### 1.2 スコープ外

- 投票の結果集計表示のライブ演出（C の管理者コンソール側）
- スタンプ送受信そのもの（C）
- スライド・プレゼン・登壇画面（A）
- アバター・表情・音声（B / C）

### 1.3 品質目標

- マッチング計算：20 名規模で Vercel Server Action のタイムアウト（10 秒）に余裕を持って収まる
- 投票の秘匿性：投票者 ID は当人以外（管理者含む）が参照不可（RLS で担保）
- 顔写真の漏洩防止：URL が流出しても 10 分後には無効化される
- マッチ通知メール：マッチ確定後 2 分以内に到達

---

## 2. Domain層設計

### 2.1 エンティティ

`src/domain/matching/entities/`：

- **`Vote`**：1 名分の投票
  - プロパティ：`id`、`eventId`、`voterId`、`voteeId`、`priority: 1 | 2 | 3`、`createdAt`
  - 不変条件：`voterId != voteeId`、同一 `(eventId, voterId, voteeId)` は一意、1 voter の `priority` は重複しない（3 件まで）
- **`Table`**：交流テーブル
  - プロパティ：`id`、`eventId`、`roundNumber`、`seatCount: 3 | 4`
- **`TableMember`**：テーブル所属
  - プロパティ：`tableId`、`userId`、`gender`
- **`Recommendation`**：紹介者による推薦フラグ（参考情報、アルゴリズム非入力）
  - プロパティ：`id`、`eventId`、`introducerId`、`introduceeId`、`recommendedUserId`、`rank: 1 | 2 | 3`

`src/domain/match/entities/`：

- **`Match`**：相互マッチ
  - プロパティ：`id`、`eventId`、`userAId`、`userBId`、`createdAt`、`status: active | blocked | reported`
  - 不変条件：`userAId < userBId` を強制（DB CHECK 制約と一致、順序を決めて重複防止）
- **`MatchMessage`**：チャットメッセージ
  - プロパティ：`id`、`matchId`、`senderId`、`body: string`、`sentAt`
  - 不変条件：`body` は 1〜1000 文字、`senderId` は `matches.userAId` または `userBId`
- **`PhotoConsent`**：顔写真公開同意の状態
  - プロパティ：`matchId`、`userId`、`state: pending | consented | revoked`、`updatedAt`
- **`Report`**：通報
  - プロパティ：`id`、`reporterId`、`targetUserId`、`matchId?`、`messageId?`、`reason`、`createdAt`
- **`BlockRelation`**：ブロック
  - プロパティ：`blockerId`、`blockedId`、`createdAt`
- **`Award`**：受賞
  - プロパティ：`id`、`eventId`、`roundNumber`、`pairId`、`kind: most_hyped | best_pitch | ...`、`score`

### 2.2 値オブジェクト

- **`VoteSet`**（`src/domain/matching/value-objects/`）：1 参加者が 1 ラウンドで出す投票の集合（最大 3 件、優先順位重複禁止のルールを内包）
- **`Gender`**：`female` / `male` / `other`（マッチング計算のバランスに使用。`other` はバランス制約から除外し、残った席に適宜配置）
- **`TableAssignmentPlan`**：計算結果の値オブジェクト
  - 構造：`tables: { seatCount, members: UserId[] }[]`、`leftovers: UserId[]`（はぐれ発生時）、`score: number`

### 2.3 ドメインサービス：マッチングアルゴリズム

`src/domain/matching/services/k-partition-2-opt.service.ts`

**責務**：純粋 TypeScript 関数。副作用なし、I/O なし、Date/Math.random の直接呼び出しも避ける（乱数はシード渡し）。

#### 2.3.1 入力

- `voters`：`{ userId, gender }[]`
- `votes`：`{ voterId, voteeId, priority }[]`
- `exclusionPairs`：同テーブルに入れたくないペア（登壇ペア同士など）
- `seatPolicy`：テーブルあたり 3〜4 名、男女基本 2:2、はぐれ処理として `2m1f` / `1m2f` / `3m0f` / `0m3f`（2:2 不成立時の緩和順序）
- `seed`：再現性のための乱数シード

#### 2.3.2 出力

- `TableAssignmentPlan`（§2.2）

#### 2.3.3 制約

- **硬制約**（必ず満たす）：全員が 1 テーブルに属する／テーブル人数 3〜4 名／`exclusionPairs` に入っているペアは同テーブル不可
- **軟制約**（最大化・最小化）：男女バランス 2:2 を最大、相互投票ペアの同席を最大（優先順位による重み付け）
- **優先度重み**：`mutualWeight[priority1 × priority2]` を設計
  - 例：お互い 1 位 = 9 点 / 1 位×2 位 = 6 / 2 位×2 位 = 4 / 1 位×3 位 = 3 / 2 位×3 位 = 2 / 3 位×3 位 = 1 / 片方のみ投票 = 0.2（促進でなく軽いヒント）

#### 2.3.4 アルゴリズムフロー

1. **初期解の生成**：男女交互にランダムシャッフルして 3〜4 人ずつ分配（seed 固定）
2. **2-opt 反復**：
   - ランダムに 2 テーブルを選び、一方のメンバー 1 名と他方のメンバー 1 名を交換した場合のスコアを計算
   - 改善する場合のみ採用
   - 硬制約違反の交換は即棄却（`exclusionPairs`、人数範囲外）
3. **最大反復**：`N * 200`（N=参加人数）または連続 `50` 回改善なしで早期終了
4. **複数シードでのリトライ**：`seed=1..5` で回し、最良スコアを採用（実行時間は合計で 1 秒以内目標）
5. **はぐれ処理**：2:2 が成立しない場合、`seatPolicy` に従って 2m1f / 1m2f / 3m0f / 0m3f を許容、`leftovers` に記録（ただし全員配置は硬制約として守る）

#### 2.3.5 計算量・性能見積もり

- 1 反復あたり：テーブル選択 O(1) + スコア差分計算 O(テーブル人数²) ≒ 数十演算
- 20 名なら `N * 200 = 4000` 反復 × 5 seed = 20000 反復、1 演算あたりマイクロ秒オーダーなら **合計 100ms〜300ms**
- 40 名まで拡張しても 1 秒以内見込み、Vercel Server Action 10 秒タイムアウトに十分収まる

#### 2.3.6 単体テスト

- ドメインサービスは I/O を持たないため、固定入力に対して期待出力を厳密検証可能
- テストフィクスチャ：8 名 / 12 名 / 16 名 / 20 名、全員相互投票 / 誰も投票しない / 一方通行のみ
- 検証観点：人数制約、男女バランス（許容範囲）、`exclusionPairs` 遵守、スコアが初期解より悪くならない

### 2.4 リポジトリインタフェース

- `VoteRepository`：`save(vote)`、`listByEvent(eventId)`、`findByVoter(eventId, voterId)`
- `RecommendationRepository`：`save`、`listByEvent`、`listByIntroducee(introduceeId)`
- `TableRepository`：`saveAssignment(plan)`、`findByUser(eventId, userId)`
- `MatchRepository`：`createIfMutual(...)`、`listByUser(userId)`、`findById(matchId)`
- `MatchMessageRepository`：`save`、`listByMatch(matchId, pagination)`
- `PhotoConsentRepository`：`upsert`、`get(matchId, userId)`、`revoke`
- `ReportRepository`：`save`
- `BlockRepository`：`save`、`isBlocked(a, b)`
- `AwardRepository`：`save`、`listByEvent`

---

## 3. Application層設計

### 3.1 投票系ユースケース

`src/application/matching/use-cases/`：

- **`SubmitVote`**：投票の保存
  - 入力：`eventId`、`voterId（認証ユーザ）`、`votes: { voteeId, priority }[]`
  - 処理：VoteSet で不変条件検証 → 既存投票があれば上書き（差分 upsert） → 保存
- **`SubmitRecommendation`**：紹介者の推薦フラグ
  - 入力：`eventId`、`introducerId`、`introduceeId`、`recommendations: { userId, rank }[]`
  - 処理：紹介者本人であること、被紹介者が自分のプレゼン対象であることを検証 → 保存
- **`ListMyVotes`**：自分の投票を読み戻す（RLS で自分のだけ見える）

### 3.2 マッチング計算

- **`ComputeMatching`**
  - 入力：`eventId`、`roundNumber`
  - 処理：
    1. `events.status` が `intermission` であることを確認
    2. `voters` = `event_entries` の audience+presenter を取得
    3. `votes` = `votes` テーブル（RLS を **service role** でバイパスして全投票を取得：この Use Case のみ service role client を使う）
    4. `exclusionPairs` = 登壇ペア `presentation_pairs` を除外対象に
    5. `KPartition2OptService.execute(...)` を呼ぶ
    6. 結果を `TableRepository.saveAssignment` でトランザクション内で書き込み
    7. 完了を C のイベント状態サービスに通知（`intermission → mingling`）
  - エラー：計算失敗時はトランザクションを rollback し `voting` に戻さず、管理者にエラー表示（再実行可能）

### 3.3 マッチ成立・通知

- **`FinalizeMatches`**（全ラウンド終了時、管理者が発火）
  - 入力：`eventId`
  - 処理：全ラウンドの投票を集め、`(A→B かつ B→A)` を検出 → `matches` テーブルに `userA<userB` で INSERT（ON CONFLICT DO NOTHING）→ 両者にメール通知 Use Case を呼ぶ
- **`NotifyMatchByEmail`**
  - 入力：`matchId`
  - 処理：`matches` と両ユーザの email を読む → `EmailSenderPort.send(...)`（Resend アダプタ）

### 3.4 テーブル案内

- **`GetMyTable`**：自分の所属テーブル取得（交流画面初期表示）
  - 入力：`eventId`、`userId`
  - 戻り値：テーブル ID + メンバー一覧（アバタープリセットキー同梱、B が円卓配置に使用）

### 3.5 アワード

- **`ComputeStampAward`**：C からスタンプ集計結果を受け取り `awards` に記録
  - 入力：`eventId`、`roundNumber`、`stampAggregates: { pairId, totalCount }[]`
  - 処理：最多を `most_hyped` として受賞、同点時は早い時刻優先（※簡易）
- **`ListAwards`**：イベント終了画面で表示

### 3.6 チャット

- **`SendMessage`**
  - 入力：`matchId`、`senderId`、`body`
  - 処理：マッチ参加者であることを検証 → ブロック関係なら拒否 → `MatchMessage` 保存 → `chat.broadcaster`（C 提供）で Broadcast
- **`ListMessages`**：マッチ画面初期表示用（直近 50 件、追加読み込みでページング）
- **`ReportMessage`**：通報登録 + 対象メッセージにフラグ
- **`BlockUser`**：ブロック関係追加 + 既存マッチを `blocked` 状態に
- **`UnmatchByReport`**（管理者のみ）：通報調査後の強制解除

### 3.7 プロフィール写真・顔写真公開

- **`UploadProfilePhoto`**
  - 入力：`userId`、`file`
  - 処理：Storage `private-profile-photos/<userId>/<uuid>.jpg` に保存 → `profile_photos` レコード作成（`is_primary=true` を 1 件だけに保つ）
- **`ConsentToReveal`**
  - 入力：`matchId`、`userId`
  - 処理：`PhotoConsent` を `consented` に upsert → 相手も `consented` なら「公開可能」状態が成立
- **`RevokeReveal`**
  - 入力：`matchId`、`userId`
  - 処理：`PhotoConsent` を `revoked` に。以降の `RequestRevealUrl` は失敗
- **`RequestRevealUrl`**（相手の写真を見るたびに呼ぶ）
  - 入力：`matchId`、`requesterId`
  - 処理：
    1. 両者の `PhotoConsent` が `consented` を **service role で** 検証（RLS をバイパスする唯一のユースケース）
    2. 相手の `profile_photos.is_primary=true` の `storage_path` を取得
    3. Supabase Storage `createSignedUrl(path, expiresIn=600)` で 10 分 TTL の URL を発行
    4. URL と有効期限を返す
  - クライアント：取得した URL で `<img>` 表示、10 分経過で自動的にスピナーに戻し、押下で再発行

### 3.8 ポート

- `EmailSenderPort`（01 §9 定義）：`send({ to, templateId, vars })`
- `SignedUrlIssuerPort`（01 §9 定義）：`issue({ bucket, path, ttlSeconds })`

---

## 4. Infrastructure層設計

### 4.1 ディレクトリ

```
src/infrastructure/repositories/
├── supabase-vote.repository.ts
├── supabase-recommendation.repository.ts
├── supabase-table.repository.ts
├── supabase-match.repository.ts
├── supabase-match-message.repository.ts
├── supabase-photo-consent.repository.ts
├── supabase-report.repository.ts
├── supabase-block.repository.ts
├── supabase-award.repository.ts
└── supabase-profile-photo.repository.ts

src/infrastructure/email/
├── resend-email.adapter.ts          # EmailSenderPort 実装
└── templates/
    ├── match-notification.ts        # 件名・本文テンプレート（React Email 形式 or プレーン文字列）
    └── report-received.ts

src/infrastructure/storage/
├── supabase-signed-url.adapter.ts   # SignedUrlIssuerPort 実装
└── profile-photo.uploader.ts

src/infrastructure/matching/
└── service-role-client.ts           # service role key を使う Supabase クライアント（環境変数は 01 §5）
                                     # ComputeMatching / RequestRevealUrl 専用、import は Application 層からのみ許可
```

### 4.2 Repository の原則（01 §8.3 準拠）

- Domain のエンティティと Supabase のテーブル行を双方向変換する mapper を各リポジトリ内に private 関数として持つ
- Supabase の型を Domain 側へ leak させない
- `service-role-client.ts` は **明示的に import された Use Case からのみ使う**。ESLint で制限（`no-restricted-imports`）

### 4.3 Resend アダプタ

- 環境変数：`RESEND_API_KEY`
- 送信先：`match-notification` テンプレートを相手情報で埋めて両者に送る
- 失敗時：3 回までリトライ（指数バックオフ）、最終失敗は `email_delivery_failures` にログ記録（後日手動再送可能）

### 4.4 署名付きURL発行アダプタ

- 実装：`supabase.storage.from(bucket).createSignedUrl(path, ttl)`
- TTL：`RequestRevealUrl` では固定 600 秒（10 分）
- 監査：発行ログを `signed_url_issuances` テーブルに記録（後日の漏洩調査用）

---

## 5. UI 画面と責務

| 画面                       | ファイル                                                                | 主要コンポーネント                                                          |
| -------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 紹介者：推薦フラグ         | `src/app/(app)/introductions/[introductionId]/recommendations/page.tsx` | `<RecommendationPicker>` 最大 3 名選択、ランク指定                          |
| 投票画面（交流タイム直前） | `src/app/(app)/events/[id]/live/voting/page.tsx`                        | `<VotingSheet>`：候補者カード一覧＋ドラッグで 1〜3 位に配置、送信ボタン     |
| 自分のテーブル案内         | `src/app/(app)/events/[id]/live/table/page.tsx`                         | `<TableBadge>`（テーブル番号大表示）、`<TableMemberList>`                   |
| マッチ一覧                 | `src/app/(app)/matches/page.tsx`                                        | `<MatchCard>` 一覧、未読バッジ                                              |
| マッチ詳細                 | `src/app/(app)/matches/[matchId]/page.tsx`                              | `<ChatWindow>`、`<PhotoRevealCard>`（同意状態と「お互い同意で表示」ボタン） |
| チャット                   | `src/app/(app)/chat/[matchId]/page.tsx`                                 | `<MessageList>`、`<Composer>`、通報・ブロックメニュー                       |
| プロフィール写真設定       | `src/app/(app)/settings/photo/page.tsx`                                 | `<PhotoUploader>`、`<PrimarySelector>`                                      |
| 公開同意設定               | `src/app/(app)/matches/[matchId]/consent/page.tsx`                      | `<ConsentToggle>`、取り消し注意表記                                         |
| イベント終了アワード表示   | `src/app/(app)/events/[id]/awards/page.tsx`                             | `<AwardList>`、A が提供する `<SlideThumbnail>` を使う                       |
| 管理者：通報一覧           | `src/app/(admin)/admin/reports/page.tsx`                                | `<ReportList>`、対応状況                                                    |

### 5.1 投票 UI 詳細

- 候補者：そのラウンドで発表があったペア 2 名 × ペア数
- 操作：「気になる」ボタン長押し or ドラッグで 1 位 / 2 位 / 3 位スロットへ。0 名送信も許容
- 表示：**推薦フラグが立っている相手には小さいバッジ**（「紹介者のおすすめ」）を表示、ただし優先順位は本人に委ねる
- 送信：1 回のみ（送信後は変更不可 — MVP では締切まで再送可にするかは運用判断）
- **オーディエンス枠は投票不可**：UI は閲覧のみ

### 5.2 顔写真公開カード

- 初期状態：プレースホルダ画像 + 「相手も同意したら写真が表示されます」
- 自分未同意：大きく「同意する」ボタン
- 自分のみ同意済：「相手の同意を待っています」
- 両者同意済：署名付きURLで写真表示、10 分で自動ぼかし → 「もう一度見る」で再発行
- 取り消しリンク：いつでも押せる（確認ダイアログあり）

---

## 6. Server Action 設計

| Action                                     | Use Case               | 呼び出し元                                                       |
| ------------------------------------------ | ---------------------- | ---------------------------------------------------------------- |
| `src/app/actions/vote/submit-vote.ts`      | `SubmitVote`           | `<VotingSheet>`                                                  |
| `src/app/actions/recommendation/submit.ts` | `SubmitRecommendation` | `<RecommendationPicker>`                                         |
| `src/app/actions/matching/compute.ts`      | `ComputeMatching`      | C の状態遷移から内部呼出 / 管理者コンソール                      |
| `src/app/actions/matching/finalize.ts`     | `FinalizeMatches`      | 管理者コンソール                                                 |
| `src/app/actions/match/notify-email.ts`    | `NotifyMatchByEmail`   | `FinalizeMatches` 内部呼出（Action ではなく App 層ヘルパ化も可） |
| `src/app/actions/table/get-my-table.ts`    | `GetMyTable`           | 交流画面                                                         |
| `src/app/actions/chat/send-message.ts`     | `SendMessage`          | `<Composer>`                                                     |
| `src/app/actions/chat/list-messages.ts`    | `ListMessages`         | `<ChatWindow>`                                                   |
| `src/app/actions/chat/report-message.ts`   | `ReportMessage`        | メッセージメニュー                                               |
| `src/app/actions/user/block.ts`            | `BlockUser`            | プロフィールメニュー                                             |
| `src/app/actions/profile/upload-photo.ts`  | `UploadProfilePhoto`   | 写真設定画面                                                     |
| `src/app/actions/consent/agree.ts`         | `ConsentToReveal`      | 同意カード                                                       |
| `src/app/actions/consent/revoke.ts`        | `RevokeReveal`         | 同意設定                                                         |
| `src/app/actions/consent/reveal-url.ts`    | `RequestRevealUrl`     | 写真表示ロード時                                                 |
| `src/app/actions/award/compute-stamp.ts`   | `ComputeStampAward`    | C の集計完了トリガー                                             |

すべて 01 §8 の規約に従う。`ComputeMatching` と `RequestRevealUrl` のみ、service role クライアントを内部で利用する。

---

## 7. DB テーブルと RLS（D が所管するもの）

01 §6 / §7 で定義したテーブルのうち、D が書き込みを伴うもの：

| テーブル                   | 主要カラム                                                                  | RLS INSERT                                                            | RLS SELECT                                                                          |
| -------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `votes`                    | `event_id`, `voter_id`, `votee_id`, `priority`                              | `voter_id = auth.uid()`                                               | `voter_id = auth.uid()` のみ（※ `ComputeMatching` は service role でバイパス）      |
| `recommendations`          | `event_id`, `introducer_id`, `introducee_id`, `recommended_user_id`, `rank` | `introducer_id = auth.uid()`                                          | 紹介者本人 / 被紹介者本人 / イベント管理者                                          |
| `tables` / `table_members` | 席情報                                                                      | service role のみ                                                     | イベント参加者は自分のテーブルのメンバーのみ（`user_id IN (自テーブルのメンバー)`） |
| `matches`                  | `user_a_id`, `user_b_id`                                                    | service role のみ（`FinalizeMatches`）                                | `user_a_id = auth.uid() OR user_b_id = auth.uid()`                                  |
| `match_messages`           | `match_id`, `sender_id`, `body`                                             | `sender_id = auth.uid() AND sender_id IN matches.user_a_id/user_b_id` | マッチ当事者のみ                                                                    |
| `photo_reveal_consents`    | `match_id`, `user_id`, `state`                                              | `user_id = auth.uid()`                                                | `user_id = auth.uid()` のみ（※ `RequestRevealUrl` は service role でバイパス）      |
| `profile_photos`           | `user_id`, `storage_path`, `is_primary`                                     | `user_id = auth.uid()`                                                | `user_id = auth.uid()` のみ（相手閲覧は署名URL経由）                                |
| `reports`                  | `reporter_id`, `target_user_id`                                             | `reporter_id = auth.uid()`                                            | 管理者のみ                                                                          |
| `blocks`                   | `blocker_id`, `blocked_id`                                                  | `blocker_id = auth.uid()`                                             | `blocker_id = auth.uid()`                                                           |
| `awards`                   | `event_id`, `pair_id`, `kind`                                               | service role のみ                                                     | イベント参加者                                                                      |

### 7.1 RLS の検証手順（01 §11 ハンドオフチェックリストにも含む）

- テストユーザ2名を作り、相手の `votes` / `match_messages` / `profile_photos` / `photo_reveal_consents` の SELECT が空になることを確認
- `ComputeMatching` を service role で実行し、RLS が全ユーザ分の `votes` を読めることを確認
- 未マッチ状態で `match_messages` INSERT が拒否されることを確認

---

## 8. 投票の秘密性と service role 運用

- 一般クライアントは **自分の投票しか読めない**（RLS）
- `ComputeMatching` のみ service role key を使って全票を取得 → アルゴリズムへ渡す
- service role key は **サーバ側環境変数（Vercel 暗号化）**、ブラウザには絶対に出さない
- service role クライアントの生成は `src/infrastructure/matching/service-role-client.ts` に限定、ESLint で他ファイルからの import を禁止
- 計算結果（テーブル割当）は公開可能な情報のみ（誰がどこのテーブルか、人によっては見える範囲で）、誰が誰に投票したかは永久に可視化しない

---

## 9. チャット実装（C と共同）

### 9.1 責務分担

- **C**：Broadcast チャンネル `chat:<matchId>` の提供
- **D**：メッセージの DB 永続化、履歴取得 API、通報・ブロック、UI

### 9.2 送信フロー

1. `<Composer>` が `send-message` Server Action を呼ぶ
2. `SendMessage` Use Case がブロック判定・マッチ当事者判定・本文検証
3. DB 保存成功後、Broadcast で相手に即時配信
4. 失敗時：DB 成功・Broadcast 失敗なら UI にトースト（相手は次回再読み込み時に取得）、DB 失敗なら UI で再試行

### 9.3 受信フロー

1. マッチ画面ロード時に `ListMessages` で直近 50 件取得
2. `chat:<matchId>` をサブスクライブし、新着を末尾に追加
3. 上スクロールで古い履歴を追加読み込み

### 9.4 通報・ブロック

- メッセージ長押し（モバイル）/ 右クリック（PC） → メニュー → 通報 or ブロック
- ブロック実行時：マッチを `blocked` に更新、以後のメッセージは送信不可、チャット履歴は見える（証拠保全）
- 通報は `reports` に記録、管理者画面で対応

---

## 10. マッチング計算の発火点（C との接続）

- C の `AdvanceEventPhase` が `voting → intermission` 遷移の Use Case 内で `ComputeMatching` を呼ぶ
- エラー時は `intermission` に留まり、管理者コンソールに「再計算」ボタンが出る
- 成功時は C 側が続けて `intermission → mingling` 遷移を実行
- `FinalizeMatches` は全ラウンド終了時（`mingling → closing` 前 or closing 直後）に管理者が別途発火

---

## 11. 他メンバーとの連携点

- **A（スライド）**：イベント終了画面のアワード表示で、A 提供の `<SlideThumbnail>` コンポーネントを使ってプレゼンを再掲。`awards.pair_id` → プレゼンペアを解決できるデータ契約を共有
- **B（アバター）**：交流画面で `GetMyTable` の戻り値に `avatarPresetKey` を含めて B の `<RoundtableScene>` に渡す
- **C（リアルタイム）**：
  - `voting → intermission` 発火で `ComputeMatching` が走る経路
  - チャットの Broadcast チャンネル提供
  - スタンプ集計結果 → `ComputeStampAward`
  - マッチ成立通知：C は関与せず、D が Resend 経由で直接メール

---

## 12. テスト方針

### 12.1 Domain

- `k-partition-2-opt.service.ts` を 8/12/16/20 名の固定フィクスチャで回帰テスト
- 検証：人数制約、男女バランス許容、`exclusionPairs` 遵守、スコア単調改善、seed 固定時の決定性
- ランダムフィクスチャでも硬制約違反が出ないことを 1000 ケース検証

### 12.2 Application

- `SubmitVote` の `VoteSet` 不変条件違反（優先順位重複・自己投票）を拒否するテスト
- `ComputeMatching` の状態前提（`intermission` でないと走らない）テスト
- `SendMessage` のブロック関係拒否テスト

### 12.3 Infrastructure

- Resend アダプタ：モック HTTP サーバ（msw）で送信リクエストのペイロード検証
- 署名付きURLアダプタ：Supabase クライアントをスタブし、TTL 600 を検証

### 12.4 RLS

- 別ユーザの投票 / メッセージ / 顔写真 / 同意レコードが SELECT できないことを Supabase CLI のテストで確認

### 12.5 E2E

- Playwright でマッチフロー：ユーザA/B が相互投票 → マッチ成立 → チャット → 同意 → 写真公開

---

## 13. スケジュール（4 週間）

| 週                 | D のタスク                                                                                                   | 完了基準                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Week 1（4/13-19）  | 基盤引き渡し後に DB スキーマ確認、k-partition アルゴリズム PoC（純粋関数のみ、UI無）                         | 8 名フィクスチャで期待テーブル割当が出る              |
| Week 2（4/20-26）  | 投票 UI、`SubmitVote`、推薦フラグ UI、k-partition を 20 名フィクスチャまで拡張、プロフィール写真アップロード | 投票フローと写真アップが動く                          |
| Week 3（4/27-5/3） | `ComputeMatching` 本番結線、テーブル案内画面、マッチ成立、Resend 通知、チャット、同意 + 署名URL              | 模擬イベント通しで「投票→マッチ→チャット→写真」が通る |
| Week 4（5/4-10）   | 通報・ブロック、アワード表示、RLS 総点検、デモリハ、文言磨き                                                 | 本番相当フロー完走                                    |

---

## 14. リスクと緩和策

| リスク                                                               | 緩和策                                                                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 20 名以上でアルゴリズムが Vercel 10 秒タイムアウト超過               | 計算時間をロガーで継続計測、30 名閾値を超える場合は seed リトライ回数を減らす / Edge でなく Node ランタイム固定    |
| 男女比が極端（例 8m2f）でテーブル 2:2 が破綻                         | はぐれ処理のルールを seatPolicy で明示、UI で「バランス調整のため一部テーブルは 3m1f になります」表示              |
| 票数が少ない（相互投票がほぼ無い）→ アルゴリズム出力がランダムに近い | 推薦フラグの表示でヒント提供（アルゴリズム入力ではないが UI 経由で人間の判断を誘発）、最低票数を UI で促す         |
| Resend 無料枠（月 3000 通）超過                                      | ハッカソン会場規模では安全。本番運用時は有料プラン切替を env 切替で即時対応できるよう `EmailSenderPort` を抽象化   |
| 顔写真の URL がスクショで流出                                        | 技術的には防げないため UI に「スクリーンショット禁止」注意書き＋10 分 TTL で継続閲覧はできない旨を明記、通報で対応 |
| 投票秘密性の侵害（service role key 漏洩）                            | Vercel の暗号化環境変数、サーバ側のみ参照、ESLint で import を限定、ログに key を絶対に出さない                    |
| マッチ通知メールが迷惑メール判定                                     | Resend の SPF/DKIM 設定を事前に完了、送信ドメインは専用サブドメイン、件名に「トモコイ」明記                        |
| ブロック後も過去メッセージが見え続ける仕様への不満                   | 「通報の証拠のため履歴は保持、相手からは見えない状態にする」旨を UI ヘルプで説明                                   |

---

## 15. 参照

- 要件定義書 `tomokoi_spec_v5_3.md` §4.2（マッチングロジック）§4.4（推薦フラグ）§4.5（顔写真公開）§5.4（投票フロー）§5.5（交流タイム）§6.4（マッチ通知）§7.5（チャット）§8.2（メール配信）§9.2（役割分担）§13（リスク）
- 本技術仕様書 `00_概要.md` §5.2（役割分担）§6（クリーンアーキテクチャ方針）§7（命名規約）
- 本技術仕様書 `01_基盤構築.md` §5（環境変数）§6（DBスキーマ）§7（RLS）§8（Server Action規約）§9（ポート：Email / SignedUrl）§11（ハンドオフチェックリスト）
- 本技術仕様書 `02_メンバーA_スライド・管理.md` §6（SlideThumbnail 再利用）
- 本技術仕様書 `03_メンバーB_アバター.md` §4（AvatarPreset）§5（RoundtableScene）
- 本技術仕様書 `04_メンバーC_リアルタイム.md` §9（状態遷移発火点）§10（チャット Broadcast）§5.4（スタンプ集計結果受け渡し）
- Supabase Auth / RLS / Storage（署名付きURL）公式ドキュメント
- Resend 公式ドキュメント（送信API / Webhook）
- Next.js Server Actions 公式ドキュメント
- k-way partition および 2-opt 近傍探索に関する一般的な教科書的解説（組合せ最適化）

---
