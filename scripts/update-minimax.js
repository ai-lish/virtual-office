#!/usr/bin/env node
/**
 * MiniMax API Quota Updater
 * 
 * Fetches current quota from MiniMax API and writes to public/minimax-status.json.
 * Designed to run via cron at: 03:00, 07:00, 12:00, 17:00, 22:00
 * 
 * API key is read from ~/.minimax-api-key (never committed to repo).
 * 
 * Usage:
 *   node scripts/update-minimax.js              # fetch + write JSON
 *   node scripts/update-minimax.js --commit     # also git commit + push
 *   node scripts/update-minimax.js --dry-run    # print only, no write
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_DIR = path.resolve(__dirname, '..');
const STATUS_FILE = path.join(BASE_DIR, 'public', 'minimax-status.json');
const KEY_FILE = path.join(process.env.HOME || '/Users/zachli', '.minimax-api-key');
const API_URL = 'https://www.minimax.io/v1/api/openplatform/coding_plan/remains';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const DO_COMMIT = args.includes('--commit');

function readApiKey() {
  if (!fs.existsSync(KEY_FILE)) {
    console.error(`[MiniMax] ❌ API key file not found: ${KEY_FILE}`);
    console.error(`[MiniMax] Create it: echo "YOUR_KEY" > ~/.minimax-api-key && chmod 600 ~/.minimax-api-key`);
    process.exit(1);
  }
  const key = fs.readFileSync(KEY_FILE, 'utf8').trim();
  if (!key) {
    console.error(`[MiniMax] ❌ API key file is empty`);
    process.exit(1);
  }
  return key;
}

async function fetchQuota(apiKey) {
  const res = await fetch(API_URL, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`MiniMax API returned HTTP ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

function buildStatus(raw) {
  // Normalize whatever MiniMax returns into a clean public structure.
  // The API may return { remains, used, total, resetDate } or nested data.
  const data = raw.data || raw;

  return {
    remains: data.remains ?? data.remaining ?? null,
    used: data.used ?? null,
    total: data.total ?? null,
    resetDate: data.resetDate ?? data.reset_date ?? null,
    updatedAt: new Date().toISOString(),
    provider: 'minimax',
  };
}

async function main() {
  console.log(`[MiniMax] Fetching quota at ${new Date().toISOString()}`);

  const apiKey = readApiKey();
  const raw = await fetchQuota(apiKey);
  const status = buildStatus(raw);

  console.log(`[MiniMax] Quota: ${status.used ?? '?'} / ${status.total ?? '?'} (remains: ${status.remains ?? '?'})`);

  if (DRY_RUN) {
    console.log('[MiniMax] --dry-run, not writing.');
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  // Ensure public/ exists
  const pubDir = path.dirname(STATUS_FILE);
  if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });

  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
  console.log(`[MiniMax] ✅ Written to ${STATUS_FILE}`);

  if (DO_COMMIT) {
    try {
      execSync(`cd "${BASE_DIR}" && git add public/minimax-status.json && git commit -m "chore: update minimax quota [auto]" && git push`, {
        stdio: 'inherit',
        timeout: 30000,
      });
      console.log('[MiniMax] ✅ Committed and pushed');
    } catch (e) {
      console.error('[MiniMax] ⚠️  Git commit/push failed:', e.message);
    }
  }
}

main().catch(err => {
  console.error('[MiniMax] ❌ Error:', err.message);
  process.exit(1);
});
