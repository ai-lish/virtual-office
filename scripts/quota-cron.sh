#!/bin/bash
# quota-cron.sh — Unified quota cron (V2 per Planning §3.4.3)
#
# Replaces the previous separate ai.openclaw.usage-cron + ai.openclaw.minimax-cron
# jobs. Refreshes Codex + Claude + MiniMax + Copilot in sequence with a single
# _generatedAt timestamp, then commits + pushes to origin/main in one transaction.
#
# Schedule: hours 4/9/14/19/23 local HKT, minute 55 (5x/day)
# Logs to: ~/.openclaw/workspace/logs/quota-cron.log
#
# Per Planning §3.4.5: this cron DOES push to origin (overrides V1's
# spec §10 no-push rule). Reasoning:
#   - Pages auto-rebuild needs unified timestamp on live JSON files
#   - memory-sync plist currently NOT loaded (per workspace MEMORY.md)
#   - 5x/day push is acceptable rate

set -u
WORKDIR="/Users/zachli/.openclaw/workspace/virtual-office"
export PATH="/opt/homebrew/opt/node/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
LOG="/Users/zachli/.openclaw/workspace/logs/quota-cron.log"
NOW_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "[$(date)] Unified quota cron started (ts=$NOW_ISO)" >> "$LOG"

cd "$WORKDIR"

# Step 1/5: Refresh Codex + Claude → usage-quota.json
echo "[$(date)] step 1/5: Codex + Claude" >> "$LOG"
python3 scripts/fetch-usage.py --set-timestamp "$NOW_ISO" >> "$LOG" 2>&1 \
  || echo "[$(date)] step 1 failed (continuing per spec §8)" >> "$LOG"

# Step 2/5: Refresh MiniMax → minimax-api-status.json
# (This also writes history via refresh-data.sh internals; we re-run update-quota-history
#  below to ensure Codex/Claude get included in the same windowKey entry.)
echo "[$(date)] step 2/5: MiniMax" >> "$LOG"
bash scripts/refresh-data.sh minimax "$NOW_ISO" >> "$LOG" 2>&1 \
  || echo "[$(date)] step 2 failed (continuing per spec §8)" >> "$LOG"

# Step 3/5: Refresh Copilot summary
echo "[$(date)] step 3/5: Copilot" >> "$LOG"
bash scripts/refresh-data.sh copilot "$NOW_ISO" >> "$LOG" 2>&1 \
  || echo "[$(date)] step 3 failed (continuing per spec §8)" >> "$LOG"

# Step 4/5: Update quota-history.json with codex + claude sub-objects
# (refresh-data.sh minimax already wrote history but with codex/claude fields
# potentially missing — re-run update-quota-history to ensure unified snapshot.)
echo "[$(date)] step 4/5: quota-history" >> "$LOG"
bash scripts/update-quota-history.sh "$NOW_ISO" >> "$LOG" 2>&1 \
  || echo "[$(date)] step 4 failed (continuing per spec §8)" >> "$LOG"

# Step 5/5: Commit + push
echo "[$(date)] step 5/5: commit + push" >> "$LOG"
git add public/usage-quota.json public/minimax-api-status.json public/copilot-summary.json public/quota-history.json 2>/dev/null || true
if git diff --cached --quiet; then
  echo "[$(date)] nothing to commit" >> "$LOG"
else
  git commit -m "chore: refresh AI quota $NOW_ISO" >> "$LOG" 2>&1 \
    || echo "[$(date)] commit failed" >> "$LOG"
  git push origin main >> "$LOG" 2>&1 \
    || echo "[$(date)] push failed (continuing — memory-sync may pick up)" >> "$LOG"
fi

echo "[$(date)] Done!" >> "$LOG"