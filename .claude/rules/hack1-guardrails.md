# hack1 Guardrails

**hack1 プロジェクト固有の常時遵守ルール。`docs/technical_spec.md` と `docs/requirements.md` から抽出した設計判断の不変量 (invariant) をここで固定する。**

## データアクセス

1. **Row Level Security は必須**。新しいテーブル / 変更時、必ず RLS ポリシーを書く。
2. **イベント参加者以外はデータ参照不可**。`Participants` に存在しないユーザは当該 `events.id` に属するレコードを SELECT できない。
3. **Supabase service role key をクライアントに渡さない**。ブラウザから使うのは anon key のみ。

## マッチングアルゴリズム

4. **SMI の入力は `Votes` テーブルのみ**。`Recommendations` (紹介者推薦フラグ) はアルゴリズムに渡さず、UI 上で星マーク表示する参考情報に留める (`docs/requirements.md` §6 の設計判断)。
5. **外部マッチングライブラリ (`matching` 等) を使わない**。技術アピール §1.1 のため SMI を自前実装する。詳細は `python-smi.md`。
6. **男女比均等化はハード制約**。ただし `prefer_not_to_say` は除外、`non_binary` は別プールで処理 (`docs/technical_spec.md` §3)。

## AI / スライド生成

7. **マルチエージェント構成 (構成 / コピーライター / 批評 / デザイナー) を単一 LLM 呼び出しで代替しない**。技術アピール §1.2 の根幹。
8. **批評エージェントを必ず最終段に通す**。公序良俗違反・個人情報リスクを検知させる。
9. **被紹介者の事前プレビュー＋NG 機能を削らない** (`docs/requirements.md` §5 Phase 2)。

## LGBTQ+ / ジェンダー配慮

10. `users.gender` の値は `female` / `male` / `non_binary` / `prefer_not_to_say` のみ。他の値を導入しない。
11. `users.preferred_genders` は配列で、`any` を含められる (制約なし)。
12. UI では `preferred_not_to_say` を「未回答」と表示し、質問は強制しない。

## UX / 体験

13. **プレゼン中のビデオは OFF**。UI でビデオ ON を強制する変更を入れない (`docs/requirements.md` §6)。
14. **アワードは「おもしろい」「盛り上がった」「友情」の 3 種のみ**。「異性から人気◯位」系は**絶対に追加しない**。
15. **紹介者が被紹介者の代わりにマッチング相手を選ぶ UI を実装しない**。推薦フラグで留める。

## 堅牢性

16. **Offline-first**: Realtime 接続が切れても進行できるフォールバックを壊さない。ローカルに直近状態をキャッシュする。
17. **不完全データ対応**: 投票しないユーザがいてもマッチングが破綻しない実装を維持する。
18. **男女比のドタキャン動的リバランシング**: 参加者数変動時にハード制約をリアルタイム再計算する。

## セキュリティ

19. シークレット (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, Daily.co API key 等) をコミットしない。
20. エラーメッセージにスタックトレースや内部 ID を含めない (ユーザー向け UI)。
21. 投票データは秘密送信 — 他の参加者にリーク可能な API エンドポイントを作らない。

## モード対応

22. `Events.mode` は `online` / `offline` のみ。切替で UI とフロー分岐する。
23. オフラインモード追加機能は QR 受付と会場プロジェクター配信**のみ**に留める (`docs/technical_spec.md` §4)。
