# トモコイ 技術仕様書 03 — メンバーB：アバター（VRM + MediaPipe）

> メンバーBは **最大の技術的リスク領域** を担当します。要件定義書 §13（リスク表）でも「VRM 4体同時描画がスマホで動かない」が致命度「致命的」として筆頭に挙がっており、**Week 1 の PoC 成否が全員の作業に影響する** 中枢ポジションです。
> 本ファイルでは Domain〜Infrastructure の設計と、同時にリスク管理・フォールバック判断の基準も明記します。

---

## 1. 担当範囲

### 1.1 機能スコープ

- VRM 3Dアバターの描画（Three.js + React Three Fiber + @pixiv/three-vrm）
- MediaPipe Face Landmarker によるユーザーの表情トラッキング
- ブレンドシェイプマッピング（MediaPipe の表情係数 → VRM のブレンドシェイプキー）
- リップシンク（音声ボリュームベース簡易実装）
- 表情同期（自分の表情を他参加者に配信、Broadcast は C と連携）
- プレゼン画面のレイアウト（スライド両脇アバター、音声ON両者）
- 交流タイム円卓シーンのアバター配置（C と連携）
- スタンバイ画面のアバター表示
- 非アニメ風VRMプリセット5〜10種の選定・チームレビュー

### 1.2 スコープ外

- スライドそのもの（A）
- WebRTC シグナリング・音声ルーティング（C）
- スタンプエフェクト（C）
- 投票・マッチング（D）

### 1.3 最重要マイルストーン：Week 1 スマホ PoC

- 目的：iPhone Safari / Android Chrome で **VRM 4体同時描画 + 各アバターの表情同期** が 30fps 以上で動作するかを検証
- 合格基準：ロースペックスマホ（iPhone 12 / Pixel 5 世代）で 30fps 維持
- **不合格時**：2Dアバター（Live2D など）または静的サムネ + 表情アイコンへのフォールバックを Week 1 中に決定
- 4/15 時点で基盤が引き渡される前提だが、並行して 4/13 から VRM ローカル実験を開始可能

---

## 2. Domain層設計

### 2.1 エンティティ

`src/domain/avatar/entities/`：

- **`AvatarPreset`**：プリセットアバターの定義
  - プロパティ：`key: string`、`displayName: string`、`vrmUrl: string`、`thumbnailUrl: string`、`genderNeutral: boolean`、`licenseNote: string`
  - 不変条件：`key` は unique、`vrmUrl` は `/vrm/` 配下または Storage の `vrm-presets` バケット

### 2.2 値オブジェクト

`src/domain/avatar/value-objects/`：

- **`BlendShapeKey`**：VRM のブレンドシェイプキー列挙型
  - 主要キー：`Happy` / `Sad` / `Angry` / `Relaxed` / `Surprised` / `Aa` / `Ih` / `Ou` / `Ee` / `Oh` / `Blink` / `LookUp` / `LookDown` / `LookLeft` / `LookRight`
  - VRM 0.x / 1.0 でキー名が異なるため、内部はプロジェクト共通キー → バージョン別マップに変換

### 2.3 リポジトリ

- アバタープリセットは DB ではなく **コード中の静的定数**で管理（要件定義：プリセット選択、カスタマイズなし）
- `src/shared/constants/vrm-presets.ts` にリストを置く
- `users.avatar_preset_key` に選択結果を保存（Repository は `UserRepository` を使う）

### 2.4 ドメイン制約

- ユーザーは1つの `AvatarPreset` のみ選択可能
- 選択後の変更は可能（ただしイベント開始後のイベント中変更は不可、C と連携してガード）

---

## 3. Application層設計

### 3.1 Use Case

- **`ListAvatarPresetsUseCase`**：プリセット一覧取得（定数からの読み取りをラップ）
- **`SelectAvatarPresetUseCase`**：ユーザーがプリセット選択 → `users.avatar_preset_key` 更新

### 3.2 表情トラッキング・同期のアーキテクチャ

表情データ自体は **クライアント内で流れる高頻度データ**（秒間 20〜30 フレーム）のため、Use Case としては扱わず、Infrastructure 層の hook とチャンネルで完結させます。

- 自分の表情取得：MediaPipe → ブレンドシェイプ値（16〜20 個）
- 自分の表情送信：Supabase Realtime Broadcast（C と連携）
- 他者の表情受信：Broadcast 購読 → 自分の画面の他者アバターに適用
- Application 層は関与しない（ロジックではなくデータ配管のため）

---

## 4. Infrastructure層設計

