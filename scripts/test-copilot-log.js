#!/usr/bin/env node
/**
 * test-copilot-log.js
 *
 * Integration test for the Copilot Usage Tracker.
 * POSTs sample entries to /api/copilot/log with various models,
 * then verifies GET /api/copilot/analysis returns the data correctly.
 *
 * Run:  node scripts/test-copilot-log.js
 * Note: Requires server.js to be running on http://localhost:18899
 */

const http  = require('http');
const https = require('https');

const BASE = process.env.COPILOT_SERVER_URL || 'http://localhost:18899';
const VERBOSE = process.argv.includes('--verbose');

// ---- HTTP helpers ----

function post(path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const mod = url.protocol === 'https:' ? https : http;
    const data = JSON.stringify(body);
    const req = mod.request({
      hostname: url.hostname, port: url.port,
      path: url.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let b = '';
      res.on('data', c => { b += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch { reject(new Error(`Non-JSON response: ${b.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const mod = url.protocol === 'https:' ? https : http;
    const req = mod.get({ hostname: url.hostname, port: url.port, path: url.pathname, headers: { 'Accept': 'application/json' } }, res => {
      let b = '';
      res.on('data', c => { b += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch { reject(new Error(`Non-JSON response: ${b.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function log(msg, type = 'info') {
  const icons = { ok: '✅', fail: '❌', info: '  ', warn: '⚠️ ' };
  console.log(`${icons[type] || '  '}${msg}`);
}

function assert(condition, msg) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${msg}`);
}

// ---- Tests ----

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runTests() {
  console.log('\n========================================');
  console.log('  Copilot Usage Tracker — Integration Test');
  console.log('========================================\n');
  console.log(`Server: ${BASE}\n`);

  let passed = 0;
  let failed = 0;

  // ---- Test 0: Check server is up ----
  try {
    const res = await get('/api/copilot/quota');
    if (res.status === 200) {
      log('Server is running and responding', 'ok');
    } else {
      log(`Server responded with status ${res.status}`, 'fail');
      failed++;
      process.exit(1);
    }
  } catch (e) {
    log(`Cannot connect to server: ${e.message}`, 'fail');
    log('Start the server with: node server.js', 'info');
    failed++;
    process.exit(1);
  }

  // ---- Test 1: POST /api/copilot/log — claude-sonnet-4 ----
  try {
    const r = await post('/api/copilot/log', {
      model: 'claude-sonnet-4',
      feature: 'chat',
      tokens: 1500,
      latency: 1100,
    });
    assert(r.status === 200 && r.body.success, 'POST /api/copilot/log (claude)');
    assert(r.body.data?.entry?.model === 'claude-sonnet-4', 'model field correct');
    assert(r.body.data?.entry?.premiumCost === 1, 'premium cost = 1 for claude-sonnet-4');
    log('POST /api/copilot/log (claude-sonnet-4) — premiumCost=1', 'ok');
    passed++;
  } catch (e) { log(e.message, 'fail'); failed++; }

  // ---- Test 2: POST /api/copilot/log — gpt-4.1-mini (base model, no cost) ----
  try {
    const r = await post('/api/copilot/log', {
      model: 'gpt-4.1-mini',
      feature: 'chat',
      tokens: 800,
    });
    assert(r.status === 200 && r.body.success, 'POST /api/copilot/log (gpt-base)');
    assert(r.body.data?.entry?.premiumCost === 0, 'premium cost = 0 for gpt-4.1-mini');
    log('POST /api/copilot/log (gpt-4.1-mini) — premiumCost=0 (base model)', 'ok');
    passed++;
  } catch (e) { log(e.message, 'fail'); failed++; }

  // ---- Test 3: POST /api/copilot/log — o4-mini (premium, 0.33 multiplier) ----
  try {
    const r = await post('/api/copilot/log', {
      model: 'o4-mini',
      feature: 'completion',
      tokens: 600,
    });
    assert(r.status === 200 && r.body.success, 'POST /api/copilot/log (o4-mini)');
    assert(r.body.data?.entry?.premiumCost === 0.33, 'premium cost = 0.33 for o4-mini');
    log('POST /api/copilot/log (o4-mini) — premiumCost=0.33', 'ok');
    passed++;
  } catch (e) { log(e.message, 'fail'); failed++; }

  // ---- Test 4: POST /api/copilot/log — gemini-2.5-pro ----
  try {
    const r = await post('/api/copilot/log', {
      model: 'gemini-2.5-pro',
      feature: 'vision',
      tokens: 3000,
    });
    assert(r.status === 200 && r.body.success, 'POST /api/copilot/log (gemini)');
    assert(r.body.data?.entry?.premiumCost === 1, 'premium cost = 1 for gemini-2.5-pro');
    log('POST /api/copilot/log (gemini-2.5-pro) — premiumCost=1', 'ok');
    passed++;
  } catch (e) { log(e.message, 'fail'); failed++; }

  // ---- Test 5: POST /api/copilot/log — claude-opus-4 (×5 multiplier) ----
  try {
    const r = await post('/api/copilot/log', {
      model: 'claude-opus-4',
      feature: 'chat',
      tokens: 5000,
    });
    assert(r.status === 200 && r.body.success, 'POST /api/copilot/log (opus)');
    assert(r.body.data?.entry?.premiumCost === 5, 'premium cost = 5 for claude-opus-4');
    log('POST /api/copilot/log (claude-opus-4) — premiumCost=5', 'ok');
    passed++;
  } catch (e) { log(e.message, 'fail'); failed++; }

  // ---- Test 6: GET /api/copilot/quota ----
  try {
    const r = await get('/api/copilot/quota');
    assert(r.status === 200 && r.body.success, 'GET /api/copilot/quota');
    const q = r.body.data;
    assert(typeof q.total === 'number', 'quota.total is a number');
    assert(typeof q.remaining === 'number', 'quota.remaining is a number');
    assert(typeof q.daysRemaining === 'number', 'quota.daysRemaining is a number');
    assert(['normal','warning','critical','exhausted'].includes(q.warningLevel), 'valid warningLevel');
    assert(q.recommendation?.suggestedModel, 'has recommendation');
    log(`GET /api/copilot/quota — remaining: ${q.remaining}/${q.total}, warning: ${q.warningLevel}`, 'ok');
    passed++;
  } catch (e) { log(e.message, 'fail'); failed++; }

  // ---- Test 7: GET /api/copilot/analysis — verify data is accumulated ----
  try {
    const r = await get('/api/copilot/analysis');
    assert(r.status === 200 && r.body.success, 'GET /api/copilot/analysis');
    const a = r.body.data;

    // We logged 5 entries above; check counts accumulated
    assert(a.summary.total.count >= 5, `total.count >= 5 (got ${a.summary.total.count})`);
    assert(a.summary.total.premiumCost > 0, 'total.premiumCost > 0');

    // Check model distribution contains our models
    const models = Object.keys(a.modelDistribution || {});
    assert(models.includes('claude-sonnet-4'), 'claude-sonnet-4 in distribution');
    assert(models.includes('gpt-4.1-mini'), 'gpt-4.1-mini in distribution');
    assert(models.includes('o4-mini'), 'o4-mini in distribution');
    assert(models.includes('gemini-2.5-pro'), 'gemini-2.5-pro in distribution');

    // Check feature distribution
    const features = Object.keys(a.featureDistribution || {});
    assert(features.includes('chat'), 'feature "chat" logged');
    assert(features.includes('vision'), 'feature "vision" logged');
    assert(features.includes('completion'), 'feature "completion" logged');

    // Check 7-day trend has today's entry
    assert(Array.isArray(a.trend7Days) && a.trend7Days.length === 7, '7-day trend present');
    const today = new Date().toISOString().slice(0, 10);
    const todayEntry = a.trend7Days.find(d => d.date === today);
    assert(todayEntry, `today (${today}) in trend`);
    assert(todayEntry.count >= 5, `today.count >= 5 (got ${todayEntry.count})`);

    log('GET /api/copilot/analysis — all checks passed', 'ok');
    if (VERBOSE) {
      console.log('   Summary:', JSON.stringify(a.summary, null, 2));
      console.log('   Model dist:', JSON.stringify(a.modelDistribution));
    }
    passed++;
  } catch (e) { log(e.message, 'fail'); failed++; }

  // ---- Test 8: GET /api/copilot/models ----
  try {
    const r = await get('/api/copilot/models');
    assert(r.status === 200 && r.body.success, 'GET /api/copilot/models');
    assert(Array.isArray(r.body.data.models), 'models is an array');
    assert(r.body.data.total > 0, 'has model entries');
    const modelNames = r.body.data.models.map(m => m.name);
    assert(modelNames.includes('claude-sonnet-4'), 'claude-sonnet-4 in model list');
    assert(modelNames.includes('gpt-4.1-mini'), 'gpt-4.1-mini in model list');
    log(`GET /api/copilot/models — ${r.body.data.total} models listed`, 'ok');
    passed++;
  } catch (e) { log(e.message, 'fail'); failed++; }

  // ---- Test 9: POST /api/copilot/preference ----
  try {
    const r = await post('/api/copilot/preference', { preference: 'balanced' });
    assert(r.status === 200 && r.body.success, 'POST /api/copilot/preference');
    assert(r.body.data.preference === 'balanced', 'preference saved');
    log('POST /api/copilot/preference (balanced) — ok', 'ok');
    passed++;
  } catch (e) { log(e.message, 'fail'); failed++; }

  // ---- Test 10: Quota update (set total + reset date) ----
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const r = await post('/api/copilot/quota', {
      total: 500,
      used: 0,
      resetDate: futureDate.toISOString().slice(0, 10),
    });
    assert(r.status === 200 && r.success, 'POST /api/copilot/quota (set)');
    const q = await get('/api/copilot/quota');
    assert(q.body.data.total === 500, `total=500 (got ${q.body.data.total})`);
    log('POST /api/copilot/quota (set total=500) — ok', 'ok');
    passed++;
  } catch (e) { log(e.message, 'fail'); failed++; }

  // ---- Summary ----
  console.log('\n========================================');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
