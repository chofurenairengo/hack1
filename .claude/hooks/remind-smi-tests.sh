#!/usr/bin/env bash
# Invoked by .claude/settings.json PostToolUse when SMI source files are edited.
# Reminds Claude to run the SMI test suite before committing.
echo "[hack1 hook] SMI source changed. Run: pytest tests/smi -v  (Min-Regret Sum / 男女比均等化 境界値ケースを含むこと)"
exit 0
