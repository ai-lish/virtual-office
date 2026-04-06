#!/usr/bin/env node
/**
 * csv-to-token-log.js — Merge all data/export_bill_*.csv into public/token-log.json
 * Deduplicates by consumptionTime + consumedApi + consumedModel
 */
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const outFile = path.join(__dirname, '..', 'public', 'token-log.json');

const keyMap = {
  'consumption time(utc)': 'consumptionTime',
  'consumed model': 'consumedModel',
  'consumed api': 'consumedApi',
  'input usage quantity': 'inputUsageQuantity',
  'output usage quantity': 'outputUsageQuantity',
  'total usage quantity': 'totalUsageQuantity',
  'amount spent': 'amountSpent',
  'amount after voucher': 'amountAfterVoucher'
};

function parseCsv(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.match(/(?:"[^"]*"|[^,])+/g)?.map(v => v.trim().replace(/^"|"$/g, '')) || [];
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']));
  }).filter(r => Object.values(r).some(v => v));
}

// Read all CSV files
const csvFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv')).sort();
console.log(`Found ${csvFiles.length} CSV files: ${csvFiles.join(', ')}`);

const allRaw = [];
for (const f of csvFiles) {
  const rows = parseCsv(fs.readFileSync(path.join(dataDir, f), 'utf8'));
  console.log(`  ${f}: ${rows.length} rows`);
  allRaw.push(...rows);
}

// Normalize
const normalized = allRaw.map(r => {
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

// Dedupe by consumptionTime + consumedApi + consumedModel
const seen = new Map();
for (const r of normalized) {
  const key = `${r.consumptionTime}|${r.consumedApi}|${r.consumedModel}`;
  // Keep the one with higher totalUsageQuantity if duplicate
  const existing = seen.get(key);
  if (!existing || r.totalUsageQuantity > existing.totalUsageQuantity) {
    seen.set(key, r);
  }
}
const records = [...seen.values()].sort((a, b) =>
  b.consumptionTime.localeCompare(a.consumptionTime) || a.consumedApi.localeCompare(b.consumedApi)
);

const tokenLog = {
  _generatedAt: new Date().toISOString(),
  _source: 'google-drive-csv',
  meta: { totalRecords: records.length },
  records
};

fs.writeFileSync(outFile, JSON.stringify(tokenLog, null, 2));
console.log(`✅ Written ${records.length} records to public/token-log.json (deduped from ${normalized.length})`);
