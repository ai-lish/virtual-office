/**
 * Phase 11: Token API Client (Static JSON Version)
 * Loads data directly from token-log.json for GitHub Pages compatibility
 */

class TokenAPI {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl || '';
    this.data = null;
  }

  /**
   * Parse a consumptionTime string into { date, hour }
   * Handles both ISO format ("2026-03-28T20:00:00Z") and
   * range format ("2026-03-27 20:00-21:00").
   */
  parseTime(timeStr) {
    if (!timeStr) return { date: null, hour: null };
    if (timeStr.includes('T')) {
      // ISO: "2026-03-28T20:00:00Z"
      const [datePart, timePart] = timeStr.split('T');
      return { date: datePart, hour: parseInt(timePart.split(':')[0]) };
    }
    // Range: "2026-03-27 20:00-21:00"
    const spaceIdx = timeStr.indexOf(' ');
    const datePart = timeStr.slice(0, spaceIdx);
    const hourStr = timeStr.slice(spaceIdx + 1).split(':')[0];
    return { date: datePart, hour: parseInt(hourStr) };
  }

  /**
   * Load data from static JSON file
   */
  async loadData(retry = 1) {
    if (this.data) return this.data;

    const tryFetch = async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json();
      } catch (e) {
        return null;
      }
    };

    try {
      // Try a few locations and allow a retry (with cache-bust)
      let data = await tryFetch('token-log.json');
      if (!data) data = await tryFetch('../token-log.json');
      if (!data && retry > 0) {
        // retry once with cache-bust
        const cb = `?t=${Date.now()}`;
        data = await tryFetch(`token-log.json${cb}`) || await tryFetch(`../token-log.json${cb}`);
      }

      if (!data) {
        throw new Error('Failed to load token-log.json');
      }

      this.data = data;
      return this.data;
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  /**
   * Load a small summary file for quick initial rendering
   */
  async loadSummary() {
    if (this.summary) return this.summary;
    try {
      let response = await fetch('summary-token-log.json');
      if (!response.ok) response = await fetch('../summary-token-log.json');
      if (!response.ok) throw new Error('Failed to load summary-token-log.json');
      this.summary = await response.json();
      return this.summary;
    } catch (error) {
      console.warn('Summary not available:', error.message);
      return null;
    }
  }

  /**
   * Quick summary getter that uses summary-token-log.json when available
   */
  async getSummaryQuick(startDate, endDate) {
    const s = await this.loadSummary();
    if (s) {
      // If date filters provided, fall back to full summary via getSummary
      if (startDate || endDate) return this.getSummary(startDate, endDate);
      // Return object resembling getSummary() top-level structure
      return {
        totalRecords: s.meta?.totalRecords || 0,
        dateRange: s.meta?.dateRange || { start: null, end: null },
        metrics: s.metrics || { totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, avgTokensPerRecord: 0 },
        cache: s.cache || { cacheRead: 0, cacheCreate: 0, hitRate: 0, hitRatePercentage: '0.0%', savingsTokens: 0 },
        byModel: s.byModel || {},
        byApi: s.byApi || {}
      };
    }
    // Fallback to full summary
    return this.getSummary(startDate, endDate);
  }

  /**
   * Calculate cache hit rate
   */
  calculateCacheHitRate(records) {
    const cacheRead = records
      .filter(r => r.consumedApi && r.consumedApi.includes('cache-read'))
      .reduce((sum, r) => sum + (r.totalUsageQuantity || 0), 0);
    
    const cacheCreate = records
      .filter(r => r.consumedApi && r.consumedApi.includes('cache-create'))
      .reduce((sum, r) => sum + (r.totalUsageQuantity || 0), 0);
    
    const total = cacheRead + cacheCreate;
    
    return {
      cacheRead,
      cacheCreate,
      hitRate: total > 0 ? cacheRead / total : 0,
      hitRatePercentage: total > 0 ? `${(cacheRead / total * 100).toFixed(1)}%` : '0.0%',
      savingsTokens: cacheRead
    };
  }

  /**
   * Calculate model distribution
   */
  calculateModelDistribution(records) {
    const models = {};
    records.forEach(r => {
      const model = r.consumedModel || 'unknown';
      if (!models[model]) {
        models[model] = { tokens: 0, count: 0, inputTokens: 0, outputTokens: 0 };
      }
      models[model].tokens += r.totalUsageQuantity || 0;
      models[model].count++;
      models[model].inputTokens += r.inputUsageQuantity || 0;
      models[model].outputTokens += r.outputUsageQuantity || 0;
    });
    
    const total = Object.values(models).reduce((sum, m) => sum + m.tokens, 0);
    Object.keys(models).forEach(model => {
      models[model].percentage = total > 0 ? `${(models[model].tokens / total * 100).toFixed(1)}%` : '0.0%';
    });
    
    return models;
  }

  /**
   * Calculate API distribution
   */
  calculateApiDistribution(records) {
    const apis = {};
    records.forEach(r => {
      const api = r.consumedApi || 'unknown';
      if (!apis[api]) {
        apis[api] = { tokens: 0, count: 0, inputTokens: 0, outputTokens: 0 };
      }
      apis[api].tokens += r.totalUsageQuantity || 0;
      apis[api].count++;
      apis[api].inputTokens += r.inputUsageQuantity || 0;
      apis[api].outputTokens += r.outputUsageQuantity || 0;
    });
    
    const total = Object.values(apis).reduce((sum, a) => sum + a.tokens, 0);
    Object.keys(apis).forEach(api => {
      apis[api].percentage = total > 0 ? `${(apis[api].tokens / total * 100).toFixed(1)}%` : '0.0%';
    });
    
    return apis;
  }

  /**
   * Get summary statistics
   */
  async getSummary(startDate, endDate) {
    const data = await this.loadData();
    let records = data.records || [];
    
    if (startDate || endDate) {
      records = records.filter(r => {
        if (!r.consumptionTime) return false;
        const { date } = this.parseTime(r.consumptionTime);
        if (!date) return false;
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
        return true;
      });
    }
    
    const totalInput = records.reduce((sum, r) => sum + (r.inputUsageQuantity || 0), 0);
    const totalOutput = records.reduce((sum, r) => sum + (r.outputUsageQuantity || 0), 0);
    const totalTokens = records.reduce((sum, r) => sum + (r.totalUsageQuantity || 0), 0);
    
    const dates = records
      .map(r => r.consumptionTime ? this.parseTime(r.consumptionTime).date : null)
      .filter(Boolean)
      .sort();
    
    return {
      totalRecords: records.length,
      dateRange: {
        start: dates[0] || null,
        end: dates[dates.length - 1] || null
      },
      metrics: {
        totalInputTokens: totalInput,
        totalOutputTokens: totalOutput,
        totalTokens: totalTokens,
        avgTokensPerRecord: records.length > 0 ? Math.round(totalTokens / records.length) : 0
      },
      cache: this.calculateCacheHitRate(records),
      byModel: this.calculateModelDistribution(records),
      byApi: this.calculateApiDistribution(records)
    };
  }

  /**
   * Get token trends
   */
  async getTrend(period = 'daily', startDate, endDate) {
    const data = await this.loadData();
    let records = data.records || [];
    
    if (startDate || endDate) {
      records = records.filter(r => {
        if (!r.consumptionTime) return false;
        const { date } = this.parseTime(r.consumptionTime);
        if (!date) return false;
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
        return true;
      });
    }
    
    // Group by period
    const grouped = {};
    records.forEach(r => {
      if (!r.consumptionTime) return;
      const { date, hour } = this.parseTime(r.consumptionTime);
      if (!date) return;
      
      let key;
      if (period === 'hourly') {
        key = `${date} ${String(hour).padStart(2, '0')}:00`;
      } else if (period === 'weekly') {
        const d = new Date(date);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = date;
      }
      
      if (!grouped[key]) {
        grouped[key] = { tokens: 0, input: 0, output: 0, count: 0 };
      }
      grouped[key].tokens += r.totalUsageQuantity || 0;
      grouped[key].input += r.inputUsageQuantity || 0;
      grouped[key].output += r.outputUsageQuantity || 0;
      grouped[key].count++;
    });
    
    return Object.entries(grouped)
      .map(([period, data]) => ({ period, ...data }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Get daily distribution
   */
  async getDaily(limit = 30, startDate, endDate) {
    const trend = await this.getTrend('daily', startDate, endDate);
    return trend.slice(-limit);
  }

  /**
   * Get comparison data (week vs week)
   */
  async getCompare(period = 'daily') {
    const trend = await this.getTrend(period);
    if (trend.length < 2) {
      return { changePercent: 0, trend: 'stable', current: 0, previous: 0 };
    }
    
    const half = Math.floor(trend.length / 2);
    const recent = trend.slice(half);
    const previous = trend.slice(0, half);
    
    const currentTotal = recent.reduce((sum, d) => sum + d.tokens, 0);
    const previousTotal = previous.reduce((sum, d) => sum + d.tokens, 0);
    
    let changePercent = 0;
    if (previousTotal > 0) {
      changePercent = ((currentTotal - previousTotal) / previousTotal) * 100;
    }
    
    return {
      changePercent: Math.round(changePercent * 10) / 10,
      trend: changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'stable',
      current: currentTotal,
      previous: previousTotal
    };
  }

  /**
   * Get hourly distribution
   */
  async getHourly(startDate, endDate) {
    const data = await this.loadData();
    let records = data.records || [];
    
    if (startDate || endDate) {
      records = records.filter(r => {
        if (!r.consumptionTime) return false;
        const { date } = this.parseTime(r.consumptionTime);
        if (!date) return false;
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
        return true;
      });
    }
    
    const hourly = {};
    for (let i = 0; i < 24; i++) {
      hourly[i] = 0;
    }
    
    records.forEach(r => {
      if (!r.consumptionTime) return;
      const { hour } = this.parseTime(r.consumptionTime);
      if (hour !== null && !isNaN(hour)) {
        hourly[hour] += r.totalUsageQuantity || 0;
      }
    });
    
    return Object.entries(hourly).map(([hour, tokens]) => ({ hour: parseInt(hour), tokens }));
  }

  /**
   * Get API distribution
   */
  async getByApi(startDate, endDate) {
    const summary = await this.getSummary(startDate, endDate);
    return summary.byApi;
  }

  /**
   * Get model distribution
   */
  async getByModel(startDate, endDate) {
    const summary = await this.getSummary(startDate, endDate);
    return summary.byModel;
  }

  /**
   * Get cache efficiency
   */
  async getCacheEfficiency(startDate, endDate) {
    const summary = await this.getSummary(startDate, endDate);
    return summary.cache;
  }

  /**
   * Get VLM usage
   */
  async getVLM() {
    const data = await this.loadData();
    const vlmRecords = (data.records || []).filter(r => 
      r.consumedModel && r.consumedModel.includes('vlm')
    );
    
    const totalTokens = vlmRecords.reduce((sum, r) => sum + (r.totalUsageQuantity || 0), 0);
    
    // Find peak hour
    const hourlyTokens = {};
    for (let i = 0; i < 24; i++) hourlyTokens[i] = 0;
    vlmRecords.forEach(r => {
      if (r.consumptionTime) {
        const { hour } = this.parseTime(r.consumptionTime);
        if (hour !== null && !isNaN(hour)) {
          hourlyTokens[hour] += r.totalUsageQuantity || 0;
        }
      }
    });
    const peakHour = Object.entries(hourlyTokens).sort((a, b) => b[1] - a[1])[0];
    
    return {
      totalCalls: vlmRecords.length,
      totalTokens: totalTokens,
      avgTokensPerCall: vlmRecords.length > 0 ? Math.round(totalTokens / vlmRecords.length) : 0,
      peakHour: peakHour && peakHour[1] > 0 ? parseInt(peakHour[0]) : null
    };
  }

  /**
   * Get paginated and filtered individual records
   */
  async getRecords({ limit = 20, offset = 0, startDate, endDate, api, model, keyName } = {}) {
    const data = await this.loadData();
    let records = data.records || [];

    // Apply filters
    if (startDate || endDate) {
      records = records.filter(r => {
        if (!r.consumptionTime) return false;
        const { date } = this.parseTime(r.consumptionTime);
        if (!date) return false;
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
        return true;
      });
    }
    if (api) {
      records = records.filter(r => r.consumedApi && r.consumedApi.includes(api));
    }
    if (model) {
      records = records.filter(r => r.consumedModel && r.consumedModel.includes(model));
    }
    if (keyName) {
      records = records.filter(r => r.secretKeyName && r.secretKeyName.includes(keyName));
    }

    // Sort newest first
    records = records.slice().sort((a, b) => {
      const ta = a.consumptionTime || '';
      const tb = b.consumptionTime || '';
      return tb.localeCompare(ta);
    });

    return {
      total: records.length,
      offset,
      limit,
      records: records.slice(offset, offset + limit)
    };
  }

  /**
   * Export data
   */
  async export(format = 'json', startDate, endDate) {
    const data = await this.loadData();
    let records = data.records || [];
    
    if (startDate || endDate) {
      records = records.filter(r => {
        if (!r.consumptionTime) return false;
        const date = r.consumptionTime.split('T')[0];
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
        return true;
      });
    }
    
    if (format === 'csv') {
      const headers = ['Date', 'API', 'Model', 'Input', 'Output', 'Total'];
      const rows = records.map(r => [
        r.consumptionTime ? r.consumptionTime.split('T')[0] : '',
        r.consumedApi || '',
        r.consumedModel || '',
        r.inputUsageQuantity || 0,
        r.outputUsageQuantity || 0,
        r.totalUsageQuantity || 0
      ]);
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'token-export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'token-export.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  }
}

// Global instance
window.tokenAPI = new TokenAPI();
