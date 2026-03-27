/**
 * Phase 12: Copilot Usage Tracker
 * Tracks GitHub Copilot Premium request usage and provides intelligent model recommendations
 */

const fs = require('fs');
const path = require('path');

const COPILOT_MODEL_MULTIPLIERS = {
  // Base models (do not consume premium quota)
  'gpt-4.1':       0,
  'gpt-4.1-mini':  0,
  // Premium models
  'claude-sonnet-4': 1,
  'o3':              1,
  'o4-mini':         0.33,
  'gemini-2.5-pro':  1,
  'claude-opus-4':   5,
  'gpt-4.5':         50
};

const DB_PATH = path.join(__dirname, 'copilot-usage-db.json');

const DEFAULT_DB = {
  quota: { total: 300, used: 0, resetDate: null },
  history: [],
  modelPreference: 'auto',
  lastUpdated: null
};

class CopilotUsageTracker {
  constructor() {
    this.dbPath = DB_PATH;
    this.db = null;
  }

  /**
   * Load database from file, initializing if it does not exist
   */
  loadDb() {
    if (!this.db) {
      if (fs.existsSync(this.dbPath)) {
        try {
          this.db = JSON.parse(fs.readFileSync(this.dbPath, 'utf-8'));
          // Migrate old data that may lack fields
          if (!this.db.quota) this.db.quota = { ...DEFAULT_DB.quota };
          if (!this.db.history) this.db.history = [];
          if (!this.db.modelPreference) this.db.modelPreference = 'auto';
        } catch (e) {
          this.db = JSON.parse(JSON.stringify(DEFAULT_DB));
        }
      } else {
        this.db = JSON.parse(JSON.stringify(DEFAULT_DB));
      }
    }
    return this.db;
  }

