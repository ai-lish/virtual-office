#!/bin/bash
# refresh-data.sh — Fetches latest data from MiniMax API and Google Drive CSVs
# Usage: ./scripts/refresh-data.sh [minimax|copilot|token|all]
# Writes results to:
#   1. Google Sheet (MiniMax GithubCopilot Data) - via Node.js
#   2. public/*.json (for website)

set -euo pipefail
cd "$(dirname "$0")/.."
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

ACTION="${1:-all}"
SET_TIMESTAMP="${2:-}"  # V2 (Planning §3.4.3): unified cron passes ISO UTC
                        # timestamp so all JSON files share the same capturedAt.
SHEET_ID="19GFRnbjUlI7UnTngMWzqeoDD9g0lRs0OAO8iwieGJkA"

# V2 (Planning §3.5): hardcoded plan defaults — mirrors KNOWN_PLANS in fetch-usage.py.
KNOWN_PLAN_MINIMAX="plus"
KNOWN_PLAN_COPILOT="pro"

# ── 1. Refresh MiniMax Quota (API → Sheet + JSON) ──
refresh_minimax() {
  echo "⚡ Refreshing MiniMax quota from API..."
  KEY_FILE="$HOME/.minimax-api-key"
  if [ ! -f "$KEY_FILE" ]; then
    echo "❌ No API key at $KEY_FILE"; return 1
  fi
  KEY=$(cat "$KEY_FILE")
  RESPONSE=$(curl -sf 'https://api.minimax.io/v1/api/openplatform/coding_plan/remains' \
    -H "Authorization: Bearer $KEY")
  NOW="${SET_TIMESTAMP:-$(date -u +"%Y-%m-%dT%H:%M:00Z")}"

  if ! echo "$RESPONSE" | jq -e '.model_remains' > /dev/null 2>&1; then
    echo "❌ API error: $(echo "$RESPONSE" | jq -r '.base_resp.status_msg // "unknown"')"
    return 1
  fi

  # Build JSON
  # V2 (Planning §3.6.1): filter out 'video' model — no longer tracked.
  # V2 (Planning §3.5): include 'plan' field for homepage badge.
  echo "$RESPONSE" | jq --arg now "$NOW" --arg plan "$KNOWN_PLAN_MINIMAX" '{
    _generatedAt: $now,
    _source: "local-refresh",
    plan: $plan,
    raw: .,
    allModels: [.model_remains[] | select(.model_name != "video") | {
      model: .model_name,
      total: .current_interval_total_count,
      remaining: .current_interval_usage_count,
      used: (.current_interval_total_count - .current_interval_usage_count),
      weeklyTotal: .current_weekly_total_count,
      weeklyUsed: .current_weekly_usage_count,
      remainingPct: .current_interval_remaining_percent,
      weeklyRemainingPct: .current_weekly_remaining_percent,
      intervalStatus: .current_interval_status,
      weeklyStatus: .current_weekly_status,
      resetTime: .end_time,
      remainsMs: .remains_time
    }]
  }' > public/minimax-api-status.json
  
  # Write to Google Sheet via Node.js
  node -e "
const { execSync } = require('child_process');
const fs = require('fs');

const data = JSON.parse(execSync('curl -sf https://api.minimax.io/v1/api/openplatform/coding_plan/remains -H \"Authorization: Bearer $KEY\"').toString());
const now = '$NOW';

// Header row
const header = ['API回應時間','模型','剩餘prompts','已用prompts','interval開始','interval結束','interval剩餘ms','interval剩餘小時','每週配額','每週已用','每週開始','每週結束'];

// Data rows
const rows = data.model_remains.map(m => {
  const total = m.current_interval_total_count;
  const used = m.current_interval_usage_count;
  const remaining = total - used;
  const intervalMs = m.end_time - m.start_time;
  const intervalHrs = (intervalMs / 3600000).toFixed(2);
  const fmtTime = (ts) => ts ? new Date(ts).toISOString().replace('T',' ').slice(0,16) + ' UTC' : '';
  return [now, m.model_name, remaining, used, fmtTime(m.start_time), fmtTime(m.end_time), intervalMs, intervalHrs, m.current_weekly_total_count, m.current_weekly_usage_count, fmtTime(m.weekly_start_time), fmtTime(m.weekly_end_time)];
});

