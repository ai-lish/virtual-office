#!/bin/bash
# update-quota-history.sh — Upserts a quota snapshot into quota-history.json
# Called by refresh-data.sh after minimax refresh.
# Dedup key: date + window (same day+window → overwrite; window closed → keep)
#
# MiniMax-M* windows (UTC): 01-06, 06-11, 11-16, 16-21, 21-01
# Speech / Image windows: daily (00-24 UTC)

set -euo pipefail
cd "$(dirname "$0")/.."

STATUS_FILE="public/minimax-api-status.json"
HISTORY_FILE="public/quota-history.json"

if [ ! -f "$STATUS_FILE" ]; then
  echo "❌ $STATUS_FILE not found, skipping history update"
  exit 0
fi

# ── Compute window for MiniMax-M* (5-hour rolling) ──
get_m_window() {
  # Given start_time ms from API, derive named window
  local start_ms="$1"
  # Convert to UTC hour
  local hour
  hour=$(date -u -r $(( start_ms / 1000 )) '+%H' 2>/dev/null || \
         python3 -c "import datetime; print(datetime.datetime.utcfromtimestamp($start_ms/1000).strftime('%H'))")
  local h=$((10#$hour))
  if   [ $h -ge  1 ] && [ $h -lt  6 ]; then echo "01-06"
  elif [ $h -ge  6 ] && [ $h -lt 11 ]; then echo "06-11"
  elif [ $h -ge 11 ] && [ $h -lt 16 ]; then echo "11-16"
  elif [ $h -ge 16 ] && [ $h -lt 21 ]; then echo "16-21"
  else echo "21-01"
  fi
}

node -e "
const fs = require('fs');

const status = JSON.parse(fs.readFileSync('$STATUS_FILE', 'utf8'));
const histFile = '$HISTORY_FILE';

// ── Parse current snapshot ──
const raw = status.raw?.model_remains || [];
const generatedAt = status._generatedAt || new Date().toISOString();

// Find key models
const mStar   = raw.find(m => m.model_name === 'MiniMax-M*');
const speech  = raw.find(m => m.model_name === 'speech-hd');
const image   = raw.find(m => m.model_name === 'image-01');

if (!mStar) { console.log('No MiniMax-M* data, skipping'); process.exit(0); }

// ── Determine window key (HKT = UTC+8) ──
// Use CURRENT TIME to determine which window just ended
// Cron runs at: 21, 01, 06, 11, 16 UTC
// At each run, we capture the window that JUST CLOSED (not the one we're in)
const now = new Date();
const cronHour = now.getUTCHours();

// Determine window label and date based on WHEN the cron runs (not API start_time)
// Cron at UTC 21: captures 21-01 window from PREVIOUS HKT day (evening of day-1)
// Cron at UTC 01: captures 01-06 window from SAME HKT day (early morning)
// Cron at UTC 06: captures 06-11 window from SAME HKT day
// Cron at UTC 11: captures 11-16 window from SAME HKT day
// Cron at UTC 16: captures 16-21 window from SAME HKT day
let window, dateStr;
if (cronHour >= 21 || cronHour < 1) {
    // Captures 21-01 window. Window starts at 21:00 HKT yesterday, ends at 01:00 HKT today.
    window = '21-01';
    // HKT date of "now" is tomorrow, but the window is from yesterday
    const hktNow = new Date(now.getTime() + 8 * 3600 * 1000);
    hktNow.setDate(hktNow.getDate() - 1); // Go back to yesterday HKT
    dateStr = hktNow.toISOString().slice(0, 10);
} else if (cronHour >= 1 && cronHour < 6) {
    window = '01-06';
    const hktNow = new Date(now.getTime() + 8 * 3600 * 1000);
    dateStr = hktNow.toISOString().slice(0, 10);
} else if (cronHour >= 6 && cronHour < 11) {
    window = '06-11';
    const hktNow = new Date(now.getTime() + 8 * 3600 * 1000);
    dateStr = hktNow.toISOString().slice(0, 10);
} else if (cronHour >= 11 && cronHour < 16) {
    window = '11-16';
    const hktNow = new Date(now.getTime() + 8 * 3600 * 1000);
    dateStr = hktNow.toISOString().slice(0, 10);
} else {
    // cronHour >= 16 && cronHour < 21
    window = '16-21';
    const hktNow = new Date(now.getTime() + 8 * 3600 * 1000);
    dateStr = hktNow.toISOString().slice(0, 10);
}

const windowKey = dateStr + '_' + window; // e.g. 2026-04-01_21-01

// ── Build snapshot entry ──
const snapshot = {
  windowKey,
  date: dateStr,
  window,
  windowStart: new Date(mStar.start_time).toISOString(),
  windowEnd:   new Date(mStar.end_time).toISOString(),
  capturedAt:  new Date().toISOString(),
  mStar: mStar ? {
    total:     mStar.current_interval_total_count,
    used:      mStar.current_interval_total_count - mStar.current_interval_usage_count,
    remaining: mStar.current_interval_usage_count,
    usedPct:   mStar.current_interval_total_count > 0
      ? Math.round((mStar.current_interval_total_count - mStar.current_interval_usage_count) / mStar.current_interval_total_count * 100)
      : 0
  } : null,
  speech: speech ? {
    total:     speech.current_interval_total_count,
    used:      speech.current_interval_total_count - speech.current_interval_usage_count,
    remaining: speech.current_interval_usage_count,
    usedPct:   speech.current_interval_total_count > 0
      ? Math.round((speech.current_interval_total_count - speech.current_interval_usage_count) / speech.current_interval_total_count * 100)
      : 0,
    weeklyTotal: speech.current_weekly_total_count,
    weeklyUsed:  speech.current_weekly_usage_count
  } : null,
  image: image ? {
    total:     image.current_interval_total_count,
    used:      image.current_interval_total_count - image.current_interval_usage_count,
    remaining: image.current_interval_usage_count,
    usedPct:   image.current_interval_total_count > 0
      ? Math.round((image.current_interval_total_count - image.current_interval_usage_count) / image.current_interval_total_count * 100)
      : 0,
    weeklyTotal: image.current_weekly_total_count,
    weeklyUsed:  image.current_weekly_usage_count
  } : null
};

// ── Load existing history ──
let history = { _version: 1, entries: [] };
if (fs.existsSync(histFile)) {
  try { history = JSON.parse(fs.readFileSync(histFile, 'utf8')); }
  catch(e) { console.warn('History parse error, starting fresh'); }
}
if (!Array.isArray(history.entries)) history.entries = [];

// ── Check if current window is still open ──
const now = Date.now();
const windowEndMs = mStar.end_time;
const windowOpen = now < windowEndMs;

// ── Dedup: find existing entry with same windowKey ──
const idx = history.entries.findIndex(e => e.windowKey === windowKey);

if (idx >= 0) {
  const existing = history.entries[idx];
  if (windowOpen) {
    // Window still open → overwrite with latest snapshot
    history.entries[idx] = snapshot;
    console.log('Updated open window:', windowKey);
  } else {
    // Window closed → keep the existing record (don't overwrite)
    console.log('Window closed, keeping existing record:', windowKey);
  }
} else {
  // New window → prepend
  history.entries.unshift(snapshot);
  console.log('Added new window:', windowKey);
}

// ── Retention: keep last 90 days ──
const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
const before = history.entries.length;
history.entries = history.entries.filter(e => e.date >= cutoff);
const removed = before - history.entries.length;
if (removed > 0) console.log('Pruned', removed, 'old entries (>90 days)');

// ── Sort newest first ──
history.entries.sort((a, b) => b.windowKey.localeCompare(a.windowKey));

// ── Update metadata ──
history._version = 1;
history._updatedAt = new Date().toISOString();
history._totalEntries = history.entries.length;

fs.writeFileSync(histFile, JSON.stringify(history, null, 2));
console.log('✅ quota-history.json updated, total entries:', history.entries.length);
"

echo "📜 Quota history updated → $HISTORY_FILE"
