---
description: "トモコイ プロジェクト固有の不変量 — RLS 必須 / Votes のみマッチング入力 / ビデオ OFF / アワード 3 種限定 / 紹介者代理マッチング禁止"
globs: ["**/*.ts", "**/*.tsx", "**/*.sql", "supabase/**/*"]
alwaysApply: true
---

# トモコイ Guardrails (不変量)

**このプロジェクトの根幹を壊さないために、常に遵守するルール。`docs/tomokoi_spec_v5_3.md` と `docs/tech_spec/` から抽出した設計判断の invariant を固定する。**

## データアクセス

1. **Row Level Security は必須**。新しいテーブル / 変更時、必ず RLS ポリシーを同じ migration 内に書く。
2. **イベント参加者以外はデータ参照不可**。`entries` に存在しない `user_id` は、当該 `events.id` に属するレコードを SELECT できない。
3. **`SUPABASE_SERVICE_ROLE_KEY` をクライアントに渡さない**。ブラウザから使うのは `anon key` のみ。service role は `src/lib/supabase/server.ts` に隔離し、マッチング計算など RLS バイパスが必須な箇所のみで使う。

## マッチングアルゴリズム

4. **SMI (k-partition 2-opt) の入力は `votes` テーブルのみ**。`recommendations` (紹介者推薦フラグ) はアルゴリズムに渡さず、UI 上で星マーク表示する参考情報に留める (`docs/tomokoi_spec_v5_3.md` 設計判断)。
5. **外部マッチングライブラリ (`matching`, `networkx` のマッチング機能など) を使わない**。技術アピール §1.1 のため k-partition 2-opt を自前実装する。詳細は [`matching-algorithm.md`](matching-algorithm.md)。
6. **男女比均等化はハード制約**。ただし `other` (非二元 / 未回答) は制約外、残り席に配置する。
7. **登壇ペア (紹介者-被紹介者) は同テーブル禁止**のハード制約。

## AI / スライド生成

8. **マルチ役割プロンプト (構成 / コピーライター / 批評 / デザイナー) を単一役割で代替しない**。単一 Gemini 3 Flash 呼び出しの中でプロンプトを分化して 4 役割を維持する。技術アピール §1.2 の根幹。
9. **批評役を必ず最終段に通す**。公序良俗違反・個人情報リスクを検知させる。
10. **被紹介者の事前プレビュー + NG 機能を削らない** (`docs/tomokoi_spec_v5_3.md` Phase 2)。

## LGBTQ+ / ジェンダー配慮

11. `users.gender` の値は `female` / `male` / `other` のみ (docs v5.3 に準拠)。他の値を導入しない。
12. `users.preferred_genders` は配列で、`any` を含められる。制約なしの場合は `["any"]`。
13. UI では `other` を「未回答 / その他」と表示し、質問は強制しない。

## UX / 体験

14. **プレゼン中のビデオは OFF**。UI でビデオ ON を強制する変更を入れない (`docs/tomokoi_spec_v5_3.md`)。登壇ペアの音声は WebRTC P2P のみ。
15. **アワードは「おもしろい」「盛り上がった」「友情」の 3 種のみ**。「異性から人気◯位」系は**絶対に追加しない**。
16. **紹介者が被紹介者の代わりにマッチング相手を選ぶ UI を実装しない**。推薦フラグで留める。本人投票必須。

## 堅牢性

17. **Offline-first**: Supabase Realtime 接続が切れても進行できるローカルキャッシュを壊さない。
18. **不完全データ対応**: 投票しないユーザがいてもマッチングが破綻しない実装を維持する。
19. **男女比のドタキャン動的リバランシング**: 参加者数変動時にハード制約をリアルタイム再計算する。

## セキュリティ

20. シークレット (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` 等) をコミットしない。
21. エラーメッセージにスタックトレースや内部 ID を含めない (ユーザー向け UI)。
22. 投票データは秘密送信 — 他の参加者にリーク可能な API エンドポイントを作らない。
23. 顔写真は **10 分 TTL の Supabase Signed URL** 以外で配信しない。

## モード対応

24. `events.mode` は `online` / `offline` のみ。切替で UI とフロー分岐する。
25. オフラインモード追加機能は QR 受付と会場プロジェクター配信**のみ**に留める (`docs/tech_spec/04_c_realtime.md`)。

## レーン境界

26. **他メンバーの管轄ディレクトリへ越境編集しない**。境界は [`team-boundaries.md`](team-boundaries.md) 参照。
