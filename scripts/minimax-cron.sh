#!/bin/bash
# MiniMax Quota Cron — 直接 call MiniMax API 更新 JSON
set -e
WORKDIR="/Users/zachli/.openclaw/workspace/virtual-office"
export PATH="/opt/homebrew/opt/node/bin:$PATH"
LOG="/Users/zachli/.openclaw/workspace/logs/minimax-cron.log"

echo "[$(date)] MiniMax cron started" >> "$LOG"

cd "$WORKDIR"
bash scripts/refresh-data.sh minimax >> "$LOG" 2>&1

# Commit & push
cd "$WORKDIR"
git add public/minimax-api-status.json public/quota-history.json
git commit -m "chore: update Minimax quota $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG" 2>&1
git push origin main >> "$LOG" 2>&1

echo "[$(date)] Done!" >> "$LOG"
