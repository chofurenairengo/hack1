#!/usr/bin/env bash
# Invoked by .claude/settings.json PostToolUse when supabase/migrations/** is edited.
# Reminds Claude to update docs/technical_spec.md §3 and RLS policies.
echo "[hack1 hook] Schema / migration changed. Checklist:"
echo "  1. docs/technical_spec.md §3 の主要エンティティ表を更新"
echo "  2. 対象テーブルの RLS ポリシーを確認 (rls-auditor を起動)"
echo "  3. supabase gen types typescript --local > types/supabase.ts"
exit 0
