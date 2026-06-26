#!/bin/bash
# usage-cron.sh — Main cron wrapper for AI tools quota (Codex + Claude).
#
# Steps:
#   1. fetch-usage.py     → public/usage-quota.json
#   2. update-usage-history.sh → public/usage-history.json
#   3. update-usage-sheet.js → Google Sheet "Codex QUOTA" + "Claude QUOTA"
#   4. git add + git commit (local only — NO push, see spec §10)
#
# Per spec §8: step failures are logged but DO NOT abort the cron.
# Per R1 (Phase-1 plan): if com.openclaw.memory-sync is loaded, its next
# tick will silently push any local commit. WARN loudly so coordinator
# can unload it during the test window.
#
# Logs to ~/.openclaw/workspace/logs/usage-cron.log
set -u
WORKDIR="/Users/zachli/.openclaw/workspace/virtual-office"
# R5: launchd PATH is empty — export node path explicitly (mirrors minimax-cron.sh)
export PATH="/opt/homebrew/opt/node/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
LOG="/Users/zachli/.openclaw/workspace/logs/usage-cron.log"
NOW_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

mkdir -p "$(dirname "$LOG")"
echo "" >> "$LOG"
echo "════════════════════════════════════════════════════════════════" >> "$LOG"
echo "[$NOW_UTC] usage-cron started" >> "$LOG"

# ── R1 safety check ──────────────────────────────────────────────
if launchctl list 2>/dev/null | grep -q 'com.openclaw.memory-sync'; then
  cat <<'EOF' >> "$LOG"
⚠️  ╔═══════════════════════════════════════════════════════════════╗
⚠️  ║  R1 WARNING: com.openclaw.memory-sync is LOADED.            ║
⚠️  ║  Its next tick will silently `git push origin main` and     ║
⚠️  ║  propagate the local commit made below to the public repo.  ║
⚠️  ║  Per spec §10, NO push should happen until coordinator OK.  ║
⚠️  ║                                                              ║
⚠️  ║  To pause during test window:                                ║
⚠️  ║    launchctl unload ~/Library/LaunchAgents/                  ║
⚠️  ║      com.openclaw.memory-sync.plist                          ║
⚠️  ║  To resume after Zach gates push:                            ║
⚠️  ║    launchctl load ~/Library/LaunchAgents/                    ║
⚠️  ║      com.openclaw.memory-sync.plist                          ║
⚠️  ╚═══════════════════════════════════════════════════════════════╝
EOF
  echo "[$NOW_UTC] ⚠️  R1: memory-sync is loaded — local commits will be pushed on next memory-sync tick" >> "$LOG"
else
  echo "[$NOW_UTC] ✅ R1 OK: memory-sync not loaded — local commits safe" >> "$LOG"
fi

cd "$WORKDIR"

# ── Step 1: fetch (writes public/usage-quota.json) ──
echo "[$NOW_UTC] step 1/4: fetch-usage.py" >> "$LOG"
if /usr/bin/python3 scripts/fetch-usage.py >> "$LOG" 2>&1; then
  echo "[$NOW_UTC] step 1/4: ✅ fetch OK" >> "$LOG"
else
  echo "[$NOW_UTC] step 1/4: ❌ fetch FAILED (continuing per spec §8)" >> "$LOG"
fi

# ── Step 2: history upsert ──
echo "[$NOW_UTC] step 2/4: update-usage-history.sh" >> "$LOG"
if bash scripts/update-usage-history.sh >> "$LOG" 2>&1; then
  echo "[$NOW_UTC] step 2/4: ✅ history OK" >> "$LOG"
else
  echo "[$NOW_UTC] step 2/4: ❌ history FAILED (continuing per spec §8)" >> "$LOG"
fi

# ── Step 3: sheet write ──
echo "[$NOW_UTC] step 3/4: update-usage-sheet.js" >> "$LOG"
if node scripts/update-usage-sheet.js >> "$LOG" 2>&1; then
  echo "[$NOW_UTC] step 3/4: ✅ sheet OK" >> "$LOG"
else
  echo "[$NOW_UTC] step 3/4: ❌ sheet FAILED (continuing per spec §8)" >> "$LOG"
fi

# ── Step 4: git commit (LOCAL ONLY — no push per spec §10) ──
echo "[$NOW_UTC] step 4/4: git commit (local only, NO push per spec §10)" >> "$LOG"
COMMIT_MSG="chore: update AI tools usage quota $NOW_UTC"
if git add public/usage-quota.json public/usage-history.json >> "$LOG" 2>&1 \
   && git commit -m "$COMMIT_MSG" >> "$LOG" 2>&1; then
  echo "[$NOW_UTC] step 4/4: ✅ commit OK ($COMMIT_MSG)" >> "$LOG"
else
  # No changes is also "ok" (e.g. nothing to commit). Detect via status.
  if git diff --cached --quiet 2>/dev/null; then
    echo "[$NOW_UTC] step 4/4: ⏭  nothing to commit (no quota change since last tick)" >> "$LOG"
  else
    echo "[$NOW_UTC] step 4/4: ❌ commit FAILED" >> "$LOG"
  fi
fi

echo "[$NOW_UTC] usage-cron done" >> "$LOG"
echo "════════════════════════════════════════════════════════════════" >> "$LOG"

# Always exit 0 — spec §8: cron should not silently die
exit 0