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

// ── Schema detection ──
// v1 (pre-2026-06-01): MiniMax-M*, speech-hd, image-01 (fixed counts)
// v2 (2026-06-01+):    'general' + 'video' (credit-based unified pool)
const mStar   = raw.find(m => m.model_name === 'MiniMax-M*');
const speech  = raw.find(m => m.model_name === 'speech-hd');
const image   = raw.find(m => m.model_name === 'image-01');
const general = raw.find(m => m.model_name === 'general');
const video   = raw.find(m => m.model_name === 'video');

const schema = mStar ? 'v1' : (general || video) ? 'v2' : null;
if (!schema) { console.log('No recognized model data, skipping'); process.exit(0); }

// Pick a reference model for window boundaries (any present one works)
const ref = mStar || general;

// ── Determine window label from cron runtime (capturedAt), NOT from API start_time ──
const capturedAt = new Date();
const capturedHour = capturedAt.getUTCHours();
// capturedAt is UTC; cron runs at HKT-aligned times, so UTC hour maps to HKT window:
//   UTC 0-5 → HKT 8-13 → "01-06"
//   UTC 5-10 → HKT 13-18 → "06-11"
//   UTC 10-15 → HKT 18-23 → "11-16"
//   UTC 15-20 → HKT 23-04 → "16-21"
//   UTC 20-24 → HKT 4-8  → "21-01"
let windowLabel;
if      (capturedHour >=  0 && capturedHour <  5) windowLabel = '01-06';
else if (capturedHour >=  5 && capturedHour < 10) windowLabel = '06-11';
else if (capturedHour >= 10 && capturedHour < 15) windowLabel = '11-16';
else if (capturedHour >= 15 && capturedHour < 20) windowLabel = '16-21';
else                                             windowLabel = '21-01';

// Use API start_time for dateStr and window boundaries (those are correct UTC timestamps)
const startUtc = new Date(ref.start_time);
const dateStr = startUtc.toISOString().slice(0, 10);  // UTC date of window start
const windowKey = dateStr + '_' + windowLabel;
const windowStart = startUtc.toISOString();
const windowEnd   = new Date(ref.end_time).toISOString();

// Helper: build sub-object for any model that exposes current_interval_* fields
function buildBucket(m) {
  if (!m) return null;
  const total = m.current_interval_total_count;
  const used  = total - m.current_interval_usage_count;  // mirror old semantics: 'used' = consumed
  return {
    total,
    used,
    remaining: m.current_interval_usage_count,
    usedPct:   total > 0 ? Math.round(used / total * 100) : 0,
    weeklyTotal: m.current_weekly_total_count || 0,
    weeklyUsed:  m.current_weekly_usage_count  || 0
  };
}

// ── Build snapshot entry (schema-aware) ──
const snapshot = {
  _schema: schema,
  windowKey,
  date: dateStr,
  window: windowLabel,
  windowStart: new Date(ref.start_time).toISOString(),
  windowEnd:   new Date(ref.end_time).toISOString(),
  capturedAt:  capturedAt.toISOString()
};

if (schema === 'v1') {
  snapshot.mStar  = buildBucket(mStar);
  snapshot.speech = buildBucket(speech);
  snapshot.image  = buildBucket(image);
} else {
  // v2: credit-based; total=0 in response, real usedPct comes from remaining_percent
  const g = general ? {
    ...buildBucket(general),
    usedPct: general.current_interval_remaining_percent != null
      ? 100 - general.current_interval_remaining_percent
      : (buildBucket(general).usedPct || 0),
    weeklyPct: general.current_weekly_remaining_percent != null
      ? 100 - general.current_weekly_remaining_percent
      : 0
  } : null;
  const v = video ? {
    ...buildBucket(video),
    usedPct: video.current_interval_remaining_percent != null
      ? 100 - video.current_interval_remaining_percent
      : (buildBucket(video).usedPct || 0),
    weeklyPct: video.current_weekly_remaining_percent != null
      ? 100 - video.current_weekly_remaining_percent
      : 0,
    windowKind: 'daily'  // video uses daily window, not 5hr rolling
  } : null;
  snapshot.general = g;
  snapshot.video   = v;
}

// ── Load existing history ──
let history = { _version: 1, entries: [] };
if (fs.existsSync(histFile)) {
  try { history = JSON.parse(fs.readFileSync(histFile, 'utf8')); }
  catch(e) { console.warn('History parse error, starting fresh'); }
}
if (!Array.isArray(history.entries)) history.entries = [];

// ── Check if current window is still open ──
const now = Date.now();
const windowEndMs = ref.end_time;
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

// ── Retention: FOREVER keep all entries (per Zach 2026-06-06) ──
// Previously pruned at 90 days; user wants full history for retrospective queries.
// File size estimate: ~1,825 entries/year × ~0.3 KB each ≈ 550 KB/year — trivial.
console.log('Retention policy: forever (no pruning)');

// ── Sort newest first ──
history.entries.sort((a, b) => b.windowKey.localeCompare(a.windowKey));

// ── Update metadata ──
history._version = 2;  // bumped: dual-schema support
history._updatedAt = new Date().toISOString();
history._totalEntries = history.entries.length;
history._retentionPolicy = 'forever';
history._schemasSeen = Array.from(new Set([
  ...(history._schemasSeen || []),
  schema
]));

fs.writeFileSync(histFile, JSON.stringify(history, null, 2));
console.log('✅ quota-history.json updated, total entries:', history.entries.length);
"

echo "📜 Quota history updated → $HISTORY_FILE"
