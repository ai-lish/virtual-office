#!/bin/bash
# Phase 11: Daily Token CSV Sync Script
# Run via cron: 0 4 * * * /path/to/virtual-office/scripts/phase11-daily-sync.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/logs/phase11-sync.log"

# Create logs directory if not exists
mkdir -p "$PROJECT_DIR/logs"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Change to project directory
cd "$PROJECT_DIR"

log "=== Phase 11 Daily Sync Started ==="

# Run the daily tasks
log "Running daily import..."
node phase11-cron.js daily >> "$LOG_FILE" 2>&1

log "=== Phase 11 Daily Sync Complete ==="

# Exit successfully
exit 0
