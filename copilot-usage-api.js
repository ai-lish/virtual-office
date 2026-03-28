/**
 * Phase 12: Copilot Usage Tracker — Enhanced
 * Tracks GitHub Copilot Premium request usage and provides intelligent model recommendations.
 *
 * Features:
 * - Multi-model tracking (Claude, GPT, Gemini, etc.)
 * - Multiple API keys (per-model key storage)
 * - Manual usage logging via logUsage()
 * - GitHub Copilot API polling (when available)
 * - Quota management and recommendations
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ============================================================
// Model definitions
// ============================================================

const COPILOT_MODEL_MULTIPLIERS = {
  // Base models (do NOT consume premium quota)
  'gpt-4.1':          0,
  'gpt-4.1-mini':     0,
  'gpt-4o':           0,
  'gpt-4o-mini':      0,
  // Premium models (consume quota at varying rates)
  'claude-sonnet-4':  1,
  'claude-opus-4':    5,
  'claude-3-5-sonnet': 1,
  'o3':               1,
  'o3-mini':          0.33,
  'o4-mini':          0.33,
  'gemini-2.5-pro':   1,
  'gemini-2.5-flash':  0.25,
  'gemini-2.0-flash':  0.1,
  'gpt-4.5':          50,
};

const MODEL_PROVIDERS = {
  claude:   ['claude-sonnet-4', 'claude-opus-4', 'claude-3-5-sonnet'],
  openai:   ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini', 'gpt-4.5', 'o3', 'o3-mini', 'o4-mini'],
  gemini:   ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
};

// ============================================================
// Database paths
// ============================================================

const DB_PATH          = path.join(__dirname, 'copilot-usage-db.json');
const API_KEYS_DB_PATH = path.join(__dirname, 'copilot-api-keys.json');

const DEFAULT_DB = {
  quota: { total: 300, used: 0, resetDate: null },
  history: [],
  modelPreference: 'auto',
  lastUpdated: null,
  // Per-provider breakdown
  providerUsage: { claude: 0, openai: 0, gemini: 0 },
};

const DEFAULT_API_KEYS_DB = {
  // Per-model or per-provider API keys
  // Example: { claude: 'sk-ant-...', openai: 'sk-...', gemini: '...' }
  keys: {},
  // GitHub token specifically for Copilot billing API
  githubToken: null,
  // Last GitHub API check
  lastGitHubSync: null,
  lastGitHubError: null,
};

// ============================================================
// Helper: determine provider from model name
// ============================================================

function getModelProvider(model) {
  for (const [provider, models] of Object.entries(MODEL_PROVIDERS)) {
    if (models.includes(model)) return provider;
  }
  return 'unknown';
}

// ============================================================
// Main tracker class
// ============================================================

class CopilotUsageTracker {
  constructor() {
    this.dbPath     = DB_PATH;
    this.apiKeysPath = API_KEYS_DB_PATH;
    this.db         = null;
    this.apiKeys    = null;
  }

  // ---- Database I/O ----

  loadDb() {
    if (!this.db) {
      if (fs.existsSync(this.dbPath)) {
        try {
          this.db = JSON.parse(fs.readFileSync(this.dbPath, 'utf-8'));
        } catch (e) {
          this.db = JSON.parse(JSON.stringify(DEFAULT_DB));
        }
      } else {
        this.db = JSON.parse(JSON.stringify(DEFAULT_DB));
      }
      this._migrateDb();
    }
    return this.db;
  }

  _migrateDb() {
    if (!this.db.quota)          this.db.quota = { ...DEFAULT_DB.quota };
    if (!Array.isArray(this.db.history)) this.db.history = [];
    if (!this.db.modelPreference) this.db.modelPreference = 'auto';
    if (!this.db.providerUsage)   this.db.providerUsage = { ...DEFAULT_DB.providerUsage };
  }

  saveDb() {
    this.db.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.dbPath, JSON.stringify(this.db, null, 2), 'utf-8');
  }

  loadApiKeys() {
    if (!this.apiKeys) {
      if (fs.existsSync(this.apiKeysPath)) {
        try {
          this.apiKeys = JSON.parse(fs.readFileSync(this.apiKeysPath, 'utf-8'));
        } catch (e) {
          this.apiKeys = JSON.parse(JSON.stringify(DEFAULT_API_KEYS_DB));
        }
      } else {
        this.apiKeys = JSON.parse(JSON.stringify(DEFAULT_API_KEYS_DB));
      }
    }
    return this.apiKeys;
  }

  saveApiKeys() {
    fs.writeFileSync(this.apiKeysPath, JSON.stringify(this.apiKeys, null, 2), 'utf-8');
  }

  // ---- Core logging ----

  /**
   * Log a single Copilot usage event.
   *
   * @param {string} model        - Model identifier (e.g. 'claude-sonnet-4')
   * @param {string} feature      - Feature used: 'chat' | 'completion' | 'vision' | 'edit' | 'function'
   * @param {number} [tokens=0]   - Token count (informational)
   * @param {object} [extra={}]   - Additional fields: { provider, apiKeyUsed, latency, success }
   * @returns {object} The logged entry
   */
  logUsage(model, feature, tokens = 0, extra = {}) {
    this.loadDb();

    const multiplier    = COPILOT_MODEL_MULTIPLIERS[model] !== undefined
      ? COPILOT_MODEL_MULTIPLIERS[model] : 1;
    const premiumCost   = multiplier; // requests consumed
    const provider      = extra.provider || getModelProvider(model);

    const entry = {
      id:           Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp:    new Date().toISOString(),
      model:        model || 'unknown',
      feature:      feature || 'unknown',
      tokens:       Number(tokens) || 0,
      multiplier,
      premiumCost,
      provider,
      apiKeyUsed:   extra.apiKeyUsed || null,
      latency:      extra.latency || null,
      success:      extra.success !== false,
    };

    this.db.history.push(entry);

    // Accumulate quota
    this.db.quota.used = parseFloat((this.db.quota.used + premiumCost).toFixed(4));

    // Per-provider usage
    if (!this.db.providerUsage[provider]) this.db.providerUsage[provider] = 0;
    this.db.providerUsage[provider] = parseFloat(
      (this.db.providerUsage[provider] + premiumCost).toFixed(4)
    );

    this.saveDb();
    return entry;
  }

  /**
   * Log usage from a known API response (batch of completions).
   * Call this after each API call to automatically track tokens.
   *
   * @param {object} opts
   * @param {string} opts.model
   * @param {string} opts.feature
   * @param {number} [opts.promptTokens]
   * @param {number} [opts.completionTokens]
   * @param {number} [opts.totalTokens]
   * @param {string} [opts.apiKeyUsed]
   * @param {number} [opts.latency]
   * @param {boolean} [opts.success]
   */
  logApiCall({ model, feature, promptTokens, completionTokens, totalTokens, apiKeyUsed, latency, success }) {
    return this.logUsage(model, feature, totalTokens || (promptTokens || 0) + (completionTokens || 0), {
      apiKeyUsed,
      latency,
      success: success !== false,
      extra: {
        promptTokens:      promptTokens || 0,
        completionTokens:  completionTokens || 0,
      }
    });
  }

  // ---- Quota ----

  getQuotaStatus() {
    this.loadDb();
    const { quota } = this.db;
    const total   = quota.total   || 300;
    const used    = quota.used     || 0;
    const remaining = Math.max(0, total - used);
    const usedPercent = total > 0 ? parseFloat(((used / total) * 100).toFixed(1)) : 0;

    let daysRemaining = 30;
    if (quota.resetDate) {
      const reset = new Date(quota.resetDate);
      const now   = new Date();
      daysRemaining = Math.max(1, Math.ceil((reset - now) / (1000 * 60 * 60 * 24)));
    }

    const dailyBudget    = parseFloat((remaining / daysRemaining).toFixed(2));
    let   warningLevel   = 'normal';
    if (remaining === 0)       warningLevel = 'exhausted';
    else if (usedPercent >= 95) warningLevel = 'critical';
    else if (usedPercent >= 80) warningLevel = 'warning';

    const recommendation = this.getModelRecommendation(remaining, daysRemaining);

    return {
      total,
      used:   parseFloat(used.toFixed(4)),
      remaining: parseFloat(remaining.toFixed(4)),
      usedPercent,
      dailyBudget,
      daysRemaining,
      resetDate: quota.resetDate,
      warningLevel,
      modelPreference: this.db.modelPreference,
      providerUsage:   { ...this.db.providerUsage },
      recommendation,
    };
  }

  setQuota(total, used, resetDate) {
    this.loadDb();
    if (total   !== undefined) this.db.quota.total      = Number(total);
    if (used    !== undefined) this.db.quota.used       = Number(used);
    if (resetDate !== undefined) this.db.quota.resetDate = resetDate || null;
    this.saveDb();
    return this.db.quota;
  }

  // ---- Recommendations ----

  getModelRecommendation(remaining, daysRemaining) {
    const days = Math.max(1, daysRemaining);
    const dailyBudget = remaining / days;

    if (remaining <= 0) {
      return {
        level: 'exhausted', emoji: '⛔', label: '配額耗盡',
        message: '已無 Premium 配額，強制使用基礎模型',
        suggestedModel: 'gpt-4.1-mini', color: '#e74c3c'
      };
    }
    if (dailyBudget >= 10) {
      return {
        level: 'comfortable', emoji: '🟢', label: '配額充裕',
        message: '配額充足，可自由使用高階模型',
        suggestedModel: 'claude-sonnet-4', color: '#2ecc71'
      };
    }
    if (dailyBudget >= 3) {
      return {
        level: 'moderate', emoji: '🟡', label: '配額適中',
        message: '建議日常任務用基礎模型，重要任務用 o4-mini',
        suggestedModel: 'o4-mini', color: '#f39c12'
      };
    }
    return {
      level: 'tight', emoji: '🔴', label: '配額緊張',
      message: '配額不足，建議僅用基礎模型',
      suggestedModel: 'gpt-4.1', color: '#e74c3c'
    };
  }

  // ---- Analysis ----

  getUsageAnalysis(days = 30) {
    this.loadDb();
    const history = this.db.history;
    const now     = new Date();

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart  = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7));

    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);

    let todayCost = 0, weekCost = 0, totalCost = 0;
    let todayCount = 0, weekCount = 0, totalCount = 0;

    const modelDist    = {};
    const featureDist  = {};
    const providerDist = {};
    const trendMap     = {};

    // Initialise 7-day trend map (use UTC to avoid local-time off-by-one issues)
    // Build trend keys from UTC-midnight for the last 7 days including today.
    const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    for (let i = 6; i >= 0; i--) {
      const d = new Date(utcToday);
      d.setUTCDate(utcToday.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      trendMap[key] = { date: key, count: 0, premiumCost: 0 };
    }

    history.forEach(entry => {
      const ts   = new Date(entry.timestamp);
      const cost = entry.premiumCost || 0;

      if (ts < cutoff) return; // skip old entries based on days filter

      totalCost  += cost;
      totalCount++;

      if (ts >= todayStart) { todayCost += cost; todayCount++; }
      if (ts >= weekStart)  { weekCost  += cost; weekCount++;  }

      const m = entry.model   || 'unknown';
      const f = entry.feature || 'unknown';
      const p = entry.provider || 'unknown';

      if (!modelDist[m])    modelDist[m]    = { count: 0, premiumCost: 0 };
      if (!featureDist[f]) featureDist[f]  = { count: 0, premiumCost: 0 };
      if (!providerDist[p]) providerDist[p] = { count: 0, premiumCost: 0 };

      modelDist[m].count++;          modelDist[m].premiumCost     = parseFloat((modelDist[m].premiumCost + cost).toFixed(4));
      featureDist[f].count++;        featureDist[f].premiumCost   = parseFloat((featureDist[f].premiumCost + cost).toFixed(4));
      providerDist[p].count++;       providerDist[p].premiumCost  = parseFloat((providerDist[p].premiumCost + cost).toFixed(4));

      const dateKey = ts.toISOString().slice(0, 10);
      if (trendMap[dateKey]) {
        trendMap[dateKey].count++;
        trendMap[dateKey].premiumCost = parseFloat((trendMap[dateKey].premiumCost + cost).toFixed(4));
      }
    });

    return {
      summary: {
        today: { count: todayCount, premiumCost: parseFloat(todayCost.toFixed(4)) },
        week:  { count: weekCount,  premiumCost: parseFloat(weekCost.toFixed(4))  },
        total: { count: totalCount, premiumCost: parseFloat(totalCost.toFixed(4)) },
      },
      modelDistribution:    modelDist,
      featureDistribution:  featureDist,
      providerDistribution: providerDist,
      trend7Days:           Object.values(trendMap),
      providerUsage:       { ...this.db.providerUsage },
      lastUpdated:         this.db.lastUpdated,
    };
  }

  setModelPreference(preference) {
    const valid = ['auto', 'premium', 'base', 'balanced'];
    if (!valid.includes(preference)) {
      throw new Error(`Invalid preference. Must be one of: ${valid.join(', ')}`);
    }
    this.loadDb();
    this.db.modelPreference = preference;
    this.saveDb();
    return { preference };
  }

  // ---- API key management ----

  /**
   * Store an API key for a provider or specific model.
   * @param {string} provider - 'claude' | 'openai' | 'gemini' | 'github'
   * @param {string} apiKey
   */
  setApiKey(provider, apiKey) {
    this.loadApiKeys();
    this.apiKeys.keys[provider] = apiKey;
    if (provider === 'github') this.apiKeys.githubToken = apiKey;
    this.saveApiKeys();
    return { [provider]: '(set)' };
  }

  /**
   * Remove an API key.
   * @param {string} provider
   */
  removeApiKey(provider) {
    this.loadApiKeys();
    delete this.apiKeys.keys[provider];
    if (provider === 'github') this.apiKeys.githubToken = null;
    this.saveApiKeys();
    return { removed: provider };
  }

  /**
   * List providers that have keys configured (values are redacted).
   */
  listApiKeys() {
    this.loadApiKeys();
    const redacted = {};
    for (const k of Object.keys(this.apiKeys.keys)) {
      const v = this.apiKeys.keys[k];
      redacted[k] = v ? v.slice(0, 6) + '***' + v.slice(-4) : null;
    }
    return { keys: redacted, githubTokenSet: !!this.apiKeys.githubToken };
  }

  // ---- GitHub Copilot API polling ----

  /**
   * Attempt to fetch Copilot billing from GitHub API.
   * Returns { error, data, endpoint, statusCode }.
   *
   * Known GitHub Copilot API endpoints:
   *   GET /orgs/{org}/copilot/usage          — org-level usage (requires org admin)
   *   GET /enterprise/{enterprise}/copilot/usage — enterprise usage
   *   GET /user/copilot_billing             — user-level billing (scope: manage_billing:copilot)
   *
   * All currently return 404 for personal tokens because:
   *   - The token must have: manage_billing:copilot scope
   *   - The account must have GitHub Copilot subscription
   *   - math-lish token is a classic PAT with no Copilot scope
   *
   * @param {string} [overrideToken] - Optional token override
   */
  async pollGitHubCopilotUsage(overrideToken) {
    const token = overrideToken || this.loadApiKeys().githubToken || process.env.GITHUB_TOKEN;
    if (!token) {
      return { error: 'No GitHub token available. Set githubToken via setApiKey("github", token) or GITHUB_TOKEN env var.', endpoints: TESTED_ENDPOINTS, note: 'Requires token with manage_billing:copilot scope' };
    }

    const endpoints = TESTED_ENDPOINTS;
    const results   = {};

    for (const ep of endpoints) {
      try {
        const data = await this._ghGet(ep.path, token);
        results[ep.path] = { status: 'success', data, note: ep.note };
      } catch (err) {
        results[ep.path] = { status: err.status || 'error', error: err.message, note: ep.note };
      }
    }

    // Save results
    this.loadApiKeys();
    this.apiKeys.lastGitHubSync = new Date().toISOString();
    this.apiKeys.lastGitHubError = Object.values(results).every(r => r.status !== 'success')
      ? JSON.stringify(results)
      : null;
    this.saveApiKeys();

    return results;
  }

  async _ghGet(apiPath, token) {
    return new Promise((resolve, reject) => {
      const url  = new URL(apiPath, 'https://api.github.com');
      const opts = {
        hostname: url.hostname,
        path:     url.pathname + url.search,
        method:   'GET',
        headers: {
          'Authorization':  `Bearer ${token}`,
          'Accept':        'application/vnd.github+json',
          'User-Agent':     'virtual-office-copilot-tracker/1.0',
          'X-GitHub-Api-Version': '2022-11-28',
        }
      };
      const req = https.get(opts, res => {
        let body = '';
        res.on('data', c => { body += c; });
        res.on('end', () => {
          if (res.statusCode >= 400) {
            let parsed;
            try { parsed = JSON.parse(body); } catch { parsed = { message: body }; }
            const err = new Error(parsed.message || `HTTP ${res.statusCode}`);
            err.status = res.statusCode;
            reject(err);
          } else {
            try { resolve(JSON.parse(body)); } catch { resolve(body); }
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(8000, () => { req.destroy(); reject(new Error('GitHub API timeout (>8s)')); });
    });
  }
}

// ============================================================
// Endpoints tested by pollGitHubCopilotUsage()
// ============================================================

const TESTED_ENDPOINTS = [
  { path: '/user/copilot_billing',                     note: 'User-level billing (requires manage_billing:copilot scope)' },
  { path: '/user/copilot_subscription',                note: 'Copilot subscription status' },
  { path: '/user/copilot/seats',                       note: 'Copilot seat assignments' },
  { path: '/orgs/github/copilot/usage',               note: 'Org-level usage (requires org admin)' },
  { path: '/enterprises/github/copilot/usage',        note: 'Enterprise-level usage' },
  { path: '/user/billing/copilot',                    note: 'Alternative billing endpoint' },
];

// ============================================================
// Exports
// ============================================================

module.exports = {
  CopilotUsageTracker,
  COPILOT_MODEL_MULTIPLIERS,
  MODEL_PROVIDERS,
  getModelProvider,
  TESTED_ENDPOINTS,
  DEFAULT_DB,
  DEFAULT_API_KEYS_DB,
};
