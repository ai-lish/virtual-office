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
SHEET_ID="19GFRnbjUlI7UnTngMWzqeoDD9g0lRs0OAO8iwieGJkA"

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
  NOW=$(date -u +"%Y-%m-%d %H:%M UTC")
  
  if ! echo "$RESPONSE" | jq -e '.model_remains' > /dev/null 2>&1; then
    echo "❌ API error: $(echo "$RESPONSE" | jq -r '.base_resp.status_msg // "unknown"')"
    return 1
  fi
  
  # Build JSON
  echo "$RESPONSE" | jq --arg now "$NOW" '{
    _generatedAt: $now,
    _source: "local-refresh",
    raw: .,
    allModels: [.model_remains[] | {
      model: .model_name,
      total: .current_interval_total_count,
      used: .current_interval_usage_count,
      remaining: .current_interval_usage_count,
      used: (.current_interval_total_count - .current_interval_usage_count),
      weeklyTotal: .current_weekly_total_count,
      weeklyUsed: .current_weekly_usage_count
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
}

# ── 2. Refresh Copilot Usage (Google Drive CSV → Sheet + JSON) ──
refresh_copilot() {
  echo "🤖 Refreshing Copilot usage from Google Drive..."
  FOLDER="1TUvOW4xsW7Xa0FQor-pQb2C4F1DxGoQh"
  
  FILE_ID=$(gog drive ls --parent "$FOLDER" --max 5 -j --results-only 2>/dev/null | \
    jq -r '[.[] | select(.name | startswith("premiumRequestUsageReport"))] | sort_by(.modifiedTime) | last | .id')
  
  if [ -z "$FILE_ID" ] || [ "$FILE_ID" = "null" ]; then
    echo "❌ No Copilot CSV found"; return 1
  fi
  
  echo "  Downloading: $FILE_ID"
  gog drive download "$FILE_ID" --out "$TMPDIR/copilot.csv" --no-input 2>/dev/null
  
  node -e "
const fs = require('fs');
const csv = fs.readFileSync('$TMPDIR/copilot.csv', 'utf8');
const lines = csv.trim().split('\n');
const headers = lines[0].split(',').map(h => h.trim().replace(/\"/g,''));
const rows = lines.slice(1).map(l => {
  const vals = l.match(/\"[^\"]*\"|[^,]+/g)?.map(v => v.trim().replace(/^\"|\"$/g,'')) || [];
  return Object.fromEntries(headers.map((h,i) => [h, vals[i] || '']));
});

let totalUsed = 0;
const byModel = {};
rows.forEach(r => {
  const model = r.model || 'unknown';
  const cost = parseFloat(r.gross_amount || 0);
  totalUsed += cost;
  byModel[model] = (byModel[model] || 0) + cost;
});

totalUsed = Math.round(totalUsed * 100) / 100;
const total = 300;
const remaining = Math.round((total - totalUsed) * 100) / 100;
const now = new Date().toISOString();

const data = {
  _generatedAt: now,
  _source: 'google-drive-csv',
  quota: {
    total, used: totalUsed, remaining,
    usedPercent: Math.round(totalUsed / total * 100),
    resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0,10),
    warningLevel: remaining < 30 ? 'critical' : remaining < 90 ? 'warning' : 'normal'
  },
  analysis: { totalRequests: totalUsed, byModel }
};
fs.writeFileSync('public/copilot-data.json', JSON.stringify(data, null, 2));
console.log('used=' + totalUsed + '/' + total);
"
  
  echo "✅ Copilot usage updated → JSON"
}

# ── 3. Refresh MiniMax Token Usage (Google Drive CSV → Sheet + JSON) ──
refresh_token() {
  echo "📊 Refreshing Minimax token usage from Google Drive..."
  FOLDER="1k2CbG1Z2lvOLl-szMt8YT5P5NaWD0T5Y"
  
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
const byModel = Object.entries(modelMap).sort((a,b) => b[1]-a[1]).map(([model,tokens]) => ({model,tokens}));
const dates = normalized.map(r => r.consumptionTime).filter(Boolean).sort();

const summary = {
  _generatedAt: new Date().toISOString(),
  totals,
  byModel,
  meta: { dateRange: { start: dates[0]?.slice(0,10) || '', end: dates[dates.length-1]?.slice(0,10) || '' }, records: normalized.length }
};
fs.writeFileSync('public/summary-token-log.json', JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ records: normalized.length, totals }));
"
  
  echo "✅ Minimax tokens updated → JSON"
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
