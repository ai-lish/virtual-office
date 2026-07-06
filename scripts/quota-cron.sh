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
  PUSH_OUTPUT=$(git push origin main 2>&1)
  PUSH_EXIT=$?
  echo "$PUSH_OUTPUT" >> "$LOG"
  if [ $PUSH_EXIT -ne 0 ]; then
    echo "[$(date)] push failed (continuing — memory-sync may pick up)" >> "$LOG"
  else
    # Step 5.5/5: Post-push Pages verification (Codex review fix 2026-07-06)
    #
    # Without this check, a transient Pages deploy failure (e.g. the 14-hour
    # stale JSON observed on 2026-07-06) goes unnoticed until the next cron
    # tick — and even then only if someone manually inspects. We wait for
    # the deploy to settle, then verify the live Pages JSON's _generatedAt
    # matches what we just pushed. If still stale after 4.5 min, send a
    # Discord alert (uses optional $DISCORD_WEBHOOK_URL, same pattern as
    # scripts/site-monitor.sh; silently skipped if unset).
    echo "[$(date)] step 5.5/5: post-push Pages verification (target _generatedAt=$NOW_ISO)" >> "$LOG"
    PAGES_URL="https://ai-lish.github.io/virtual-office/public/usage-quota.json"
    VERIFIED=""
    for i in 1 2 3 4 5 6 7 8 9; do
      sleep 30
      PAGES_TS=$(curl -sf -H "Cache-Control: no-cache" -H "Pragma: no-cache" \
        "${PAGES_URL}?nocache=$(date +%s%N)" 2>/dev/null \
        | jq -r '._generatedAt // empty' 2>/dev/null)
      if [ "$PAGES_TS" = "$NOW_ISO" ]; then
        echo "[$(date)] post-push verify OK (attempt $i, +$((i*30))s): Pages _generatedAt matches" >> "$LOG"
        VERIFIED="ok"
        break
      else
        echo "[$(date)] post-push verify attempt $i (+$((i*30))s): Pages _generatedAt=$PAGES_TS (waiting for $NOW_ISO)" >> "$LOG"
      fi
    done
    if [ "$VERIFIED" != "ok" ]; then
      FAIL_MSG="⚠️ quota-cron post-push verify FAILED after ~4.5min: pushed _generatedAt=$NOW_ISO but Pages still shows _generatedAt=${PAGES_TS:-<unreachable>}. Likely Pages deploy is stuck (known issue: actions/deploy-pages transient 500)."
      echo "[$(date)] $FAIL_MSG" >> "$LOG"
      if [ -n "${DISCORD_WEBHOOK_URL:-}" ]; then
        ALERT_PAYLOAD=$(jq -n \
          --arg msg "$FAIL_MSG" \
          --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
          '{
            embeds: [{
              title: "⚠️ Virtual Office Pages stale",
              color: 15158332,
              description: $msg,
              footer: { text: "quota-cron.sh step 5.5/5" },
              timestamp: $ts
            }]
          }')
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
          -X POST "$DISCORD_WEBHOOK_URL" \
          -H "Content-Type: application/json" \
          -d "$ALERT_PAYLOAD")
        echo "[$(date)] Discord alert sent (HTTP $HTTP_CODE)" >> "$LOG"
      else
        echo "[$(date)] DISCORD_WEBHOOK_URL not set — skipping Discord alert" >> "$LOG"
      fi
    fi
  fi
fi

echo "[$(date)] Done!" >> "$LOG"