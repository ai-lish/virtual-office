#!/usr/bin/env node
/**
 * update-usage-sheet.js — Write Codex row → "Codex QUOTA" + Claude row → "Claude QUOTA"
 *
 * Spec §5: 12-col schema (Provider, Plan, Primary5h_UsedPct, ...).
 * Layout per sheet:
 *   A1: header row
 *   A2: single data row
 *   A4:L100: cleared on every run
 *
 * Auth: reuses gog CLI (which uses the gogcli keyring OAuth). Per spec §5
 * "Do not introduce new Google auth — reuse the existing service account".
 *
 * Failure handling per spec §8: if gog fails, log and skip (do not fail
 * the whole cron). JSON + history are canonical; sheet can be backfilled.
 *
 * Sheet creation is a separate one-time setup step — see
 * setup-usage-sheets.sh. This script assumes the two sheets already exist.
 *
 * Usage:
 *   node scripts/update-usage-sheet.js           # write both sheets
 *   node scripts/update-usage-sheet.js --dry-run # print TSV only, no gog call
 *   node scripts/update-usage-sheet.js --provider codex   # only update Codex
 *   node scripts/update-usage-sheet.js --provider claude  # only update Claude
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BASE_DIR = path.resolve(__dirname, '..');
const STATUS_FILE = path.join(BASE_DIR, 'public', 'usage-quota.json');
const SHEET_ID = '19GFRnbjUlI7UnTngMWzqeoDD9g0lRs0OAO8iwieGJkA'; // MiniMax GithubCopilot Data

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const provIdx = args.indexOf('--provider');
const ONLY_PROVIDER = provIdx >= 0 ? args[provIdx + 1] : null; // 'codex' | 'claude' | null

const HEADER = [
  'Provider',
  'Plan',
  'Primary5h_UsedPct',
  'Primary5h_Reset',
  'Secondary7d_UsedPct',
  'Secondary7d_Reset',
  'ActiveLimits',
  'Status',
  'Source',
  'CapturedAt',
  '_schema',
  '_version'
];

function statusFor(pct, available, limitReached) {
  if (!available) return 'UNAVAILABLE';
  if (limitReached) return 'DEPLETED';
  if (pct == null) return 'UNKNOWN';
  if (pct >= 95) return 'DEPLETED';
  if (pct >= 70) return 'WARN';
  return 'OK';
}

function fmtLimits(limits) {
  if (!Array.isArray(limits) || limits.length === 0) return '—';
  return limits.map(l => `${l.kind} ${l.percent}%`).join(', ');
}

function buildRow(provider, quota, schema) {
  const p5 = quota.primary_5h || {};
  const s7 = quota.secondary_7d || {};
  const primaryPct = p5.used_percent;
  const status = statusFor(
    Math.max(primaryPct ?? 0, s7.used_percent ?? 0),
    quota.available !== false,
    quota.limit_reached === true
  );
  const reset5 = p5.reset_at_hkt || '—';
  const reset7 = s7.reset_at_hkt || '—';
  // CapturedAt HKT: take _generatedAt (UTC) and convert to HKT YYYY-MM-DD HH:MM
  const capturedHkt = formatHkt(quota._generatedAt || new Date().toISOString());
  return [
    provider,
    quota.plan || quota.subscription || 'unknown',
    primaryPct != null ? String(primaryPct) : '—',
    reset5,
    s7.used_percent != null ? String(s7.used_percent) : '—',
    reset7,
    fmtLimits(quota.active_limits),
    status,
    'fetch-usage.py',
    capturedHkt,
    schema,
    '1'
  ];
}

function formatHkt(iso) {
  try {
    const d = new Date(iso);
    // HKT = UTC+8
    const hkt = new Date(d.getTime() + 8 * 3600 * 1000);
    const yyyy = hkt.getUTCFullYear();
    const mm = String(hkt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(hkt.getUTCDate()).padStart(2, '0');
    const hh = String(hkt.getUTCHours()).padStart(2, '0');
    const mi = String(hkt.getUTCMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi} HKT`;
  } catch {
    return iso;
  }
}

function toTsv(rows) {
  return rows.map(r => r.join('\t')).join('\n');
}

function gogSheetsUpdate(sheetName, tsv, clearRange) {
  if (DRY_RUN) {
    console.log(`[dry-run] would write ${sheetName}!A1:`);
    console.log(tsv);
    if (clearRange) console.log(`[dry-run] would clear ${sheetName}!${clearRange}`);
    return;
  }
  try {
    execFileSync(
      'gog', ['sheets', 'update', SHEET_ID, `${sheetName}!A1`, tsv],
      { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 }
    );
    console.log(`✅ ${sheetName} updated`);
  } catch (e) {
    const stderr = (e.stderr || Buffer.from('')).toString().slice(0, 300);
    const stdout = (e.stdout || Buffer.from('')).toString().slice(0, 300);
    throw new Error(`gog update ${sheetName} failed: ${stderr || stdout || e.message}`);
  }
  if (clearRange) {
    try {
      execFileSync(
        'gog', ['sheets', 'clear', SHEET_ID, `${sheetName}!${clearRange}`],
        { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 }
      );
      console.log(`✅ ${sheetName} cleared ${clearRange}`);
    } catch (e) {
      const stderr = (e.stderr || Buffer.from('')).toString().slice(0, 200);
      console.warn(`⚠️  ${sheetName} clear ${clearRange} failed: ${stderr || e.message}`);
    }
  }
}

function updateOne(provider, sheetName, quota) {
  const schema = quota.available === false ? 'v1-error' : 'v1';
  const row = buildRow(provider, quota, schema);
  const tsv = toTsv([HEADER, row]);
  gogSheetsUpdate(sheetName, tsv, 'A4:L100');
}

function main() {
  if (!fs.existsSync(STATUS_FILE)) {
    console.error(`[sheet] ❌ ${STATUS_FILE} not found, skipping`);
    process.exit(0);
  }
  const status = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
  const schema = (status.codex?.available === false && status.claude?.available === false)
    ? 'v1-error' : 'v1';
  console.log(`[sheet] schema=${schema}, _generatedAt=${status._generatedAt}`);

  const targets = [];
  if (!ONLY_PROVIDER || ONLY_PROVIDER === 'codex') {
    targets.push(['codex', 'Codex QUOTA', status.codex || {}]);
  }
  if (!ONLY_PROVIDER || ONLY_PROVIDER === 'claude') {
    targets.push(['claude', 'Claude QUOTA', status.claude || {}]);
  }

  let failed = 0;
  for (const [prov, sheet, quota] of targets) {
    try {
      updateOne(prov, sheet, quota);
    } catch (e) {
      console.error(`[sheet] ❌ ${prov}: ${e.message}`);
      console.error(`[sheet] Continuing (spec §8: sheet failure is non-fatal)`);
      failed += 1;
    }
  }
  if (failed > 0) {
    console.warn(`[sheet] ${failed} sheet(s) failed; cron should not fail on this`);
  }
}

main();