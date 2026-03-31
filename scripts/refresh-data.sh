#!/bin/bash
# refresh-data.sh — Fetches latest data from MiniMax API and Google Drive CSVs
# Usage: ./scripts/refresh-data.sh [minimax|copilot|token|all]
# Writes results to public/ JSON files and optionally commits.

set -euo pipefail
cd "$(dirname "$0")/.."
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

ACTION="${1:-all}"

# ── 1. Refresh MiniMax Quota (API) ──
refresh_minimax() {
  echo "⚡ Refreshing MiniMax quota from API..."
  KEY_FILE="$HOME/.minimax-api-key"
  if [ ! -f "$KEY_FILE" ]; then
    echo "❌ No API key at $KEY_FILE"; return 1
  fi
  KEY=$(cat "$KEY_FILE")
  RESPONSE=$(curl -sf 'https://api.minimax.io/v1/api/openplatform/coding_plan/remains' \
    -H "Authorization: Bearer $KEY")
  NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  # Check for errors
  if echo "$RESPONSE" | jq -e '.model_remains' > /dev/null 2>&1; then
    true
  else
    echo "❌ API error: $(echo "$RESPONSE" | jq -r '.base_resp.status_msg // "unknown"')"
    return 1
  fi
  
  # Build JSON using jq
  echo "$RESPONSE" | jq --arg now "$NOW" '{
    _generatedAt: $now,
    _source: "local-refresh",
    raw: .,
    allModels: [.model_remains[] | {
      model: .model_name,
      total: .current_interval_total_count,
      used: .current_interval_usage_count,
      remaining: (.current_interval_total_count - .current_interval_usage_count),
      weeklyTotal: .current_weekly_total_count,
      weeklyUsed: .current_weekly_usage_count
    }]
  }' > public/minimax-api-status.json
  echo "✅ MiniMax quota updated"
}