### 4.1 VRM 読み込み

`src/infrastructure/vrm/vrm-loader.ts`：

- `@pixiv/three-vrm` の `VRMLoaderPlugin` を使う
- キャッシュ：既にロード済みの VRM は再利用（同一 URL）
- ロード失敗時は `AvatarLoadError` を投げ、UI 側で代替表示

### 4.2 プリセットレジストリ

`src/infrastructure/vrm/preset-registry.ts`：

- `AvatarPreset` 配列を export
- 各プリセットの `vrmUrl` は `/vrm/preset-<NN>.vrm`
- ライセンス情報を README にも転記

### 4.3 ブレンドシェイプマッパー

`src/infrastructure/vrm/blend-shape-mapper.ts`：

- MediaPipe Face Landmarker が返す `faceBlendshapes` は ARKit ベースの52項目
- VRM の標準ブレンドシェイプキーにマッピング
- 主要マッピング（方針）：
  - `mouthSmileLeft/Right` → `Happy`
  - `mouthFrownLeft/Right` → `Sad`
  - `browDownLeft/Right` → `Angry`
  - `eyeBlinkLeft/Right` → `Blink`
  - `jawOpen` → `Aa`（口パク）
- 個別係数は実機で調整（VRoid 系は係数を若干落とすと自然）

### 4.4 MediaPipe Face Landmarker

`src/infrastructure/mediapipe/face-landmarker.ts`：

- `@mediapipe/tasks-vision` の `FaceLandmarker.createFromOptions` で初期化
- モデルファイル：`public/mediapipe/face_landmarker.task`
- `runningMode: 'VIDEO'`、`outputFaceBlendshapes: true`、`numFaces: 1`
- `GPU` delegate が使える端末では GPU、それ以外は CPU
- 初期化失敗時は明示的にフォールバック（口パクのみ、要件定義§13準拠）

### 4.5 リップシンク

`src/infrastructure/mediapipe/lip-sync-analyzer.ts`：

- `navigator.mediaDevices.getUserMedia({ audio })` で取得した音声ストリームに対し `AudioContext.AnalyserNode` を張る
- RMS を計算して 0..1 に正規化
- MediaPipe の `jawOpen` と加重平均（MediaPipe 70% + 音声 30% 程度）で `Aa` に適用
- MediaPipe 未動作時は音声ボリュームのみでシンクできるよう独立動作可

### 4.6 シーンコンポーネント

`src/infrastructure/three/`：

- **`AvatarScene`**：汎用1体描画。スタンバイ画面で使用
- **`PresenterScene`**：プレゼン画面用。左紹介者・右被紹介者の2体配置、カメラ固定、スライドは別コンポーネントで中央に挟まる設計
- **`RoundtableScene`**：円卓3〜4体配置。交流タイム用、C と連携

React Three Fiber ベースで記述、R3F の `Canvas` を Page 側で呼び出し、各シーンはその中で使う。

### 4.7 UI Hooks

`src/infrastructure/ui/hooks/`：

- **`useVrmAvatar(presetKey, expressionSource)`**：VRM の読み込み・アンロード・表情適用のライフサイクル管理
- **`useFaceLandmarker(videoRef)`**：webカメラ映像から MediaPipe を回し、ブレンドシェイプを返す
- **`useLipSync(audioStream)`**：音声ストリームからリップシンク係数を返す
- **`useExpressionBroadcast(pairId, localExpression)`**：自分の表情を Broadcast、他者分を受信（C の hook と協調）

---

## 5. プレゼン画面レイアウト

### 5.1 構成

```
┌─────────────────────────────────────────────────────────┐
│ イベントタイトル / 残り時間                                   │
├──────────┬─────────────────────────────┬──────────────┤
│          │                             │              │
│  紹介者   │      スライド（16:9）         │   被紹介者    │
│  VRM     │      （A の SlideRenderer）   │   VRM        │
│  (左)    │                             │   (右)        │
│          │                             │              │
├──────────┴─────────────────────────────┴──────────────┤
│ スタンプバー（C 担当） / 進行ステータス                       │
└─────────────────────────────────────────────────────────┘
```

- スマホ縦長レイアウトでは **アバターをスライドの上下** に配置する垂直レイアウトに切替
- CSS Grid または Flex で構成、ブレークポイント：768px

### 5.2 アバター表示サイズ

- デスクトップ：200×300 px 程度、スライド高さに合わせて調整
- スマホ：幅一杯で上下に配置、アバター高 120px 程度

### 5.3 同時描画数