  /**
   * Persist database to file
   */
  saveDb() {
    this.db.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.dbPath, JSON.stringify(this.db, null, 2), 'utf-8');
  }

  /**
   * Log a single Copilot usage event
   * @param {string} model - Model identifier (e.g. 'claude-sonnet-4')
   * @param {string} feature - Feature used (e.g. 'chat', 'completion')
   * @param {number} tokens - Token count (optional, informational)
   * @returns {object} The logged entry
   */
  logUsage(model, feature, tokens) {
    this.loadDb();
    const multiplier = COPILOT_MODEL_MULTIPLIERS[model] !== undefined
      ? COPILOT_MODEL_MULTIPLIERS[model]
      : 1;
    const premiumCost = multiplier;

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
      model: model || 'unknown',
      feature: feature || 'unknown',
      tokens: tokens || 0,
      multiplier,
      premiumCost
    };

    this.db.history.push(entry);
    this.db.quota.used = parseFloat((this.db.quota.used + premiumCost).toFixed(4));
    this.saveDb();
    return entry;
  }

  /**
   * Get current quota status with intelligent warnings
   * @returns {object} Quota status object
   */
  getQuotaStatus() {
    this.loadDb();
    const { quota } = this.db;
    const total = quota.total || 300;
    const used = quota.used || 0;
    const remaining = Math.max(0, total - used);
    const usedPercent = total > 0 ? parseFloat(((used / total) * 100).toFixed(1)) : 0;

    // Days remaining until reset
    let daysRemaining = 30;
    if (quota.resetDate) {
      const reset = new Date(quota.resetDate);
      const now = new Date();
      daysRemaining = Math.max(1, Math.ceil((reset - now) / (1000 * 60 * 60 * 24)));
    }

    const dailyBudget = parseFloat((remaining / daysRemaining).toFixed(2));

    let warningLevel = 'normal';
    if (remaining === 0) warningLevel = 'exhausted';
    else if (usedPercent >= 95) warningLevel = 'critical';
    else if (usedPercent >= 80) warningLevel = 'warning';

    const recommendation = this.getModelRecommendation(remaining, daysRemaining);

    return {
      total,
      used: parseFloat(used.toFixed(4)),
      remaining: parseFloat(remaining.toFixed(4)),
      usedPercent,
      dailyBudget,
      daysRemaining,
      resetDate: quota.resetDate,
      warningLevel,
      modelPreference: this.db.modelPreference,
      recommendation
    };
  }

  /**
   * Recommend a model strategy based on remaining quota and days left
   * @param {number} remaining - Remaining premium requests
   * @param {number} daysRemaining - Days until quota resets
   * @returns {object} Recommendation object
   */
  getModelRecommendation(remaining, daysRemaining) {
    const days = Math.max(1, daysRemaining);
    const dailyBudget = remaining / days;

    if (remaining <= 0) {
      return {
        level: 'exhausted',
        emoji: '⛔',
        label: '配額耗盡',
        message: '已無 Premium 配額，強制使用基礎模型',
        suggestedModel: 'gpt-4.1-mini',
        color: '#e74c3c'
      };
    }
    if (dailyBudget >= 10) {
      return {
        level: 'comfortable',
        emoji: '🟢',
        label: '配額充裕',
        message: '配額充足，可自由使用高階模型',
        suggestedModel: 'claude-sonnet-4',
        color: '#2ecc71'
      };
    }
    if (dailyBudget >= 3) {
      return {
        level: 'moderate',
        emoji: '🟡',
        label: '配額適中',
        message: '建議日常任務用基礎模型，重要任務用 o4-mini',
        suggestedModel: 'o4-mini',
        color: '#f39c12'
      };
    }
    return {
      level: 'tight',
      emoji: '🔴',
      label: '配額緊張',
      message: '配額不足，建議僅用基礎模型',
      suggestedModel: 'gpt-4.1',
      color: '#e74c3c'
    };
  }

  /**
   * Get comprehensive usage analysis
   * @returns {object} Analysis data
   */
  getUsageAnalysis() {
    this.loadDb();
    const history = this.db.history;
    const now = new Date();

    // Today's start
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // This week's start (Monday)
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7));

    let todayCost = 0, weekCost = 0, totalCost = 0;
    let todayCount = 0, weekCount = 0, totalCount = 0;

    const modelDist = {};
    const featureDist = {};

    // 7-day trend: build a map keyed by date string
    const trendMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      trendMap[key] = { date: key, count: 0, premiumCost: 0 };
    }

    history.forEach(entry => {
      const ts = new Date(entry.timestamp);
      const cost = entry.premiumCost || 0;

      totalCost += cost;
      totalCount++;

      if (ts >= todayStart) {
        todayCost += cost;
        todayCount++;
      }
      if (ts >= weekStart) {
        weekCost += cost;
        weekCount++;
      }

      // Model distribution
      const m = entry.model || 'unknown';
      if (!modelDist[m]) modelDist[m] = { count: 0, premiumCost: 0 };
      modelDist[m].count++;
      modelDist[m].premiumCost = parseFloat((modelDist[m].premiumCost + cost).toFixed(4));

      // Feature distribution
      const f = entry.feature || 'unknown';
      if (!featureDist[f]) featureDist[f] = { count: 0, premiumCost: 0 };
      featureDist[f].count++;
      featureDist[f].premiumCost = parseFloat((featureDist[f].premiumCost + cost).toFixed(4));

      // 7-day trend
      const dateKey = ts.toISOString().slice(0, 10);
      if (trendMap[dateKey]) {
        trendMap[dateKey].count++;
        trendMap[dateKey].premiumCost = parseFloat(
          (trendMap[dateKey].premiumCost + cost).toFixed(4)
        );
      }
    });

    return {
      summary: {
        today: { count: todayCount, premiumCost: parseFloat(todayCost.toFixed(4)) },
        week: { count: weekCount, premiumCost: parseFloat(weekCost.toFixed(4)) },
        total: { count: totalCount, premiumCost: parseFloat(totalCost.toFixed(4)) }
      },
      modelDistribution: modelDist,
      featureDistribution: featureDist,
      trend7Days: Object.values(trendMap),
      lastUpdated: this.db.lastUpdated
    };
  }

  /**
   * Set the model usage preference strategy
   * @param {'auto'|'premium'|'base'|'balanced'} preference
   */
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

  /**
   * Manually set quota values
   * @param {number} total
   * @param {number} used
   * @param {string|null} resetDate - ISO date string
   */
  setQuota(total, used, resetDate) {
    this.loadDb();
    if (total !== undefined && total !== null) this.db.quota.total = Number(total);
    if (used !== undefined && used !== null) this.db.quota.used = Number(used);
    if (resetDate !== undefined) this.db.quota.resetDate = resetDate;
    this.saveDb();
    return this.db.quota;
  }

  /**
   * Optional: Fetch usage from GitHub Billing API
   * Requires GITHUB_TOKEN environment variable with manage_billing:copilot scope
   * @returns {Promise<object|null>}
   */
  async fetchFromGitHub() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return { error: 'GITHUB_TOKEN not set', note: 'Set GITHUB_TOKEN with manage_billing:copilot scope' };
    }
    try {
      const https = require('https');
      const options = {
        hostname: 'api.github.com',
        path: '/user/copilot_billing',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'virtual-office-copilot-tracker'
        }
      };
      return await new Promise((resolve, reject) => {
        const req = https.get(options, res => {
          let body = '';
          res.on('data', chunk => { body += chunk; });
          res.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(new Error('Failed to parse GitHub API response'));
            }
          });
        });
        req.on('error', reject);
        req.setTimeout(5000, () => { req.destroy(); reject(new Error('GitHub API timeout')); });
      });
    } catch (err) {
      return { error: err.message };
    }
  }
}

module.exports = { CopilotUsageTracker, COPILOT_MODEL_MULTIPLIERS };
