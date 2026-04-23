---
name: /integration-test
description: Phase 4 統合 E2E テスト — デモ脚本ベースで Playwright 実行、本番相当リハーサル前の最終確認。
---

# /integration-test

**用途**: Phase 4 (5/4-5/10) の統合テスト期間に使う。デモ脚本ベースで主要ユーザーフローを Playwright で検証し、本番相当リハーサル前の最終確認を行う。

## 実行プロトコル

### Step 1: 環境準備

- Supabase staging / Vercel preview 環境に最新 main をデプロイ
- 本番想定の設定 (STUN/TURN、Gemini API、Resend 等) が有効
- テストユーザー N=20 分のシードデータを投入 (`supabase/seed.sql`)

### Step 2: Playwright 実行

```bash
pnpm test:e2e
```

主要シナリオ:

1. **紹介者フロー (A レーン中心)**
   - ログイン → イベント作成 → 被紹介者招待メール送信 (Resend)
   - 被紹介者がメールから登録 → 合意 → スライド生成 (Gemini) → プレビュー → 確定

2. **オーディエンスフロー (D レーン中心)**
   - 入場 → プレゼン視聴 → スタンプ送信 → 投票 (1-3 位)

3. **マッチングフェーズ (D + C レーン)**
   - 投票締切 → k-partition 計算 → テーブル割当発表
   - 各参加者が自テーブルに着席 (UI 遷移)

4. **Mingling (C レーン中心)**
   - Realtime 4 チャンネル同時稼働
   - WebRTC P2P 音声 (登壇ペア間)
   - VRM アバター + MediaPipe 同期 (B レーン)

5. **マッチ → チャット → 顔写真公開 (D レーン)**
   - マッチ通知 → 受諾 → 1:1 チャット
   - 顔写真公開同意 (双方) → 10 分 TTL Signed URL で取得

### Step 3: 各種チェック

- [ ] スクリーンショット / ビデオ / trace を artifacts として保存
- [ ] k-partition 計算が 10 秒以内に完了 (本番環境、N=20)
- [ ] Realtime 切断 → 再接続で状態が復元する
- [ ] オフライン状態でもスタンプ UI がローカルキューで動作
- [ ] ビデオ配信が UI のどこからも ON にならない (セキュリティ)
- [ ] 顔写真 Signed URL が 10 分で期限切れになる
- [ ] 投票内容が他参加者から見えない (ネットワーク inspector で確認)

### Step 4: パフォーマンス計測

- ページロード時間 (初回 / 再訪)
- VRM 4 体同時描画 FPS (スマホ + デスクトップ)
- Realtime レイテンシ (broadcast → 受信)
- Gemini スライド生成所要時間 (p50 / p95)
- k-partition 計算時間 (N=20)

### Step 5: 脚本との整合確認

デモ脚本 (`docs/demo_script.md` など、存在する場合) の各シーンが UI で再現できるか順に確認:
- オープニング (事前収録スライド + ライブ登壇)
- プレゼン (4 ペア × 各 3 分)
- 投票タイム (2 分)
- マッチング発表 (アニメーション)
- Mingling (10 分)
- エピローグ (アワード発表)

### Step 6: レポート

```
## /integration-test 結果 — YYYY-MM-DD

### ✅ Passed Scenarios
- <シナリオ>: <所要時間 / 補足>

### ❌ Failed Scenarios
- <シナリオ>: <原因 + 修正 TODO>

### Performance
- k-partition N=20: <ms>
- Gemini p95: <s>
- Realtime latency: <ms>
- VRM FPS (スマホ): <fps>

### Security Checks
- [ ] 投票秘匿
- [ ] 顔写真 TTL 10min
- [ ] ビデオ OFF 強制
- [ ] service role key クライアント漏洩なし

### Go / No-Go 判定
- [ ] Go (本番リハーサル可能)
- [ ] No-Go: <ブロッカー>
```

## 関連

- [.claude/rules/testing-tomokoi.md](../rules/testing-tomokoi.md)
- [.claude/rules/security-tomokoi.md](../rules/security-tomokoi.md)
- `docs/tech_spec/00_tech_spec_overview.md` — Phase 4 計画
