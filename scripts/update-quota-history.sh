#!/bin/bash
# update-quota-history.sh — Upserts a quota snapshot into quota-history.json
# Called by quota-cron.sh after MiniMax + Codex + Claude refresh.
# Dedup key: date + window (same day+window → overwrite; window closed → keep)
#
# MiniMax-M* windows (UTC): 01-06, 06-11, 11-16, 16-21, 21-01
# Speech / Image windows: daily (00-24 UTC)
#
# Per Planning/20260628_HOMEPAGE_DASHBOARD_REDESIGN_V2.md §3.7:
#   v2 entries include codex + claude sub-objects (sourced from
#   public/usage-quota.json) and EXCLUDE video field (filtered upstream).

set -euo pipefail
cd "$(dirname "$0")/.."

STATUS_FILE="public/minimax-api-status.json"
USAGE_FILE="public/usage-quota.json"
HISTORY_FILE="public/quota-history.json"
SET_TIMESTAMP="${1:-}"  # Optional ISO 8601 UTC override (passed by quota-cron.sh)

if [ ! -f "$STATUS_FILE" ]; then
  echo "❌ $STATUS_FILE not found, skipping history update"
  exit 0
fi

# Export env vars so the embedded node script can read them
export STATUS_FILE USAGE_FILE HISTORY_FILE SET_TIMESTAMP

node -e "
const fs = require('fs');

const status = JSON.parse(fs.readFileSync(process.env.STATUS_FILE, 'utf8'));
const histFile = process.env.HISTORY_FILE;
const usageFile = process.env.USAGE_FILE;
const setTs = process.env.SET_TIMESTAMP;

// ── Parse current snapshot ──
const raw = status.raw?.model_remains || [];

// ── Schema detection ──
// v1 (pre-2026-06-01): MiniMax-M*, speech-hd, image-01 (fixed counts)
// v2 (2026-06-01+):    'general' (+codex +claude per V2 plan)
const mStar   = raw.find(m => m.model_name === 'MiniMax-M*');
const speech  = raw.find(m => m.model_name === 'speech-hd');
const image   = raw.find(m => m.model_name === 'image-01');
const general = raw.find(m => m.model_name === 'general');

const schema = mStar ? 'v1' : general ? 'v2' : null;
if (!schema) { console.log('No recognized model data, skipping'); process.exit(0); }

// ── Read Codex + Claude + Gemini from usage-quota.json (V3 unified schema) ──
let codex = null;
let claude = null;
let gemini = null;
if (fs.existsSync(usageFile)) {
  try {
    const u = JSON.parse(fs.readFileSync(usageFile, 'utf8'));
    if (u.codex && u.codex.available !== false) {
      codex = {
        primary_5h_pct: u.codex.primary_5h?.used_percent ?? null,
        secondary_7d_pct: u.codex.secondary_7d?.used_percent ?? null,
        plan: u.codex.plan || null
      };
    }
    if (u.claude && u.claude.available !== false) {
      claude = {
        primary_5h_pct: u.claude.primary_5h?.used_percent ?? null,
        secondary_7d_pct: u.claude.secondary_7d?.used_percent ?? null,
        subscription: u.claude.subscription || null
      };
    }
    // V3 (2026-06-28): Gemini has buckets[] (per-model REQUESTS) instead of
    // 5h/7d. Persist min remainingPercent + plan so dashboard history row
    // stays single-column. Full bucket list is in usage-quota.json only.
    if (u.gemini && u.gemini.available !== false) {
      gemini = {
        remainingPercent: u.gemini.remaining_percent ?? null,
        plan: u.gemini.plan || null,
        bucketCount: Array.isArray(u.gemini.buckets) ? u.gemini.buckets.length : 0
      };
    }
  } catch(e) {
    console.warn('usage-quota.json parse error, codex/claude/gemini will be null:', e.message);
  }
}

// Pick a reference model for window boundaries
const ref = mStar || general;

// ── Determine window label from cron runtime (capturedAt) ──
// SET_TIMESTAMP overrides Date.now() so unified cron keeps timestamps in sync.
const capturedAt = setTs ? new Date(setTs) : new Date();
const capturedHour = capturedAt.getUTCHours();
let windowLabel;
if      (capturedHour >=  0 && capturedHour <  5) windowLabel = '01-06';
else if (capturedHour >=  5 && capturedHour < 10) windowLabel = '06-11';
else if (capturedHour >= 10 && capturedHour < 15) windowLabel = '11-16';
else if (capturedHour >= 15 && capturedHour < 20) windowLabel = '16-21';
else                                             windowLabel = '21-01';

const startUtc = new Date(ref.start_time);
const dateStr = startUtc.toISOString().slice(0, 10);
const windowKey = dateStr + '_' + windowLabel;
const windowStart = startUtc.toISOString();
const windowEnd   = new Date(ref.end_time).toISOString();

function buildBucket(m) {
  if (!m) return null;
  const total = m.current_interval_total_count;
  const used  = total - m.current_interval_usage_count;
  return {
    total,
    used,
    remaining: m.current_interval_usage_count,
    usedPct:   total > 0 ? Math.round(used / total * 100) : 0,
    weeklyTotal: m.current_weekly_total_count || 0,
    weeklyUsed:  m.current_weekly_usage_count  || 0
  };
}

const snapshot = {
  _schema: schema,
  windowKey,
  date: dateStr,
  window: windowLabel,
  windowStart,
  windowEnd,
  capturedAt: capturedAt.toISOString()
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
  snapshot.general = g;
  // V2 plan §3.6.1: video model excluded from history going forward.
  // V2 plan §3.3.4: codex + claude sub-objects from usage-quota.json
  // V3 (2026-06-28): gemini sub-object (single column = min remainingPercent)
  if (codex) snapshot.codex = codex;
  if (claude) snapshot.claude = claude;
  if (gemini) snapshot.gemini = gemini;
}

// ── Load existing history ──
let history = { _version: 1, entries: [] };
if (fs.existsSync(histFile)) {
  try { history = JSON.parse(fs.readFileSync(histFile, 'utf8')); }
  catch(e) { console.warn('History parse error, starting fresh'); }
}
if (!Array.isArray(history.entries)) history.entries = [];

const now = Date.now();
const windowEndMs = ref.end_time;
const windowOpen = now < windowEndMs;

const idx = history.entries.findIndex(e => e.windowKey === windowKey);

if (idx >= 0) {
  if (windowOpen) {
    history.entries[idx] = snapshot;
    console.log('Updated open window:', windowKey);
  } else {
    console.log('Window closed, keeping existing record:', windowKey);
  }
} else {
  history.entries.unshift(snapshot);
  console.log('Added new window:', windowKey);
}

console.log('Retention policy: forever (no pruning)');

history.entries.sort((a, b) => b.windowKey.localeCompare(a.windowKey));

history._version = 2;
history._updatedAt = capturedAt.toISOString();
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
