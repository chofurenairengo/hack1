## 概要

<!-- 変更の目的と要約を記載してください -->

## レーン

- [ ] A (スライド・管理・クロスメンバー型)
- [ ] B (VRM・MediaPipe)
- [ ] C (Realtime/WebRTC)
- [ ] D (投票・マッチング・チャット)
- [ ] 横断 (基盤・CI/CD・ドキュメント等)

## チェックリスト

- [ ] このレーン向けの rules (`.claude/rules/*.md`) を遵守している
- [ ] 他レーン管轄のファイルを編集していない (または合意済み)
- [ ] クロスメンバー型 (`src/shared/types/`, `src/domain/*/value-objects/`) を変更していない (または A 合意済み)
- [ ] Supabase migration に RLS ポリシーを同梱した (スキーマ変更時)
- [ ] `src/types/supabase.ts` を再生成した (スキーマ変更時)
- [ ] テストを追加した (unit + integration / E2E は該当時)
- [ ] `pnpm lint` / `pnpm typecheck` / `pnpm build` がローカルで通った
- [ ] シークレットをコミットしていない

## テストプラン

- [ ] <!-- 変更したコードに対応するテスト手順を記載 -->

## スクリーンショット (UI 変更がある場合)

<!-- 変更前後のスクリーンショットを貼り付けてください -->
