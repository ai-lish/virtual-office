#!/bin/bash
# MiniMax Token Cron - 從 MacD Files 下載最新 quota CSV，更新到 GitHub Pages
# MacD Files: 1GUZ0C-grqBdtWGBB0mgO9izuN7Qrs-Gb
# Script ID: 15CalUd1p4yyzTbWpdIOZPCbKShmWEsui

set -e

WORKDIR="/Users/zachli/.openclaw/workspace/virtual-office"
TEMP_CSV="/tmp/minimax-remains-cron.csv"
LOG="/Users/zachli/.openclaw/workspace/logs/minimax-cron.log"

echo "[$(date)] MiniMax cron started" >> "$LOG"

# 1. 下載最新 quota CSV
gog drive download 15CalUd1p4yyzTbWpdIOZPCbKShmWEsui --out "$TEMP_CSV" 2>&1 | head -1 >> "$LOG"

# 2. 解析 CSV - 取第一行數據 (M2.7 model)
# 欄位: API回應時間,模型,interval配額,剩餘prompts,已用prompts,...
# 跳過 header，取第一行
ROW=$(tail -n +2 "$TEMP_CSV" | head -1 2>/dev/null || echo "")
if [ -z "$ROW" ]; then
    echo "[$(date)] No data downloaded" >> "$LOG"
    exit 1
fi

# Parse CSV fields (comma separated, no quotes)
INTERVAL_QUOTA=$(echo "$ROW" | awk -F',' '{print $3}')
REMAIN_PROMPTS=$(echo "$ROW" | awk -F',' '{print $4}')
USED_PROMPTS=$(echo "$ROW" | awk -F',' '{print $5}')

echo "[$(date)] M2.7: used=$USED_PROMPTS total=$INTERVAL_QUOTA remaining=$REMAIN_PROMPTS" >> "$LOG"

# 3. 驗證數值
if [ "$INTERVAL_QUOTA" = "" ] || [ "$INTERVAL_QUOTA" = "0" ]; then
    echo "[$(date)] Invalid quota value" >> "$LOG"
    exit 1
fi

# 4. 計算
REMAINING=$((INTERVAL_QUOTA - USED_PROMPTS))
PERCENT=$(awk -v used="$USED_PROMPTS" -v total="$INTERVAL_QUOTA" 'BEGIN {printf "%.1f", (used/total)*100}')

# 5. 生成 JSON
cat > "$WORKDIR/public/minimax-api-status.json" << EOF
{
  "_generatedAt": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
  "quota": {
    "total": $INTERVAL_QUOTA,
    "used": $USED_PROMPTS,
    "remaining": $REMAINING,
    "usedPercent": $PERCENT,
    "resetDate": "2026-04-05",
    "warningLevel": "normal",
    "intervalHours": 5
  },
  "source": "MacD Files: MiniMax-API-remains CSV (gog drive)"
}
EOF

echo "[$(date)] JSON updated: $USED_PROMPTS/$INTERVAL_QUOTA ($PERCENT%)" >> "$LOG"

# 6. Commit & push
cd "$WORKDIR"
git add public/minimax-api-status.json
git commit -m "chore: update Minimax quota $USED_PROMPTS/$INTERVAL_QUOTA (cron)" >> "$LOG" 2>&1
git push origin main >> "$LOG" 2>&1

echo "[$(date)] Done!" >> "$LOG"