# ── 2. Refresh Copilot Usage (Google Drive CSV) ──
refresh_copilot() {
  echo "🤖 Refreshing Copilot usage from Google Drive..."
  FOLDER="1TUvOW4xsW7Xa0FQor-pQb2C4F1DxGoQh"
  
  # Find latest premiumRequestUsageReport CSV
  FILE_ID=$(gog drive ls --parent "$FOLDER" --max 5 -j --results-only 2>/dev/null | \
    jq -r '[.[] | select(.name | startswith("premiumRequestUsageReport"))] | sort_by(.modifiedTime) | last | .id')
  
  if [ -z "$FILE_ID" ] || [ "$FILE_ID" = "null" ]; then
    echo "❌ No Copilot CSV found"; return 1
  fi
  
  echo "  Downloading file: $FILE_ID"
  gog drive download "$FILE_ID" --out "$TMPDIR/copilot.csv" --no-input 2>/dev/null
  
  # Parse CSV and generate copilot-data.json
  node -e "
const fs = require('fs');
const csv = fs.readFileSync('$TMPDIR/copilot.csv', 'utf8');
const lines = csv.trim().split('\n');
const headers = lines[0].split(',').map(h => h.trim().replace(/\"/g,''));
const rows = lines.slice(1).map(l => {
  const vals = l.match(/\"[^\"]*\"|[^,]+/g)?.map(v => v.trim().replace(/^\"|\"$/g,'')) || [];
  return Object.fromEntries(headers.map((h,i) => [h, vals[i] || '']));
});

// Sum up premium requests by model using gross_amount (= premium units)
let totalUsed = 0;
const byModel = {};
rows.forEach(r => {
  const model = r.model || 'unknown';
  const cost = parseFloat(r.gross_amount || 0);
  totalUsed += cost;
  byModel[model] = (byModel[model] || 0) + cost;
});

// Round to match quota display (300 premium units)
totalUsed = Math.round(totalUsed * 100) / 100;
const total = 300;
const remaining = Math.round((total - totalUsed) * 100) / 100;
const now = new Date().toISOString();

const data = {
  _generatedAt: now,
  _source: 'google-drive-csv',
  quota: {
    total,
    used: totalUsed,
    remaining,
    usedPercent: Math.round(totalUsed / total * 100),
    resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0,10),
    warningLevel: remaining < 30 ? 'critical' : remaining < 90 ? 'warning' : 'normal'
  },
  analysis: { totalRequests: totalUsed, byModel }
};
fs.writeFileSync('public/copilot-data.json', JSON.stringify(data, null, 2));
console.log('✅ Copilot data updated: used=' + totalUsed + '/' + total);
"
}

# ── 3. Refresh MiniMax Token Usage (Google Drive CSV) ──
refresh_token() {
  echo "📊 Refreshing MiniMax token usage from Google Drive..."
  FOLDER="1k2CbG1Z2lvOLl-szMt8YT5P5NaWD0T5Y"
  
  # Find latest billing CSV
  FILE_ID=$(gog drive ls --parent "$FOLDER" --max 10 -j --results-only 2>/dev/null | \
    jq -r '[.[] | select(.name | test("billing|export_bill"))] | sort_by(.modifiedTime) | last | .id')
  
  if [ -z "$FILE_ID" ] || [ "$FILE_ID" = "null" ]; then
    echo "❌ No MiniMax billing CSV found"; return 1
  fi
  
  echo "  Downloading file: $FILE_ID"
  gog drive download "$FILE_ID" --out "$TMPDIR/token.csv" --no-input 2>/dev/null
  
  # Parse and generate token-log.json + summary
  node -e "
const fs = require('fs');
const csv = fs.readFileSync('$TMPDIR/token.csv', 'utf8');
const lines = csv.trim().split('\n');
const headers = lines[0].split(',').map(h => h.trim().replace(/\"/g,''));
const records = lines.slice(1).map(l => {
  const vals = l.match(/(?:\"[^\"]*\"|[^,])+/g)?.map(v => v.trim().replace(/^\"|\"$/g,'')) || [];
  return Object.fromEntries(headers.map((h,i) => [h, vals[i] || '']));
}).filter(r => Object.values(r).some(v => v));

// Normalize field names (CSV headers have spaces)
const keyMap = {
  'consumption time(utc)': 'consumptionTime', 'consumption time': 'consumptionTime',
  'consumed model': 'consumedModel', 'consumed api': 'consumedApi',
  'input usage quantity': 'inputUsageQuantity', 'output usage quantity': 'outputUsageQuantity',
  'total usage quantity': 'totalUsageQuantity'
};
const normalized = records.map(r => {
  const out = {};
  for (const [k, v] of Object.entries(r)) {
    const mapped = keyMap[k.toLowerCase()] || k;
    out[mapped] = v;
  }
  return {
    consumptionTime: out.consumptionTime || '',
    consumedModel: out.consumedModel || out['Consumed Model'] || '',
    consumedApi: out.consumedApi || out['Consumed API'] || '',
    inputUsageQuantity: parseInt(out.inputUsageQuantity || 0),
    outputUsageQuantity: parseInt(out.outputUsageQuantity || 0),
    totalUsageQuantity: parseInt(out.totalUsageQuantity || 0)
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
const byModel = Object.entries(modelMap).sort((a,b) => b[1]-a[1]).map(([model,tokens]) => ({model,tokens}));
const dates = normalized.map(r => r.consumptionTime).filter(Boolean).sort();

const summary = {
  _generatedAt: new Date().toISOString(),
  totals,
  byModel,
  meta: { dateRange: { start: dates[0]?.slice(0,10) || '', end: dates[dates.length-1]?.slice(0,10) || '' }, records: normalized.length }
};
fs.writeFileSync('public/summary-token-log.json', JSON.stringify(summary, null, 2));
console.log('✅ Token log updated: ' + normalized.length + ' records, ' + totals.totalTokens + ' total tokens');
"
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
echo "🎉 Refresh complete! Run 'cd $(pwd) && git add public/ && git commit -m \"Refresh data\" && git push' to deploy."