// Write as TSV to temp file
const tsv = [header, ...rows].map(r => r.join('\t')).join('\n');
fs.writeFileSync('$TMPDIR/quota.tsv', tsv);
console.log('TSV written, rows:', rows.length);
"
  
  # Update Google Sheet using gog sheets update with TSV
  gog sheets update "$SHEET_ID" "MiniMax QUOTA!A1" "$(cat "$TMPDIR/quota.tsv")" 2>&1 || true
  
  # Clear remaining rows
  ROWS=$(echo "$RESPONSE" | jq '.model_remains | length')
  NEXT_ROW=$((ROWS + 2))
  gog sheets clear "$SHEET_ID" "MiniMax QUOTA!A${NEXT_ROW}:L100" 2>/dev/null || true
  
  echo "✅ MiniMax quota updated → Google Sheet + JSON"

  # Update quota history (dedup by date+window)
  bash "$(dirname "$0")/update-quota-history.sh" || echo "⚠️  History update failed (non-fatal)"
}

# ── 2. Refresh Copilot Usage (Google Drive CSV → Sheet + JSON) ──
refresh_copilot() {
  echo "🤖 Refreshing Copilot usage from Google Drive..."
  FOLDER="1TUvOW4xsW7Xa0FQor-pQb2C4F1DxGoQh"
  NOW="${SET_TIMESTAMP:-$(date -u +"%Y-%m-%dT%H:%M:00Z")}"  # V2: synced with minimax

  # GitHub renamed premiumRequestUsageReport → AIUsageReport in mid-2026.
  # Download BOTH the latest of each pattern to capture all months.
  PREMIUM_ID=$(gog drive ls --parent "$FOLDER" --max 10 -j --results-only 2>/dev/null | \
    jq -r '[.[] | select(.name | startswith("premiumRequestUsageReport"))] | sort_by(.modifiedTime) | last | .id // empty')
  AI_ID=$(gog drive ls --parent "$FOLDER" --max 10 -j --results-only 2>/dev/null | \
    jq -r '[.[] | select(.name | startswith("AIUsageReport"))] | sort_by(.modifiedTime) | last | .id // empty')

  if [ -z "$PREMIUM_ID" ] && [ -z "$AI_ID" ]; then
    echo "❌ No Copilot CSV found"; return 1
  fi

  if [ -n "$PREMIUM_ID" ]; then
    echo "  Downloading premiumRequestUsageReport: $PREMIUM_ID"
    gog drive download "$PREMIUM_ID" --out "$TMPDIR/copilot-premium.csv" --no-input 2>/dev/null
  fi
  if [ -n "$AI_ID" ]; then
    echo "  Downloading AIUsageReport: $AI_ID"
    gog drive download "$AI_ID" --out "$TMPDIR/copilot-ai.csv" --no-input 2>/dev/null
  fi

  # Export timestamp + plan env vars so the embedded node script can read them
  # (used by the JSON writer to set _generatedAt and subscription fields).
  export SET_TIMESTAMP="$NOW"
  export KNOWN_PLAN_COPILOT="$KNOWN_PLAN_COPILOT"

  node -e "
const fs = require('fs');
const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseCsv(csvText) {
  // Strip UTF-8 BOM if present
  const cleaned = csvText.replace(/^\\uFEFF/, '');
  const lines = cleaned.trim().split('\\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/\"/g,''));
  return lines.slice(1).map(l => {
    const vals = l.match(/\"[^\"]*\"|[^,]+/g)?.map(v => v.trim().replace(/^\"|\"$/g,'')) || [];
    return Object.fromEntries(headers.map((h,i) => [h, vals[i] || '']));
  });
}

async function main() {
  // 1. Historical base = local copilot-summary.json (preserves all prior months)
  let baseRecords = [];
  try {
    const existing = JSON.parse(fs.readFileSync('public/copilot-summary.json', 'utf8'));
    if (Array.isArray(existing.records)) {
      baseRecords = existing.records;
      console.log('Loaded ' + baseRecords.length + ' records from local copilot-summary.json');
    }
  } catch(e) {
    console.log('No existing summary found, starting fresh');
  }

  // 2. Merge in all available Drive CSVs (both legacy premiumRequestUsageReport + new AIUsageReport)
  const driveFiles = ['copilot-premium.csv', 'copilot-ai.csv']
    .filter(f => fs.existsSync('$TMPDIR/' + f));
  const driveRows = [];
  for (const f of driveFiles) {
    const text = fs.readFileSync('$TMPDIR/' + f, 'utf8');
    const rows = parseCsv(text);
    console.log('Parsed ' + rows.length + ' rows from ' + f);
    driveRows.push(...rows);
  }

  // 3. Convert drive rows to canonical record format
  const driveRecords = driveRows.map(r => ({
    date: r.date,
    model: r.model,
    quantity: parseInt(r.quantity || 0),
    gross_amount: parseFloat(r.gross_amount || 0),
    sku: r.sku,
    unit_type: r.unit_type
  }));

  // 4. Merge + dedupe by (date, model, sku) — base wins
  const seen = new Set(baseRecords.map(r => r.date + '|' + r.model + '|' + r.sku));
  let added = 0;
  for (const r of driveRecords) {
    const k = r.date + '|' + r.model + '|' + r.sku;
    if (!seen.has(k)) { baseRecords.push(r); seen.add(k); added++; }
  }
  console.log('Added ' + added + ' new records from Drive (' + (driveRecords.length - added) + ' dupes skipped)');

  const allRows = baseRecords;
  const now = new Date();

  // 5. Group by month
  const monthSet = {};
  allRows.forEach(r => { if (r.date) { const m = r.date.slice(0,7); monthSet[m] = true; } });
  const months = Object.keys(monthSet).sort();

  const allRecords = allRows.map(r => ({
    date: r.date,
    model: r.model,
    quantity: parseInt(r.quantity || 0),
    gross_amount: parseFloat(r.gross_amount || 0),
    sku: r.sku,
    unit_type: r.unit_type
  }));

  const fullSummary = {
    _generatedAt: process.env.SET_TIMESTAMP || now.toISOString(),
    _source: 'local-summary + google-drive-csv',
    subscription: process.env.KNOWN_PLAN_COPILOT || 'pro',
    months,
    records: allRecords,
    analysis: {
      byMonth: {},
      byModel: {}
    }
  };

  months.forEach(m => {
    const monthRows = allRows.filter(r => r.date?.startsWith(m));
    let mTotal = 0;
    const mModels = {};
    monthRows.forEach(r => {
      const qty = parseInt(r.quantity || 0);
      mTotal += qty;
      mModels[r.model] = (mModels[r.model] || 0) + qty;
    });
    fullSummary.analysis.byMonth[m] = { total: mTotal, byModel: mModels };
  });

  allRows.forEach(r => {
    const qty = parseInt(r.quantity || 0);
    fullSummary.analysis.byModel[r.model] = (fullSummary.analysis.byModel[r.model] || 0) + qty;
  });

  fs.writeFileSync('public/copilot-summary.json', JSON.stringify(fullSummary, null, 2));
  console.log('months: ' + months.join(', '));
  console.log('total records: ' + allRecords.length);
}

main().catch(e => console.error('Error:', e));
"
  
  echo "✅ Copilot usage updated → copilot-summary.json"
}

# ── 3. Refresh MiniMax Token Usage (Google Drive CSV → Sheet + JSON) ──
refresh_token() {
  echo "📊 Refreshing Minimax token usage from Google Drive..."
  FOLDER="1k2CbG1Z2lvOLl-szMt8YT5P5NaWD0T5Y"

  # Also regenerate token-log.json from local data/*.csv (merge + dedupe)
  if ls data/export_bill_*.csv 1>/dev/null 2>&1; then
    echo "  Converting local CSVs → token-log.json..."
    node scripts/csv-to-token-log.js
  fi
  
  FILE_ID=$(gog drive ls --parent "$FOLDER" --max 10 -j --results-only 2>/dev/null | \
    jq -r '[.[] | select(.name | test("billing|export_bill"))] | sort_by(.modifiedTime) | last | .id')
  
  if [ -z "$FILE_ID" ] || [ "$FILE_ID" = "null" ]; then
    echo "❌ No MiniMax billing CSV found"; return 1
  fi
  
  echo "  Downloading: $FILE_ID"
  gog drive download "$FILE_ID" --out "$TMPDIR/token.csv" --no-input 2>/dev/null
  
  node -e "
const fs = require('fs');
const csv = fs.readFileSync('$TMPDIR/token.csv', 'utf8');
const lines = csv.trim().split('\n');
const headers = lines[0].split(',').map(h => h.trim().replace(/\"/g,''));
const records = lines.slice(1).map(l => {
  const vals = l.match(/(?:\"[^\"]*\"|[^,])+/g)?.map(v => v.trim().replace(/^\"|\"$/g,'')) || [];
  return Object.fromEntries(headers.map((h,i) => [h, vals[i] || '']));
}).filter(r => Object.values(r).some(v => v));

const keyMap = {
  'consumption time(utc)': 'consumptionTime', 'consumption time': 'consumptionTime',
  'consumed model': 'consumedModel', 'consumed api': 'consumedApi',
  'input usage quantity': 'inputUsageQuantity', 'output usage quantity': 'outputUsageQuantity',
  'total usage quantity': 'totalUsageQuantity', 'amount spent': 'amountSpent',
  'amount after voucher': 'amountAfterVoucher'
};
const normalized = records.map(r => {
  const out = {};
  for (const [k, v] of Object.entries(r)) {
    const mapped = keyMap[k.toLowerCase()] || k;
    out[mapped] = v;
  }
  return {
    consumptionTime: out.consumptionTime || '',
    consumedModel: out.consumedModel || '',
    consumedApi: out.consumedApi || '',
    inputUsageQuantity: parseInt(out.inputUsageQuantity || 0),
    outputUsageQuantity: parseInt(out.outputUsageQuantity || 0),
    totalUsageQuantity: parseInt(out.totalUsageQuantity || 0),
    amountSpent: parseFloat(out.amountSpent || 0),
    amountAfterVoucher: parseFloat(out.amountAfterVoucher || 0)
  };
}).filter(r => r.totalUsageQuantity > 0);

// Token log
const tokenLog = {
  _generatedAt: new Date().toISOString(),
  _source: 'google-drive-csv',
  meta: { totalRecords: normalized.length },
  records: normalized
};
fs.writeFileSync('public/token-log.json', JSON.stringify(tokenLog, null, 2));

// Summary
const totals = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
const modelMap = {};
normalized.forEach(r => {
  totals.inputTokens += r.inputUsageQuantity;
  totals.outputTokens += r.outputUsageQuantity;
  totals.totalTokens += r.totalUsageQuantity;
  const m = r.consumedModel || 'unknown';
  modelMap[m] = (modelMap[m] || 0) + r.totalUsageQuantity;
});
// Summary recompute moved to after csv-to-token-log.js merge (covers all months, not just Drive CSV)
console.log(JSON.stringify({ records: normalized.length, totals }));
"
  
  echo "✅ Minimax tokens updated → JSON (Drive CSV)"
  # Merge Drive CSV into local data/ and re-run local conversion
  if [ -f "$TMPDIR/token.csv" ]; then
    DRIVE_NAME="export_bill_drive_latest.csv"
    cp "$TMPDIR/token.csv" "data/$DRIVE_NAME"
    echo "  Re-merging all local CSVs after Drive download..."
    node scripts/csv-to-token-log.js

    # Recompute summary from MERGED token-log.json (covers ALL months in data/, not just Drive CSV)
    echo "  Recomputing summary from merged records..."
    node -e "
const fs = require('fs');
const mergedLog = JSON.parse(fs.readFileSync('public/token-log.json', 'utf8'));
const records = mergedLog.records;

const totals = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
const modelMap = {};
records.forEach(r => {
  totals.inputTokens += r.inputUsageQuantity;
  totals.outputTokens += r.outputUsageQuantity;
  totals.totalTokens += r.totalUsageQuantity;
  const m = r.consumedModel || 'unknown';
  modelMap[m] = (modelMap[m] || 0) + r.totalUsageQuantity;
});
const byModel = Object.entries(modelMap).sort((a,b) => b[1]-a[1]).map(([model,tokens]) => ({model,tokens}));
const dates = records.map(r => r.consumptionTime).filter(Boolean).sort();

const summary = {
  _generatedAt: new Date().toISOString(),
  totals,
  byModel,
  meta: { dateRange: { start: dates[0]?.slice(0,10) || '', end: dates[dates.length-1]?.slice(0,10) || '' }, records: records.length }
};
fs.writeFileSync('public/summary-token-log.json', JSON.stringify(summary, null, 2));
console.log('  Summary: ' + records.length + ' records, ' + totals.totalTokens + ' tokens, ' + summary.meta.dateRange.start + ' ~ ' + summary.meta.dateRange.end);
"
  fi
}

# ── Run ──
case "$ACTION" in
  minimax) refresh_minimax ;;
  copilot) refresh_copilot ;;
  token)   refresh_token ;;
  all)     refresh_minimax; refresh_copilot; refresh_token ;;
  *) echo "Usage: $0 [minimax|copilot|token|all]"; exit 1 ;;
esac

echo ""
echo "🎉 Refresh complete!"
echo "📤 Run 'git add public/ && git commit -m \"Refresh data\" && git push' to deploy."