| シーン | 同時描画数 | 担当 |
|--------|-----------|------|
| スタンバイ | 1 | B |
| プレゼン中 | 2（紹介者・被紹介者） | B |
| 投票中 | 0 | B（非表示制御） |
| 交流タイム | 3〜4（円卓） | B + C |

---

## 6. 表情同期の通信仕様（C との契約）

### 6.1 チャンネル

- `event:expression:<pairId>`（プレゼン中）
- `breakout:expression:<tableId>`（交流タイム）

### 6.2 メッセージ形式（Broadcast）

- `kind: 'expression'`
- `userId: UserId`
- `blendshapes: { [key: string]: number }`（値は 0..1）
- `timestamp: number`

送信頻度は 15fps（66ms 間隔）程度を目安。CPU / GPU 負荷を見て 10fps まで下げる余地あり。

### 6.3 受信側の補間

- 受信データをそのまま適用するとジッタが目立つため、`lerp`（線形補間）で滑らかにする
- 目標値 → 現在値の差分 × 0.3 程度を毎フレーム加算

### 6.4 遅延と脱落

- Realtime Broadcast は低遅延（目安 100-300ms）だが、ロスは許容
- 脱落時は「少し前の表情が持続する」挙動になるが、実用上問題なし

---

## 7. VRM プリセット選定プロセス

### 7.1 選定基準（要件定義書 §7.4 準拠）

- **採用する方向性**：セミリアル系 / カジュアル系 / ロー ポリシンプル系 / モダンイラスト系
- **避ける方向性**：萌え系アニメキャラ風、二次元的記号（猫耳・しっぽ・獣人・魔法少女）、VTuber文化に強く紐づくビジュアル
- 服装：普段着・カジュアルシック寄り
- 多様性：ジェンダーレス・多様な体型・多様な髪型をプリセット内で確保

### 7.2 素材調達元

- VRoid Hub の CC0 / 商用可素材
- Booth の商用可・改変可素材
- Ready Player Me は MVP 対象外（Phase 2 検討）

### 7.3 プロセスとタイムライン

| 日程 | 作業 |
|------|------|
| Week 1 後半（4/17-4/19） | 候補 20 種を収集（B 主導） |
| Week 2 前半（4/20-4/22） | チーム4人でレビュー、10種に絞り込み |
| Week 2 前半（4/22-4/23） | 非エンジニア層にも見せて「第一印象でアニメ系に見えるか」を確認 |
| Week 2 中盤（4/24） | 最終 5〜10 種を確定、`public/vrm/` へ配置 |

### 7.4 選定時の観点

- アプリストアで一般の20〜30代が見たとき、マッチングアプリとして違和感ないか
- 体型・髪型・服装のバリエーション
- ライセンス条項（商用利用・改変可否・クレジット表記義務）

### 7.5 バックアッププラン

- 候補が5種に満たない場合：VRoid Studio でチーム内自作
- 自作も間に合わない場合：現状のVRMで進め、思想の打ち出し方でカバー（要件定義書 §13 準拠）

---

## 8. パフォーマンスチューニング

### 8.1 同時描画負荷低減

- VRM モデル：ポリゴン数 30k 以下を目安（VRoid 系は標準で達成）
- テクスチャ：1024×1024 以下、必要に応じて Basis Universal 圧縮
- 影：交流タイムでは影無効化（負荷の大部分を占めるため）
- アニメーション：アイドル時は 10fps、表情変化時のみ 30fps

### 8.2 MediaPipe 負荷低減

- Video 入力解像度：640×480
- 推論頻度：15fps（33ms 毎スキップ）
- GPU delegate を優先、不可なら CPU

### 8.3 描画品質の自動調整

- FPS が 24 を下回ったら自動で影・ポストエフェクトを切る
- 25fps 以下が3秒続いたら MediaPipe 推論頻度を 10fps に落とす
- ユーザーが変更できる「軽量モード」トグルも用意

---

## 9. アセット配置

- VRM ファイル：`public/vrm/preset-<NN>.vrm`
- サムネイル：`public/vrm/preset-<NN>-thumb.jpg`
- MediaPipe モデル：`public/mediapipe/face_landmarker.task`
- ライセンス情報：`public/vrm/LICENSES.md`

---

## 10. スマホ PoC の手順と合格基準

### 10.1 PoC スコープ

- 画面構成：円卓風に VRM 4体配置、各々にダミーの表情変化（sin波）
- カメラ入力＋ MediaPipe 稼働
- 音声入力のリップシンク稼働

### 10.2 合格基準

