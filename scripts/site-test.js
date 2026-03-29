#!/usr/bin/env node
/**
 * virtual-office Daily Functional Test
 * Comprehensive page-by-page testing
 * Can push results to Google Sheets (when SHEET_WEBAPP_URL is set)
 * 
 * Run daily via: node scripts/site-test.js
 */

const BASE_URL = 'https://ai-lish.github.io/virtual-office';
const SHEET_WEBAPP_URL = process.env.SHEET_WEBAPP_URL || ''; // Set when Google Apps Script is ready
const LOG_FILE = '/Users/zachli/.openclaw/workspace/virtual-office/scripts/site-test.log';
const RESULTS_FILE = '/Users/zachli/.openclaw/workspace/virtual-office/scripts/site-test-results.json';

const PAGES = [
  { url: '/', name: '主頁', checks: ['虛擬辦公室', 'Copilot', 'Token'] },
  { url: '/public/pages/copilot-static.html', name: 'Copilot用量', checks: ['Copilot', '用量'] },
  { url: '/public/pages/token-analysis.html', name: 'Token分析', checks: ['Token', '記錄'] },
  { url: '/public/pages/song-of-songs.html', name: 'SOS歌曲', checks: ['Song', 'Songs', '雅歌'] },
];

const HTTPS = require('https');
const HTTP = require('http');
const FS = require('fs');

function fetch(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? HTTPS : HTTP;
    const req = client.get(url, { timeout: 20000 }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function log(msg) {
  const ts = new Date().toISOString();
  FS.appendFileSync(LOG_FILE, `[${ts}] ${msg}\n`);
  console.log(msg);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function pushToGoogleSheets(data) {
  if (!SHEET_WEBAPP_URL) {
    log('SHEET_WEBAPP_URL not set — skipping Google Sheets push');
    return;
  }
  
  const payload = JSON.stringify({
    type: 'daily-test',
    timestamp: data.timestamp,
    allOk: data.allOk,
    passCount: data.passCount,
    totalCount: data.totalCount,
    duration: data.duration,
    results: data.results
  });
  
  try {
    const { hostname, pathname } = new URL(SHEET_WEBAPP_URL);
    const options = {
      hostname, path: pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    };
    const req = HTTPS.request(options, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode === 200) log('Google Sheets: OK');
        else log(`Google Sheets: HTTP ${res.statusCode}`);
      });
    });
    req.on('error', e => log('Google Sheets error: ' + e.message));
    req.write(payload);
    req.end();
  } catch (e) {
    log('Google Sheets push failed: ' + e.message);
  }
}

async function runTests() {
  log('=== Daily Site Test Starting ===');
  const results = [];
  const start = Date.now();
  
  for (const page of PAGES) {
    const url = BASE_URL + page.url;
    let ok = false, status = 0, error = null;
    try {
      const res = await fetch(url);
      status = res.status;
      if (res.status === 200) {
        const missing = page.checks.filter(c => !res.body.includes(c));
        ok = missing.length === 0;
        if (missing.length) error = 'Missing: ' + missing.join(', ');
      } else {
        error = 'HTTP ' + res.status;
      }
    } catch (e) {
      error = e.message;
    }
    results.push({ page: page.name, url, ok, status, error });
    log(`  ${ok ? '✅' : '❌'} ${page.name}: HTTP ${status}${error ? ' — ' + error : ''}`);
    await sleep(800);
  }
  
  const duration = ((Date.now() - start) / 1000).toFixed(1);
  const allOk = results.every(r => r.ok);
  const passCount = results.filter(r => r.ok).length;
  
  const report = {
    timestamp: new Date().toISOString(),
    duration: parseFloat(duration),
    allOk,
    passCount,
    totalCount: results.length,
    results
  };
  
  log(`=== ${allOk ? '✅ ALL PASS' : '❌ FAILURES'} — ${passCount}/${results.length} pages OK in ${duration}s ===`);
  
  // Save to local results file
  let logs = [];
  try { logs = JSON.parse(FS.readFileSync(RESULTS_FILE, 'utf8')); } catch(e) {}
  logs.push(report);
  if (logs.length > 100) logs = logs.slice(-100);
  FS.writeFileSync(RESULTS_FILE, JSON.stringify(logs, null, 2));
  log(`Results saved to ${RESULTS_FILE}`);
  
  // Push to Google Sheets (if configured)
  await pushToGoogleSheets(report);
  
  return report;
}

runTests().catch(e => { log('FATAL: ' + e.message); process.exit(1); });
