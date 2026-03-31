#!/usr/bin/env node
/**
 * test-copilot-tracker.js
 *
 * Unit tests for the Quota and Token Monitoring System (CopilotUsageTracker).
 * No server required — tests the module directly using a temporary database.
 *
 * Run: node test-copilot-tracker.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ── Test helpers ──────────────────────────────────────────────────────────────

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (err) {
    console.error(`❌ ${name}: ${err.message}`);
    return false;
  }
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg ? msg + ' — ' : ''}expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(value, msg = '') {
  if (!value) throw new Error(`${msg ? msg + ' — ' : ''}expected truthy, got ${JSON.stringify(value)}`);
}

function assertBetween(value, lo, hi, msg = '') {
  if (value < lo || value > hi) {
    throw new Error(`${msg ? msg + ' — ' : ''}expected value between ${lo} and ${hi}, got ${value}`);
  }
}

// ── Isolated tracker factory ──────────────────────────────────────────────────
// Creates a CopilotUsageTracker pointed at a temporary file so tests do not
// touch the real copilot-usage-db.json / copilot-api-keys.json.

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-test-'));

function makeTracker() {
  const {
    CopilotUsageTracker,
    DEFAULT_DB,
    DEFAULT_API_KEYS_DB,
  } = require('./copilot-usage-api');

  const tracker = new CopilotUsageTracker();
  tracker.dbPath      = path.join(tmpDir, `db-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  tracker.apiKeysPath = path.join(tmpDir, `keys-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  tracker.db          = null;   // force re-load from the new path
  tracker.apiKeys     = null;
  return tracker;
}

// ── Run all tests ─────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n============================================================');
  console.log('  Quota & Token Monitoring System — Unit Tests');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;
  const record = (ok) => { if (ok) passed++; else failed++; };

  // ── 1. Module exports ───────────────────────────────────────────────────────

  record(test('Module loads and exports CopilotUsageTracker', () => {
    const mod = require('./copilot-usage-api');
    assertTrue(typeof mod.CopilotUsageTracker === 'function', 'CopilotUsageTracker is a class');
    assertTrue(typeof mod.COPILOT_MODEL_MULTIPLIERS === 'object', 'COPILOT_MODEL_MULTIPLIERS exported');
    assertTrue(typeof mod.MODEL_PROVIDERS === 'object', 'MODEL_PROVIDERS exported');
    assertTrue(typeof mod.getModelProvider === 'function', 'getModelProvider exported');
    assertTrue(typeof mod.DEFAULT_DB === 'object', 'DEFAULT_DB exported');
  }));

  // ── 2. Model multipliers ────────────────────────────────────────────────────

  record(test('COPILOT_MODEL_MULTIPLIERS — key models have correct values', () => {
    const { COPILOT_MODEL_MULTIPLIERS } = require('./copilot-usage-api');
    assertEqual(COPILOT_MODEL_MULTIPLIERS['gpt-4.1-mini'],     0,    'gpt-4.1-mini = 0 (base)');
    assertEqual(COPILOT_MODEL_MULTIPLIERS['claude-sonnet-4'],  1,    'claude-sonnet-4 = 1');
    assertEqual(COPILOT_MODEL_MULTIPLIERS['claude-opus-4'],    5,    'claude-opus-4 = 5');
    assertEqual(COPILOT_MODEL_MULTIPLIERS['o4-mini'],          0.33, 'o4-mini = 0.33');
    assertEqual(COPILOT_MODEL_MULTIPLIERS['gemini-2.5-pro'],   1,    'gemini-2.5-pro = 1');
    assertEqual(COPILOT_MODEL_MULTIPLIERS['gpt-4.5'],          50,   'gpt-4.5 = 50');
  }));

  // ── 3. getModelProvider ─────────────────────────────────────────────────────

  record(test('getModelProvider returns correct provider', () => {
    const { getModelProvider } = require('./copilot-usage-api');
    assertEqual(getModelProvider('claude-sonnet-4'),  'claude',  'claude provider');
    assertEqual(getModelProvider('gpt-4.1-mini'),     'openai',  'openai provider');
    assertEqual(getModelProvider('gemini-2.5-pro'),   'gemini',  'gemini provider');
    assertEqual(getModelProvider('unknown-model-xyz'),'unknown', 'unknown falls back');
  }));

  // ── 4. logUsage — entry structure ──────────────────────────────────────────

  record(test('logUsage() returns correctly structured entry', () => {
    const tracker = makeTracker();
    const entry = tracker.logUsage('claude-sonnet-4', 'chat', 1500);

    assertTrue(typeof entry.id === 'string' && entry.id.length > 0, 'has id');
    assertTrue(typeof entry.timestamp === 'string', 'has timestamp');
    assertEqual(entry.model,       'claude-sonnet-4', 'model stored');
    assertEqual(entry.feature,     'chat',            'feature stored');
    assertEqual(entry.tokens,      1500,              'tokens stored');
    assertEqual(entry.multiplier,  1,                 'multiplier = 1');
    assertEqual(entry.premiumCost, 1,                 'premiumCost = 1');
    assertEqual(entry.provider,    'claude',          'provider = claude');
    assertEqual(entry.success,     true,              'success defaults to true');
  }));

  // ── 5. logUsage — quota accumulation ───────────────────────────────────────

  record(test('logUsage() accumulates quota.used correctly', () => {
    const tracker = makeTracker();
    tracker.logUsage('claude-sonnet-4', 'chat', 100);   // +1
    tracker.logUsage('o4-mini',         'chat', 200);   // +0.33
    tracker.logUsage('gpt-4.1-mini',    'chat', 300);   // +0

    tracker.db = null; // reload from disk to verify persistence
    const status = tracker.getQuotaStatus();
    assertEqual(status.used, 1.33, 'quota.used = 1.33 after three calls');
  }));

  // ── 6. logUsage — base model has zero premium cost ─────────────────────────

  record(test('logUsage() — base model does not consume quota', () => {
    const tracker = makeTracker();
    const entry = tracker.logUsage('gpt-4.1-mini', 'completion', 800);
    assertEqual(entry.premiumCost, 0, 'base model premiumCost = 0');
    const status = tracker.getQuotaStatus();
    assertEqual(status.used, 0, 'quota.used stays 0');
  }));

  // ── 7. logUsage — provider breakdown ──────────────────────────────────────

  record(test('logUsage() updates providerUsage breakdown', () => {
    const tracker = makeTracker();
    tracker.logUsage('claude-sonnet-4', 'chat', 100);
    tracker.logUsage('claude-opus-4',   'chat', 200);   // +5
    tracker.logUsage('gemini-2.5-pro',  'vision', 300); // +1

    const status = tracker.getQuotaStatus();
    assertEqual(status.providerUsage.claude, 6, 'claude providerUsage = 1+5 = 6');
    assertEqual(status.providerUsage.gemini, 1, 'gemini providerUsage = 1');
  }));

  // ── 8. getQuotaStatus — field types ───────────────────────────────────────

  record(test('getQuotaStatus() returns all required fields with correct types', () => {
    const tracker = makeTracker();
    const q = tracker.getQuotaStatus();

    assertTrue(typeof q.total         === 'number',  'total is number');
    assertTrue(typeof q.used          === 'number',  'used is number');
    assertTrue(typeof q.remaining     === 'number',  'remaining is number');
    assertTrue(typeof q.usedPercent   === 'number',  'usedPercent is number');
    assertTrue(typeof q.dailyBudget   === 'number',  'dailyBudget is number');
    assertTrue(typeof q.daysRemaining === 'number',  'daysRemaining is number');
    assertTrue(typeof q.warningLevel  === 'string',  'warningLevel is string');
    assertTrue(typeof q.recommendation === 'object', 'recommendation is object');
    assertTrue(typeof q.providerUsage  === 'object', 'providerUsage is object');
  }));

  // ── 9. Warning levels ─────────────────────────────────────────────────────

  record(test('getQuotaStatus() warningLevel = "normal" when usage is low', () => {
    const tracker = makeTracker();
    tracker.setQuota(300, 10);
    const q = tracker.getQuotaStatus();
    assertEqual(q.warningLevel, 'normal', 'normal at ~3% usage');
  }));

  record(test('getQuotaStatus() warningLevel = "warning" at 80%+ usage', () => {
    const tracker = makeTracker();
    tracker.setQuota(300, 244); // ~81.3%
    const q = tracker.getQuotaStatus();
    assertEqual(q.warningLevel, 'warning', 'warning at 81%');
  }));

  record(test('getQuotaStatus() warningLevel = "critical" at 95%+ usage', () => {
    const tracker = makeTracker();
    tracker.setQuota(300, 286); // ~95.3%
    const q = tracker.getQuotaStatus();
    assertEqual(q.warningLevel, 'critical', 'critical at 95%+');
  }));

  record(test('getQuotaStatus() warningLevel = "exhausted" when remaining = 0', () => {
    const tracker = makeTracker();
    tracker.setQuota(300, 300);
    const q = tracker.getQuotaStatus();
    assertEqual(q.warningLevel, 'exhausted', 'exhausted at 100%');
    assertEqual(q.remaining,    0,           'remaining = 0');
  }));

  // ── 10. getModelRecommendation — all four levels ───────────────────────────

  record(test('getModelRecommendation() — exhausted when remaining = 0', () => {
    const tracker = makeTracker();
    const r = tracker.getModelRecommendation(0, 30);
    assertEqual(r.level, 'exhausted', 'level=exhausted');
    assertEqual(r.suggestedModel, 'gpt-4.1-mini', 'suggests base model');
  }));

  record(test('getModelRecommendation() — comfortable when dailyBudget >= 10', () => {
    const tracker = makeTracker();
    const r = tracker.getModelRecommendation(300, 30); // 10 req/day
    assertEqual(r.level, 'comfortable', 'level=comfortable');
    assertEqual(r.suggestedModel, 'claude-sonnet-4', 'suggests premium model');
  }));

  record(test('getModelRecommendation() — moderate when 3 <= dailyBudget < 10', () => {
    const tracker = makeTracker();
    const r = tracker.getModelRecommendation(60, 30); // 2 req/day → tight... wait, 60/30=2 which is <3
    // Use 120/30 = 4 req/day → moderate
    const r2 = tracker.getModelRecommendation(120, 30);
    assertEqual(r2.level, 'moderate', 'level=moderate');
    assertEqual(r2.suggestedModel, 'o4-mini', 'suggests o4-mini');
  }));

  record(test('getModelRecommendation() — tight when dailyBudget < 3', () => {
    const tracker = makeTracker();
    const r = tracker.getModelRecommendation(30, 30); // 1 req/day
    assertEqual(r.level, 'tight', 'level=tight');
    assertEqual(r.suggestedModel, 'gpt-4.1', 'suggests base gpt-4.1');
  }));

  // ── 11. setQuota ──────────────────────────────────────────────────────────

  record(test('setQuota() updates total, used, and resetDate', () => {
    const tracker  = makeTracker();
    const resetDay = '2026-04-30';
    const result   = tracker.setQuota(500, 42, resetDay);

    assertEqual(result.total,     500,      'total set to 500');
    assertEqual(result.used,      42,       'used set to 42');
    assertEqual(result.resetDate, resetDay, 'resetDate set');

    // Verify persisted
    tracker.db = null;
    const q = tracker.getQuotaStatus();
    assertEqual(q.total, 500, 'total persisted');
    assertEqual(q.used,  42,  'used persisted');
  }));

  record(test('setQuota() daysRemaining reflects resetDate', () => {
    const tracker   = makeTracker();
    const future    = new Date();
    future.setDate(future.getDate() + 15);
    tracker.setQuota(300, 0, future.toISOString().slice(0, 10));

    const q = tracker.getQuotaStatus();
    assertBetween(q.daysRemaining, 14, 16, 'daysRemaining ~15');
  }));

  // ── 12. getUsageAnalysis ──────────────────────────────────────────────────

  record(test('getUsageAnalysis() returns correct structure', () => {
    const tracker = makeTracker();
    const a = tracker.getUsageAnalysis();

    assertTrue(a.summary                  !== undefined, 'has summary');
    assertTrue(a.summary.today            !== undefined, 'has today');
    assertTrue(a.summary.week             !== undefined, 'has week');
    assertTrue(a.summary.total            !== undefined, 'has total');
    assertTrue(typeof a.modelDistribution  === 'object', 'has modelDistribution');
    assertTrue(typeof a.featureDistribution === 'object','has featureDistribution');
    assertTrue(typeof a.providerDistribution === 'object','has providerDistribution');
    assertTrue(Array.isArray(a.trend7Days), 'has trend7Days array');
    assertEqual(a.trend7Days.length, 7,    '7-day trend has 7 entries');
  }));

  record(test('getUsageAnalysis() trend7Days always contains today', () => {
    const tracker = makeTracker();
    const today   = new Date().toISOString().slice(0, 10);
    const a       = tracker.getUsageAnalysis();
    const todayEntry = a.trend7Days.find(d => d.date === today);
    assertTrue(todayEntry !== undefined, 'today is in trend7Days');
  }));

  record(test('getUsageAnalysis() accumulates logged entries', () => {
    const tracker = makeTracker();
    tracker.logUsage('claude-sonnet-4', 'chat',       1000);
    tracker.logUsage('gpt-4.1-mini',    'completion', 500);
    tracker.logUsage('gemini-2.5-pro',  'vision',     800);

    const a = tracker.getUsageAnalysis();
    assertEqual(a.summary.total.count, 3, 'total.count = 3');
    assertTrue(a.summary.total.premiumCost > 0, 'total.premiumCost > 0');

    assertTrue(a.modelDistribution['claude-sonnet-4'] !== undefined, 'claude in modelDist');
    assertTrue(a.modelDistribution['gpt-4.1-mini']    !== undefined, 'gpt in modelDist');
    assertTrue(a.featureDistribution['chat']          !== undefined, 'chat in featureDist');
    assertTrue(a.featureDistribution['vision']        !== undefined, 'vision in featureDist');

    const today = new Date().toISOString().slice(0, 10);
    const todayEntry = a.trend7Days.find(d => d.date === today);
    assertTrue(todayEntry !== undefined,  'today in trend');
    assertEqual(todayEntry.count, 3,      'today.count = 3');
  }));

  // ── 13. setModelPreference ────────────────────────────────────────────────

  record(test('setModelPreference() accepts valid values', () => {
    const tracker = makeTracker();
    for (const pref of ['auto', 'premium', 'base', 'balanced']) {
      const r = tracker.setModelPreference(pref);
      assertEqual(r.preference, pref, `preference set to ${pref}`);
    }
  }));

  record(test('setModelPreference() rejects invalid value', () => {
    const tracker = makeTracker();
    let threw = false;
    try { tracker.setModelPreference('turbo'); } catch { threw = true; }
    assertTrue(threw, 'should throw for invalid preference');
  }));

  // ── 14. API key management ────────────────────────────────────────────────

  record(test('setApiKey() / listApiKeys() / removeApiKey() work correctly', () => {
    const tracker = makeTracker();

    // Set a key
    tracker.setApiKey('openai', 'sk-test-1234567890abcdef');
    const listed = tracker.listApiKeys();
    assertTrue(listed.keys['openai'] !== undefined, 'openai key is listed');
    // Value should be redacted (contains ***)
    assertTrue(listed.keys['openai'].includes('***'), 'key value is redacted');

    // Remove the key
    tracker.removeApiKey('openai');
    const listed2 = tracker.listApiKeys();
    assertTrue(listed2.keys['openai'] === undefined, 'openai key removed');
  }));

  record(test('setApiKey("github") sets githubTokenSet = true', () => {
    const tracker = makeTracker();
    tracker.setApiKey('github', 'ghp_testtoken123456');
    const listed = tracker.listApiKeys();
    assertEqual(listed.githubTokenSet, true, 'githubTokenSet = true');
  }));

  // ── 15. logApiCall convenience wrapper ───────────────────────────────────

  record(test('logApiCall() uses totalTokens when provided', () => {
    const tracker = makeTracker();
    const entry = tracker.logApiCall({
      model: 'claude-sonnet-4',
      feature: 'chat',
      promptTokens: 400,
      completionTokens: 600,
      totalTokens: 1000,
    });
    assertEqual(entry.tokens, 1000, 'tokens = totalTokens');
    assertEqual(entry.premiumCost, 1, 'premiumCost = 1');
  }));

  record(test('logApiCall() sums prompt + completion when totalTokens missing', () => {
    const tracker = makeTracker();
    const entry = tracker.logApiCall({
      model: 'gemini-2.5-flash',
      feature: 'chat',
      promptTokens: 300,
      completionTokens: 200,
    });
    assertEqual(entry.tokens, 500, 'tokens = 300+200');
  }));

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Tests: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60) + '\n');

  // Clean up temp files
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