| 端末 | 目標 fps | 許容下限 |
|------|---------|---------|
| iPhone 12 (iOS 17+) | 30 | 24 |
| Pixel 5 (Chrome) | 30 | 24 |
| Galaxy S22 | 30 | 24 |
| 低スペック Android（Galaxy A23 等） | 24 | 20 |

### 10.3 失敗時のフォールバック判断（4/18 時点）

- 2D アバターへ切替：表情トラッキングは口パクのみ、静止画＋口パクで代替
- 同時描画数 2 に固定：交流タイムを 2 人テーブルに変更（ただしマッチング制約式も D が変更する必要あり）
- 最悪ケース：アバターアイコン＋背景色変化で「表情」を表現

---

## 11. 他メンバーとの連携点

### 11.1 メンバーA（スライド）

- プレゼン画面での `SlideRenderer` と `AvatarStage` の配置合意
- Week 2 前半までに合同で画面モックを作る
- スライドのアスペクト比を16:9固定とする（Aに依頼）

### 11.2 メンバーC（リアルタイム）

- `event:expression:<pairId>` のメッセージ仕様（§6.2）を Week 1 中に合意
- `useExpressionBroadcast` hook と C の `useRealtimeChannel` を協調
- WebRTC 音声ストリームから取得した `MediaStream` を リップシンクに流す

### 11.3 メンバーD（投票・マッチング）

- 交流タイムで4人テーブルのアバター配置を円卓で表示
- D からマッチング結果（各ユーザーの `tableId`）が渡されたら、該当テーブルの参加者アバターを表示

---

## 12. テスト方針

### 12.1 ユニット

- `BlendShapeMapper` のマッピング（ARKit52 → VRMキー）
- `useLipSync` の RMS 計算

### 12.2 手動

- VRM 各プリセットの読み込み・表情・口パク動作確認
- 実機スマホ複数種での FPS 測定（Week 1 末・Week 2 末・Week 3 末）

### 12.3 統合

- プレゼン画面で A と連携、実際に2体アバター + スライド + スタンプ（C）が同時に乗る状態で FPS 測定

---

## 13. スケジュール対応

| Week | タスク |
|------|--------|
| Week 1（4/13-4/19） | VRM ローカル PoC（4/13 から先行可）、基盤引き渡し後（4/16〜）プロジェクト統合、**スマホ PoC 4/18 目処** |
| Week 2（4/20-4/26） | アバター本実装（非アニメ風プリセット適用）、表情マッピング調整、プレゼン画面レイアウト、A との結合 |
| Week 3（4/27-5/3） | 交流タイム円卓シーン（C と協働）、リップシンク改善、パフォーマンスチューニング |
| Week 4（5/4-5/10） | デモ向け最終調整、事前録画ダミーペアのアバター調整、バックアップ録画の撮影 |

---

## 14. リスク管理

| リスク | 対策 |
|--------|------|
| スマホで 4体同時描画が動かない | 2D フォールバック、交流テーブル縮小（要 D 調整） |
| MediaPipe 精度不足 | 口パクのみで運用、表情係数を大きめに効かせる |
| 非アニメ風VRM が集まらない | VRoid Studio 自作 / 現状素材で妥協（思想で補う） |
| VRMライセンス抵触 | 事前チェックリスト、ライセンス明記 |
| iOS Safari の WebGL 制限 | デモ前週に iPhone 実機検証必須 |

要件定義書 §13 の該当項目を参照。

---

## 15. 参照

- 要件定義書 `tomokoi_spec_v5_3.md` §6.2（アバター方針）§7.4（アバターシステム）§8.3（アバター・ML技術スタック）§9.2（役割分担）§13（リスク）
- 本技術仕様書 `00_概要.md` §5.2（役割分担）§7（命名規約）
- 本技術仕様書 `01_基盤構築.md` §3（ディレクトリ構造）§10（Realtime チャンネル設計）
- 本技術仕様書 `02_メンバーA_スライド・管理.md` §6.2（SlideRenderer 連携）
- 本技術仕様書 `04_メンバーC_リアルタイム.md` §7（表情同期 Broadcast 実装）§8（交流タイム WebRTC）
- 本技術仕様書 `05_メンバーD_投票・マッチング・事後.md` §7（テーブル割り振り結果の受け渡し）
- @pixiv/three-vrm 公式ドキュメント（VRM 0.x / 1.0 ブレンドシェイプ仕様）
- MediaPipe Face Landmarker 公式ドキュメント（ARKit52 係数 / 推論モード）
- React Three Fiber 公式ドキュメント

---
