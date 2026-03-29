#!/bin/bash
# ============================================================
# virtual-office Site Monitor
# Monitors https://ai-lish.github.io/virtual-office/ every 15 minutes
# Sends Discord notifications on failure
# Logs heartbeats to scripts/site-monitor.log
# ============================================================

GITHUB_PAGES_URL="https://ai-lish.github.io/virtual-office"
COPILOT_PAGE="${GITHUB_PAGES_URL}/public/pages/copilot-static.html"
LOG_FILE="/Users/zachli/.openclaw/workspace/virtual-office/scripts/site-monitor.log"
LOCK_FILE="/Users/zachli/.openclaw/workspace/virtual-office/scripts/site-monitor.lock"

# Discord webhook — replace with your own monitoring webhook
# Get one from Discord Server Settings > Integrations > Webhooks
DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"

# Threshold for consecutive failures before alerting
MAX_RETRIES=1

# ============================================================
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
    else
        log "DISCORD_WEBHOOK_URL not set — skipping Discord notification"
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
        log "Discord recovery notification sent"
    fi
}

# ============================================================
# Main check
# ============================================================

# Prevent concurrent runs
if [ -f "$LOCK_FILE" ]; then
    LOCK_AGE=$(($(date +%s) - $(stat -f %m "$LOCK_FILE" 2>/dev/null || echo $(date +%s))))
    if [ "$LOCK_AGE" -lt 300 ]; then
        log "Another instance is running (lock age: ${LOCK_AGE}s). Exiting."
        exit 0
    fi
    log "Stale lock found (${LOCK_AGE}s old). Removing."
fi
echo "$$" > "$LOCK_FILE"

# Track consecutive failures
FAIL_COUNT_FILE="/Users/zachli/.openclaw/workspace/virtual-office/scripts/site-monitor.failcount"
FAIL_COUNT=$(cat "$FAIL_COUNT_FILE" 2>/dev/null || echo 0)
COPILOT_OK=0

log "=== Starting site check ==="
log "URL: $GITHUB_PAGES_URL"

# Check main page
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 30 \
    -L \
    "$GITHUB_PAGES_URL" 2>&1)

log "Main page HTTP status: $HTTP_STATUS"

if [ "$HTTP_STATUS" != "200" ]; then
    log "ERROR: Main page returned status $HTTP_STATUS"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo "$FAIL_COUNT" > "$FAIL_COUNT_FILE"

    if [ "$FAIL_COUNT" -ge "$MAX_RETRIES" ]; then
        send_discord_alert "$HTTP_STATUS" "Main page returned HTTP $HTTP_STATUS after $FAIL_COUNT check(s)"
    fi
else
    log "Main page: OK"

    # Optionally check copilot-static.html for data
    COPILOT_CHECK=$(curl -s --max-time 30 -L "$COPILOT_PAGE" 2>&1)
    if echo "$COPILOT_CHECK" | grep -q "Copilot\|copilot\|用量"; then
        log "copilot-static.html: OK (data detected)"
        COPILOT_OK=1
    else
        log "copilot-static.html: loaded but no expected content found"
        COPILOT_OK=0
    fi

    # Recovery notification if we were previously failing
    if [ "$FAIL_COUNT" -ge "$MAX_RETRIES" ]; then
        send_discord_recovery
    fi
    FAIL_COUNT=0
    echo "0" > "$FAIL_COUNT_FILE"
fi

log "=== Check complete ==="
log ""

# ============================================================
# Generate monitoring-status.json for GitHub Pages
# ============================================================
STATUS_FILE="/Users/zachli/.openclaw/workspace/virtual-office/monitoring-status.json"
REPO_DIR="/Users/zachli/.openclaw/workspace/virtual-office"

# Read existing stats or initialize
if [ -f "$STATUS_FILE" ]; then
    TOTAL=$(node -e "try{const j=require('$STATUS_FILE');console.log(j.totalChecks||0)}catch(e){console.log(0)}" 2>/dev/null || echo 0)
    UOK=$(node -e "try{const j=require('$STATUS_FILE');console.log(j.uptime||100)}catch(e){console.log(100)}" 2>/dev/null || echo 100)
else
    TOTAL=0
    UPOK=100
fi

TOTAL=$((TOTAL + 1))
CHECK_TIME=$(date '+%H:%M')
CHECK_DATE=$(date '+%Y-%m-%d %H:%M')

if [ "$HTTP_STATUS" = "200" ]; then
    SITE_STATUS="ok"
    NEW_UPOK=$UPOK
else
    SITE_STATUS="error"
fi

# Build JSON
node -e "
const fs = require('fs');
const path = '$STATUS_FILE';
let data = { generatedAt: '$CHECK_DATE', url: '$GITHUB_PAGES_URL', siteStatus: '$SITE_STATUS', lastCheck: '$CHECK_TIME', uptime: $UPOK, totalChecks: $TOTAL, checks: [] };
try {
    const existing = JSON.parse(fs.readFileSync(path, 'utf8'));
    if (existing.checks) {
        data.checks = existing.checks.slice(-4);
    }
} catch(e) {}
data.checks.unshift({ name: '主頁 HTTP', status: $HTTP_STATUS, time: '$CHECK_TIME' });
const copilotOk = '$COPILOT_OK';
data.checks.unshift({ name: 'Copilot 數據', status: copilotOk === '1' ? 200 : 404, time: '$CHECK_TIME' });
data.uptime = Math.round(data.checks.filter(c => c.status === 200).length / data.checks.length * 100);
fs.writeFileSync(path, JSON.stringify(data, null, 2));
" 2>/dev/null

log "monitoring-status.json updated"

# Auto-push to GitHub (if changes detected)
cd "$REPO_DIR" && git diff --quiet monitoring-status.json 2>/dev/null
if [ $? -ne 0 ]; then
    git add monitoring-status.json 2>/dev/null
    git commit -m "chore: auto-update monitoring status [ci skip]" 2>/dev/null
    GIT_TERMINAL_PROMPT=0 git push origin main 2>/dev/null
    log "monitoring-status.json pushed to GitHub"
fi

# Clean up lock
rm -f "$LOCK_FILE"
