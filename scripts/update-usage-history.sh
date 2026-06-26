#!/bin/bash
# update-usage-history.sh — Upsert a Codex+Claude quota snapshot into
#                            public/usage-history.json
#
# Pattern copied from update-quota-history.sh (Node one-liner).
# Dedup key: windowKey = "<UTC date>_<HH-MM>" from capturedAt (cron runtime).
# Always overwrite same windowKey (idempotent re-runs).
# Retention: forever (no pruning).
# Sort: newest first by windowKey.
set -euo pipefail
cd "$(dirname "$0")/.."

STATUS_FILE="public/usage-quota.json"
HISTORY_FILE="public/usage-history.json"

if [ ! -f "$STATUS_FILE" ]; then
  echo "❌ $STATUS_FILE not found, skipping history update"
  exit 0
fi

node -e "
const fs = require('fs');

const statusPath = '$STATUS_FILE';
const histFile   = '$HISTORY_FILE';

const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
const capturedAt = new Date();  // cron runtime, UTC
const utcDate = capturedAt.toISOString().slice(0, 10);              // YYYY-MM-DD
const utcHHMM = capturedAt.toISOString().slice(11, 16).replace(':', '-');  // HH-MM
const windowKey = utcDate + '_' + utcHHMM;

const codex = status.codex || {};
const claude = status.claude || {};
const bothFailed = (codex.available === false) && (claude.available === false);
const schema = bothFailed ? 'v1-error' : 'v1';

// ── Build snapshot entry per spec §4 ──
const snapshot = {
  _schema: schema,
  windowKey,
  date: utcDate,
  capturedAt: capturedAt.toISOString()
};

if (!bothFailed) {
  snapshot.codex = {
    available: codex.available !== false,
    plan: codex.plan || null,
    primary_5h_pct: codex.primary_5h?.used_percent ?? null,
    secondary_7d_pct: codex.secondary_7d?.used_percent ?? null,
    limit_reached: codex.limit_reached ?? null
  };
  snapshot.claude = {
    available: claude.available !== false,
    subscription: claude.subscription || 'unknown',
    primary_5h_pct: claude.primary_5h?.used_percent ?? null,
    secondary_7d_pct: claude.secondary_7d?.used_percent ?? null,
    active_limits: claude.active_limits || []
  };
} else {
  // spec §4 q3 DECIDED: write entry with _schema: 'v1-error', both blank
  snapshot.codex = { available: false };
  snapshot.claude = { available: false, subscription: 'unknown' };
}

// ── Load existing history ──
let history = { _version: 1, entries: [] };
if (fs.existsSync(histFile)) {
  try { history = JSON.parse(fs.readFileSync(histFile, 'utf8')); }
  catch(e) { console.warn('History parse error, starting fresh'); }
}
if (!Array.isArray(history.entries)) history.entries = [];

// ── Dedup by windowKey: always overwrite if same key (spec §4) ──
const idx = history.entries.findIndex(e => e.windowKey === windowKey);
if (idx >= 0) {
  history.entries[idx] = snapshot;
  console.log('Updated existing window:', windowKey);
} else {
  history.entries.unshift(snapshot);
  console.log('Added new window:', windowKey);
}

// ── Retention: FOREVER (per Zach 2026-06-06, mirror minimax pattern) ──

// ── Sort newest first ──
history.entries.sort((a, b) => b.windowKey.localeCompare(a.windowKey));

// ── Update metadata ──
history._version = 1;
history._updatedAt = capturedAt.toISOString();
history._totalEntries = history.entries.length;
history._retentionPolicy = 'forever';
history._schemasSeen = Array.from(new Set([
  ...(history._schemasSeen || []),
  schema
]));

fs.writeFileSync(histFile, JSON.stringify(history, null, 2));
console.log('✅ usage-history.json updated, total entries:', history.entries.length);
"

echo "📜 Usage history updated → $HISTORY_FILE"