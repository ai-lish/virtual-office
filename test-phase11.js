/**
 * Phase 11: Test Script
 * Run with: node test-phase11.js
 */

const fs = require('fs');
const path = require('path');

// Test helper
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
    throw new Error(`${msg} Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value, msg = '') {
  if (!value) {
    throw new Error(`${msg} Expected truthy, got ${value}`);
  }
}

async function runTests() {
  console.log('🧪 Phase 11 Test Suite\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: TokenAnalyzer module loads
  if (test('TokenAnalyzer loads', () => {
    const { TokenAnalyzer } = require('./phase11-analyzer');
    assertTrue(TokenAnalyzer !== undefined, 'TokenAnalyzer should be defined');
  })) passed++; else failed++;
  
  // Test 2: TokenAnalyzer can load data
  if (test('TokenAnalyzer reads token-log.json', () => {
    const { TokenAnalyzer } = require('./phase11-analyzer');
    const analyzer = new TokenAnalyzer();
    const data = analyzer.loadData();
    assertTrue(data !== null, 'Should load data');
    assertTrue(data.meta !== undefined, 'Should have meta');
  })) passed++; else failed++;
  
  // Test 3: TokenAnalyzer getRecords returns array
  if (test('TokenAnalyzer.getRecords() returns array', () => {
    const { TokenAnalyzer } = require('./phase11-analyzer');
    const analyzer = new TokenAnalyzer();
    const records = analyzer.getRecords();
    assertTrue(Array.isArray(records), 'Should return array');
  })) passed++; else failed++;
  
  // Test 4: TokenAnalyzer getSummary works
  if (test('TokenAnalyzer.getSummary() works', () => {
    const { TokenAnalyzer } = require('./phase11-analyzer');
    const analyzer = new TokenAnalyzer();
    const summary = analyzer.getSummary();
    assertTrue(summary !== null, 'Should return summary');
    assertTrue(summary.metrics !== undefined, 'Should have metrics');
    assertTrue(summary.cache !== undefined, 'Should have cache');
  })) passed++; else failed++;
  
  // Test 5: Cache Hit Rate calculation
  if (test('Cache Hit Rate calculation works', () => {
    const { TokenAnalyzer } = require('./phase11-analyzer');
    const analyzer = new TokenAnalyzer();
    const records = analyzer.getRecords();
    const cache = analyzer.calculateCacheHitRate(records);
    assertTrue(cache !== null, 'Should return cache data');
    assertTrue(typeof cache.hitRate === 'number', 'hitRate should be number');
  })) passed++; else failed++;
  
  // Test 6: Model distribution
  if (test('Model distribution works', () => {
    const { TokenAnalyzer } = require('./phase11-analyzer');
    const analyzer = new TokenAnalyzer();
    const dist = analyzer.getModelDistribution();
    assertTrue(typeof dist === 'object', 'Should return object');
  })) passed++; else failed++;
  
  // Test 7: API distribution
  if (test('API distribution works', () => {
    const { TokenAnalyzer } = require('./phase11-analyzer');
    const analyzer = new TokenAnalyzer();
    const dist = analyzer.getApiDistribution();
    assertTrue(typeof dist === 'object', 'Should return object');
  })) passed++; else failed++;
  
  // Test 8: Hourly distribution
  if (test('Hourly distribution works', () => {
    const { TokenAnalyzer } = require('./phase11-analyzer');
    const analyzer = new TokenAnalyzer();
    const hourly = analyzer.getHourlyDistribution();
    assertTrue(typeof hourly === 'object', 'Should return object');
    assertEqual(Object.keys(hourly).length, 24, 'Should have 24 hours');
  })) passed++; else failed++;
  
  // Test 9: Daily distribution
  if (test('Daily distribution works', () => {
    const { TokenAnalyzer } = require('./phase11-analyzer');
    const analyzer = new TokenAnalyzer();
    const daily = analyzer.getDailyDistribution();
    assertTrue(Array.isArray(daily), 'Should return array');
  })) passed++; else failed++;
  
  // Test 10: VLM analysis
  if (test('VLM analysis works', () => {
    const { TokenAnalyzer } = require('./phase11-analyzer');
    const analyzer = new TokenAnalyzer();
    const vlm = analyzer.analyzeVLMUsage();
    assertTrue(vlm !== null, 'Should return VLM data');
    assertTrue(typeof vlm.totalCalls === 'number', 'totalCalls should be number');
  })) passed++; else failed++;
  
  // Test 11: CSV Importer module loads
  if (test('MinimaxCsvImporter loads', () => {
    const { MinimaxCsvImporter } = require('./phase11-csv-importer');
    assertTrue(MinimaxCsvImporter !== undefined, 'MinimaxCsvImporter should be defined');
  })) passed++; else failed++;
  
  // Test 12: TokenAPI module loads
  if (test('TokenAPI loads', () => {
    const { TokenAPI } = require('./phase11-api');
    assertTrue(TokenAPI !== undefined, 'TokenAPI should be defined');
  })) passed++; else failed++;
  
  // Test 13: TokenAPI has getRouter
  if (test('TokenAPI has getRouter', () => {
    const { TokenAPI } = require('./phase11-api');
    const api = new TokenAPI();
    assertTrue(api.getRouter !== undefined, 'getRouter should be defined');
  })) passed++; else failed++;
  
  // Test 14: phase11-commands loads
  if (test('phase11-commands loads', () => {
    const commands = require('./phase11-commands');
    assertTrue(commands.handleTokenCommand !== undefined, 'handleTokenCommand should be defined');
    assertTrue(commands.getTokenHelp !== undefined, 'getTokenHelp should be defined');
  })) passed++; else failed++;
  
  // Test 15: phase11-cron loads
  if (test('phase11-cron loads', () => {
    const cron = require('./phase11-cron');
    assertTrue(cron.updateTokenLog !== undefined, 'updateTokenLog should be defined');
    assertTrue(cron.rebuildSummaries !== undefined, 'rebuildSummaries should be defined');
  })) passed++; else failed++;
  
  // Summary
  console.log(`\n${'='.repeat(40)}`);
  console.log(`Tests: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(40));
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
