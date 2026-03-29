#!/bin/bash
# ============================================================
# virtual-office Site Monitor (Lightweight - No Git Push)
# Runs every hour, stores results locally
# For Google Sheets sync: run site-test.js daily instead
# ============================================================

GITHUB_PAGES_URL="https://ai-lish.github.io/virtual-office"
COPILOT_PAGE="${GITHUB_PAGES_URL}/public/pages/copilot-static.html"
LOG_FILE="/Users/zachli/.openclaw/workspace/virtual-office/scripts/site-monitor.log"
LOCK_FILE="/Users/zachli/.openclaw/workspace/virtual-office/scripts/site-monitor.lock"
STATUS_FILE="/Users/zachli/.openclaw/workspace/virtual-office/monitoring-status.json"
FAIL_COUNT_FILE="/Users/zachli/.openclaw/workspace/virtual-office/scripts/site-monitor.failcount"

DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"
MAX_RETRIES=1

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

send_discord_alert() {
    local status=$1
    local message=$2
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        curl -s -X POST "$DISCORD_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"embeds\": [{
                    \"title\": \"🔴 Virtual Office Site Down\",
                    \"color\": 15158332,
                    \"description\": \"$message\",
                    \"fields\": [
                        { \"name\": \"URL\", \"value\": \"$GITHUB_PAGES_URL\", \"inline\": true },
                        { \"name\": \"Status\", \"value\": \"$status\", \"inline\": true }
                    ],
                    \"footer\": { \"text\": \"virtual-office site monitor\" },
                    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
                }]
            }" >> "$LOG_FILE" 2>&1
        log "Discord alert sent"
    fi
}

send_discord_recovery() {
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        curl -s -X POST "$DISCORD_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"embeds\": [{
                    \"title\": \"🟢 Virtual Office Site Recovered\",
                    \"color\": 3066993,
                    \"description\": \"Site is back online.\",
                    \"fields\": [
                        { \"name\": \"URL\", \"value\": \"$GITHUB_PAGES_URL\", \"inline\": true }
                    ],
                    \"footer\": { \"text\": \"virtual-office site monitor\" },
                    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
                }]
            }" >> "$LOG_FILE" 2>&1
    fi
}

# Prevent concurrent runs
if [ -f "$LOCK_FILE" ]; then
    LOCK_AGE=$(($(date +%s) - $(stat -f %m "$LOCK_FILE" 2>/dev/null || echo $(date +%s))))
    if [ "$LOCK_AGE" -lt 300 ]; then
        log "Another instance running (${LOCK_AGE}s). Exiting."
        exit 0
    fi
fi
echo "$$" > "$LOCK_FILE"

FAIL_COUNT=$(cat "$FAIL_COUNT_FILE" 2>/dev/null || echo 0)
COPILOT_OK=0

log "=== Site check ==="

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -L "$GITHUB_PAGES_URL" 2>&1)
log "Main page: $HTTP_STATUS"

if [ "$HTTP_STATUS" != "200" ]; then
    log "ERROR: HTTP $HTTP_STATUS"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo "$FAIL_COUNT" > "$FAIL_COUNT_FILE"
    [ "$FAIL_COUNT" -ge "$MAX_RETRIES" ] && send_discord_alert "$HTTP_STATUS" "HTTP $HTTP_STATUS after $FAIL_COUNT checks"
else
    log "Main page OK"
    COPILOT_CHECK=$(curl -s --max-time 30 -L "$COPILOT_PAGE" 2>&1)
    if echo "$COPILOT_CHECK" | grep -q "Copilot\|copilot\|用量"; then
        COPILOT_OK=1
        log "Copilot page OK"
    fi
    [ "$FAIL_COUNT" -ge "$MAX_RETRIES" ] && send_discord_recovery
    FAIL_COUNT=0
    echo "0" > "$FAIL_COUNT_FILE"
fi

# Update local monitoring-status.json (NO git push)
CHECK_TIME=$(date '+%H:%M')
CHECK_DATE=$(date '+%Y-%m-%d %H:%M')
TOTAL=$(node -e "try{const j=require('$STATUS_FILE');console.log(j.totalChecks||0)}catch(e){console.log(0)}" 2>/dev/null || echo 0)
TOTAL=$((TOTAL + 1))

node -e "
const fs = require('fs');
const path = '$STATUS_FILE';
let data = { generatedAt: '$CHECK_DATE', url: '$GITHUB_PAGES_URL', siteStatus: '$HTTP_STATUS' === '200' ? 'ok' : 'error', lastCheck: '$CHECK_TIME', totalChecks: $TOTAL, copilotOk: $COPILOT_OK };
try {
    const existing = JSON.parse(fs.readFileSync(path, 'utf8'));
    if (existing.checks) data.checks = existing.checks.slice(-9);
} catch(e) {}
data.checks = data.checks || [];
data.checks.unshift({ name: '主頁', status: $HTTP_STATUS, time: '$CHECK_TIME' });
if ($COPILOT_OK) data.checks.unshift({ name: 'Copilot', status: 200, time: '$CHECK_TIME' });
data.uptime = Math.round(data.checks.filter(c => c.status === 200).length / data.checks.length * 100);
fs.writeFileSync(path, JSON.stringify(data, null, 2));
" 2>/dev/null

log "monitoring-status.json updated (local only)"
log "=== Done ==="
rm -f "$LOCK_FILE"
