#!/usr/bin/env node
/**
 * log-usage.js — CLI for logging Copilot model usage to the tracker DB.
 *
 * Usage:
 *   node log-usage.js --model claude-sonnet-4 --tokens 1000 --feature chat
 *   node log-usage.js --model gpt-4.1-mini --tokens 500 --feature completion
 *   node log-usage.js --model gemini-2.5-pro --tokens 2000 --feature vision --latency 1200
 *   node log-usage.js --list-models
 *   node log-usage.js --quota --set-total 500 --set-used 50
 *   node log-usage.js --api-key claude sk-ant-...
 *   node log-usage.js --api-key github ghp_...
 *   node log-usage.js --poll-github
 *   node log-usage.js --status
 *
 * Environment:
 *   COPILOT_SERVER_URL  — defaults to http://localhost:18899
 */

const http  = require('http');
const https = require('https');
const { CopilotUsageTracker, COPILOT_MODEL_MULTIPLIERS } = require('./copilot-usage-api');

const BASE   = process.env.COPILOT_SERVER_URL || 'http://localhost:18899';
const tracker = new CopilotUsageTracker();

// ---- Helpers ----

function post(path, body) {
  return new Promise((resolve, reject) => {
    const url  = new URL(path, BASE);
    const mod  = url.protocol === 'https:' ? https : http;
    const data = JSON.stringify(body);
    const req  = mod.request({ hostname: url.hostname, port: url.port, path: url.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, res => {
      let b = '';
      res.on('data', c => { b += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(b)); } catch { reject(new Error(b)); }
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
        try { resolve(JSON.parse(b)); } catch { reject(new Error(b)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function help() {
  console.log(`
log-usage.js — Copilot Usage Tracker CLI
========================================

Usage:
  node log-usage.js --model <name> --tokens <n> --feature <type>
  node log-usage.js --model <name> --tokens <n> --feature <type> --latency <ms>
  node log-usage.js --model <name> --tokens <n> --feature <type> --key <apikey>

Options:
  --model <name>       Model name (e.g. claude-sonnet-4, gpt-4.1-mini, gemini-2.5-pro)
  --tokens <n>        Token count (prompt + completion, informational)
  --feature <type>    Feature: chat | completion | vision | edit | function
  --latency <ms>      Response latency in ms (optional)
  --key <apikey>      API key used for this call (optional, for records)
  --success <bool>    Whether the call succeeded (default: true)

Quota management:
  --quota                   Show current quota status
  --set-total <n>          Set total monthly quota
  --set-used <n>           Set used quota (reset after billing cycle)
  --set-reset <YYYY-MM-DD> Set quota reset date

API key management:
  --api-key <provider> <key>   Store an API key (claude|openai|gemini|github)
  --list-keys                 List stored API keys (redacted)
  --remove-key <provider>     Remove an API key

GitHub polling:
  --poll-github   Attempt to fetch real Copilot usage from GitHub API

Info:
  --list-models              List all known models and their multipliers
  --status                   Full status: quota + recent usage
  --analysis [days]         Usage analysis (default: 30 days)
  -h, --help                 Show this help

Examples:
  node log-usage.js --model claude-sonnet-4 --tokens 1500 --feature chat
  node log-usage.js --model o4-mini --tokens 800 --feature completion --latency 950
  node log-usage.js --model gemini-2.5-pro --tokens 3000 --feature vision
  node log-usage.js --api-key github YOUR_GITHUB_TOKEN
  node log-usage.js --poll-github
  node log-usage.js --status
`);
}

// ---- Argument parsing ----

const args = process.argv.slice(2);
const map  = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--')) {
    const key = a.slice(2);
    if (args[i + 1] && !args[i + 1].startsWith('--')) {
      map[key] = args[i + 1];
      i++;
    } else {
      map[key] = true;
    }
  }
}

if (map.help || map.h) { help(); process.exit(0); }

// ---- Commands ----

async function main() {
  try {
    // --list-models
    if (map['list-models']) {
      console.log('\nKnown models and their premium multipliers:\n');
      for (const [model, mult] of Object.entries(COPILOT_MODEL_MULTIPLIERS)) {
        const type  = mult === 0 ? 'base    ' : 'premium ';
        const label = mult === 0 ? '✅ free' : mult < 1 ? `⚡ ×${mult}` : mult === 1 ? '🔵 ×1`  ' : `🔴 ×${mult}`;
        console.log(`  ${type}  ${label}  ${model}`);
      }
      console.log();
      return;
    }

    // --quota
    if (map.quota && !map['set-total'] && !map['set-used']) {
      const r = await get('/api/copilot/quota');
      if (r.success) {
        const q = r.data;
        console.log(`
Quota Status
=============
  Total:     ${q.total}
  Used:      ${q.used} (${q.usedPercent}%)
  Remaining: ${q.remaining}
  Daily budget: ${q.dailyBudget} req/day
  Resets in: ${q.daysRemaining} days${q.resetDate ? ` (${q.resetDate})` : ''}
  Warning:   ${q.warningLevel}
  Recommendation: ${q.recommendation.emoji} ${q.recommendation.label} — ${q.recommendation.message}
  Suggested model: ${q.recommendation.suggestedModel}
`);
        if (q.providerUsage) {
          console.log('  Provider breakdown:');
          for (const [p, v] of Object.entries(q.providerUsage)) {
            console.log(`    ${p}: ${v} premium requests`);
          }
        }
      } else {
        console.error('Error:', r.error);
      }
      return;
    }

    // --set-total / --set-used
    if (map['set-total'] || map['set-used'] || map['set-reset']) {
      const body = {};
      if (map['set-total'])  body.total     = Number(map['set-total']);
      if (map['set-used'])   body.used      = Number(map['set-used']);
      if (map['set-reset']) body.resetDate  = map['set-reset'];
      const r = await post('/api/copilot/quota', body);
      console.log('Quota updated:', r.success ? r.data : r.error);
      return;
    }

    // --api-key
    if (map['api-key']) {
      const provider = map['api-key'];
      const key     = args[args.indexOf('--api-key') + 1];
      if (!key || key.startsWith('--')) { console.error('Usage: --api-key <provider> <key>'); process.exit(1); }
      // Direct tracker call (not via server)
      const result = tracker.setApiKey(provider, key);
      console.log('API key stored:', result);
      return;
    }

    // --list-keys
    if (map['list-keys']) {
      const r = tracker.listApiKeys();
      console.log('Stored API keys:', JSON.stringify(r, null, 2));
      return;
    }

    // --remove-key
    if (map['remove-key']) {
      const r = tracker.removeApiKey(map['remove-key']);
      console.log('Result:', r);
      return;
    }

    // --poll-github
    if (map['poll-github']) {
      console.log('Polling GitHub Copilot API endpoints...\n');
      const results = await tracker.pollGitHubCopilotUsage();
      for (const [path, result] of Object.entries(results)) {
        const icon = result.status === 'success' ? '✅' : '❌';
        console.log(`${icon} ${path}`);
        console.log(`   Note: ${result.note}`);
        if (result.status === 'success') {
          console.log(`   Data:`, JSON.stringify(result.data).slice(0, 200));
        } else {
          console.log(`   Error (${result.status}):`, result.error);
        }
        console.log();
      }
      return;
    }

    // --status
    if (map.status) {
      const [quotaRes, analysisRes] = await Promise.all([
        get('/api/copilot/quota'),
        get('/api/copilot/analysis'),
      ]);
      if (quotaRes.success) {
        const q = quotaRes.data;
        console.log('\n=== Copilot Usage Tracker Status ===');
        console.log(`Quota: ${q.remaining}/${q.total} remaining (${q.usedPercent}%)`);
        console.log(`Daily budget: ${q.dailyBudget} req/day`);
        console.log(`Days until reset: ${q.daysRemaining}`);
        console.log(`Warning: ${q.warningLevel}`);
        console.log(`Recommendation: ${q.recommendation.emoji} ${q.recommendation.suggestedModel}`);
      }
      if (analysisRes.success) {
        const a = analysisRes.data;
        console.log(`\nUsage (last 30d):`);
        console.log(`  Today:  ${a.summary.today.count} calls, ${a.summary.today.premiumCost} premium cost`);
        console.log(`  Week:   ${a.summary.week.count} calls, ${a.summary.week.premiumCost} premium cost`);
        console.log(`  Total:  ${a.summary.total.count} calls, ${a.summary.total.premiumCost} premium cost`);
        if (a.modelDistribution) {
          console.log(`\nTop models:`);
          const sorted = Object.entries(a.modelDistribution).sort(([,a],[,b]) => b.count - a.count).slice(0, 5);
          for (const [m, d] of sorted) {
            console.log(`  ${m}: ${d.count} calls, ${d.premiumCost} cost`);
          }
        }
      }
      return;
    }

    // --analysis
    if (map.analysis !== undefined) {
      const days = parseInt(map.analysis) || 30;
      const r = await get('/api/copilot/analysis');
      if (r.success) {
        const a = r.data;
        console.log(`\n=== Usage Analysis (last ${days} days) ===`);
        console.log(`Today:  ${a.summary.today.count} calls, ${a.summary.today.premiumCost} cost`);
        console.log(`Week:   ${a.summary.week.count} calls, ${a.summary.week.premiumCost} cost`);
        console.log(`Total:  ${a.summary.total.count} calls, ${a.summary.total.premiumCost} cost`);
        if (a.trend7Days) {
          console.log('\n7-day trend:');
          for (const day of a.trend7Days) {
            const bar = '█'.repeat(Math.min(day.count, 20));
            console.log(`  ${day.date}  ${String(day.count).padStart(3)} ${bar}`);
          }
        }
      } else {
        console.error('Error:', r.error);
      }
      return;
    }

    // --log (default): log a usage entry
    if (map.model) {
      const model    = map.model;
      const tokens   = parseInt(map.tokens) || 0;
      const feature  = map.feature || 'chat';
      const latency  = map.latency ? parseInt(map.latency) : undefined;
      const key      = map.key || undefined;
      const success  = map.success === 'false' ? false : true;

      const body = { model, feature, tokens };
      if (latency !== undefined) body.latency = latency;
      if (key)                   body.apiKeyUsed = key;
      body.success = success;

      const r = await post('/api/copilot/log', body);
      if (r.success) {
        console.log('✅ Usage logged:');
        console.log(`   Model:    ${r.data.entry.model}`);
        console.log(`   Feature:  ${r.data.entry.feature}`);
        console.log(`   Tokens:   ${r.data.entry.tokens}`);
        console.log(`   Cost:     ${r.data.entry.premiumCost} premium request(s)`);
        console.log(`   ID:       ${r.data.entry.id}`);
        console.log(`\nQuota: ${r.data.quota.remaining}/${r.data.quota.total} remaining`);
      } else {
        console.error('❌ Error:', r.error);
        process.exit(1);
      }
      return;
    }

    // No recognized flags
    help();
    process.exit(1);
  } catch (err) {
    console.error('❌ Fatal:', err.message);
    if (err.message.includes('ECONNREFUSED')) {
      console.error('   Is the server running? (node server.js)');
    }
    process.exit(1);
  }
}

main();
