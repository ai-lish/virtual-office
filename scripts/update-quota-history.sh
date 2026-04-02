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
// HKT windows are based on Hong Kong local time (UTC+8)
// Windows 21-01, 16-21, 11-16 start in the evening HKT of "day X" and end in early HKT of "day X+1"
// When UTC hour >= 20, the HKT date is "tomorrow" relative to UTC date
// So for windows captured during these hours, subtract 1 day
const startMs = mStar.start_time;
const startDate = new Date(startMs);
const utcHour = startDate.getUTCHours();

// HKT hour: (UTC + 8) % 24
const hktHour = (utcHour + 8) % 24;

// Determine window label from UTC hour (cron runs at fixed UTC hours: 01, 06, 11, 16, 21)
let window;
if      (utcHour >= 1  && utcHour < 6)  window = '01-06';
else if (utcHour >= 6  && utcHour < 11) window = '06-11';
else if (utcHour >= 11 && utcHour < 16) window = '11-16';
else if (utcHour >= 16 && utcHour < 21) window = '16-21';
else                                     window = '21-01'; // utcHour >= 21

// Compute HKT date: if UTC hour >= 20, HKT date is "tomorrow", so subtract 1 day
const hktDate = new Date(startDate.getTime() + 8 * 3600 * 1000);
if (utcHour >= 20) hktDate.setDate(hktDate.getDate() - 1);
const dateStr = hktDate.toISOString().slice(0, 10); // YYYY-MM-DD in HKT

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
