/**
 * Phase 11: Token Usage Analyzer
 * Core analysis functions for Minimax Token usage data
 */

const fs = require('fs');
const path = require('path');

class TokenAnalyzer {
  constructor() {
    this.tokenLogPath = path.join(__dirname, 'token-log.json');
    this.data = null;
  }

  /**
   * Load token log data
   */
  loadData() {
    if (!this.data) {
      this.data = JSON.parse(fs.readFileSync(this.tokenLogPath, 'utf-8'));
    }
    return this.data;
  }

  /**
   * Get all records
   */
  getRecords() {
    this.loadData();
    return this.data.records;
  }

  /**
   * Filter records by date range
   */
  filterByDateRange(records, startDate, endDate) {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    return records.filter(r => {
      const time = new Date(r.consumptionTime);
      if (start && time < start) return false;
      if (end && time > end) return false;
      return true;
    });
  }

  /**
   * Group records by a field or function
   */
  groupBy(records, keyOrFn) {
    const result = {};
    records.forEach(record => {
      const key = typeof keyOrFn === 'function' ? keyOrFn(record) : record[keyOrFn];
      if (!result[key]) result[key] = [];
      result[key].push(record);
    });
    return result;
  }

  /**
   * Sum a field across records
   */
  sum(records, field) {
    return records.reduce((sum, r) => sum + (r[field] || 0), 0);
  }

  /**
   * Calculate Cache Hit Rate
   * Formula: cache-read / (cache-read + cache-create)
   */
  calculateCacheHitRate(records) {
    const cacheRead = records
      .filter(r => r.consumedApi && r.consumedApi.includes('cache-read'))
      .reduce((sum, r) => sum + r.totalUsageQuantity, 0);
    
    const cacheCreate = records
      .filter(r => r.consumedApi && r.consumedApi.includes('cache-create'))
      .reduce((sum, r) => sum + r.totalUsageQuantity, 0);
    
    const total = cacheRead + cacheCreate;
    
    return {
      cacheRead,
      cacheCreate,
      hitRate: total > 0 ? cacheRead / total : 0,
      hitRatePercentage: total > 0 ? `${(cacheRead / total * 100).toFixed(1)}%` : '0.0%',
      savingsTokens: cacheRead // Tokens saved by cache
    };
  }

  /**
   * Calculate Input/Output ratio
   */
  calculateInputOutputRatio(records) {
    const input = this.sum(records, 'inputUsageQuantity');
    const output = this.sum(records, 'outputUsageQuantity');
    
    return {
      inputTokens: input,
      outputTokens: output,
      totalTokens: input + output,
      ratio: output > 0 ? (input / output).toFixed(2) : 'N/A',
      ratioLabel: `${(input / 1000000).toFixed(2)}M : ${(output / 1000000).toFixed(2)}M`
    };
  }

  /**
   * Get overall summary statistics
   */
  getSummary(records = null) {
    if (!records) records = this.getRecords();
    
    const inputTokens = this.sum(records, 'inputUsageQuantity');
    const outputTokens = this.sum(records, 'outputUsageQuantity');
    const totalTokens = this.sum(records, 'totalUsageQuantity');
    const totalSpent = this.sum(records, 'amountSpent');
    const totalAfterVoucher = this.sum(records, 'amountAfterVoucher');
    
    // Get date range
    let dateRange = { start: null, end: null };
    if (records.length > 0) {
      const sorted = [...records].sort((a, b) => 
        new Date(a.consumptionTime) - new Date(b.consumptionTime)
      );
      dateRange = {
        start: sorted[0].consumptionTime.slice(0, 10),
        end: sorted[sorted.length - 1].consumptionTime.slice(0, 10)
      };
    }
    
    // Cache analysis
    const cache = this.calculateCacheHitRate(records);
    
    // Model distribution
    const byModel = this.getModelDistribution(records);
    
    // API distribution
    const byApi = this.getApiDistribution(records);
    
    return {
      totalRecords: records.length,
      dateRange,
      metrics: {
        totalInputTokens: inputTokens,
        totalOutputTokens: outputTokens,
        totalTokens,
        totalAmountSpent: totalSpent,
        totalAmountAfterVoucher: totalAfterVoucher,
        avgTokensPerRecord: records.length > 0 ? Math.round(totalTokens / records.length) : 0
      },
      cache,
      byModel,
      byApi
    };
  }

  /**
   * Get model distribution
   */
  getModelDistribution(records = null) {
    if (!records) records = this.getRecords();
    const grouped = this.groupBy(records, 'consumedModel');
    const total = this.sum(records, 'totalUsageQuantity');
    
    const result = {};
    Object.entries(grouped).forEach(([model, recs]) => {
      const tokens = this.sum(recs, 'totalUsageQuantity');
      result[model] = {
        tokens,
        count: recs.length,
        inputTokens: this.sum(recs, 'inputUsageQuantity'),
        outputTokens: this.sum(recs, 'outputUsageQuantity'),
        percentage: total > 0 ? `${(tokens / total * 100).toFixed(1)}%` : '0.0%'
      };
    });
    
    return result;
  }

  /**
   * Get API distribution
   */
  getApiDistribution(records = null) {
    if (!records) records = this.getRecords();
    const grouped = this.groupBy(records, 'consumedApi');
    const total = this.sum(records, 'totalUsageQuantity');
    
    const result = {};
    Object.entries(grouped).forEach(([api, recs]) => {
      const tokens = this.sum(recs, 'totalUsageQuantity');
      result[api] = {
        tokens,
        count: recs.length,
        inputTokens: this.sum(recs, 'inputUsageQuantity'),
        outputTokens: this.sum(recs, 'outputUsageQuantity'),
        percentage: total > 0 ? `${(tokens / total * 100).toFixed(1)}%` : '0.0%'
      };
    });
    
    return result;
  }

  /**
   * Get token trends by period
   */
  getTrends(records = null, period = 'daily') {
    if (!records) records = this.getRecords();
    
    const grouped = this.groupBy(records, r => {
      const date = new Date(r.consumptionTime);
      if (period === 'hourly') {
        return `${date.toISOString().slice(0, 13)}:00`;
      } else if (period === 'weekly') {
        const weekStart = this.getWeekStart(date);
        return weekStart.toISOString().slice(0, 10);
      }
      return date.toISOString().slice(0, 10);
    });
    
    return Object.entries(grouped)
      .map(([key, vals]) => ({
        period: key,
        inputTokens: this.sum(vals, 'inputUsageQuantity'),
        outputTokens: this.sum(vals, 'outputUsageQuantity'),
        totalTokens: this.sum(vals, 'totalUsageQuantity'),
        recordCount: vals.length
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Get hour of day (0-23) from timestamp
   */
  getHour(timestamp) {
    return new Date(timestamp).getUTCHours();
  }

  /**
   * Get week start date (Monday)
   */
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setUTCDate(diff));
  }

  /**
   * Get hourly distribution (for heatmap)
   */
  getHourlyDistribution(records = null) {
    if (!records) records = this.getRecords();
    
    const hourly = {};
    for (let i = 0; i < 24; i++) hourly[i] = 0;
    
    records.forEach(r => {
      const hour = this.getHour(r.consumptionTime);
      hourly[hour] += r.totalUsageQuantity;
    });
    
    return hourly;
  }

  /**
   * Get daily distribution
   */
  getDailyDistribution(records = null) {
    if (!records) records = this.getRecords();
    
    const daily = {};
    records.forEach(r => {
      const date = r.consumptionTime.slice(0, 10);
      if (!daily[date]) {
        daily[date] = {
          date,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          recordCount: 0
        };
      }
      daily[date].inputTokens += r.inputUsageQuantity;
      daily[date].outputTokens += r.outputUsageQuantity;
      daily[date].totalTokens += r.totalUsageQuantity;
      daily[date].recordCount++;
    });
    
    return Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Analyze VLM usage
   */
  analyzeVLMUsage(records = null) {
    if (!records) records = this.getRecords();
    
    const vlmRecords = records.filter(r => r.consumedModel === 'coding-plan-vlm');
    
    if (vlmRecords.length === 0) {
      return {
        totalCalls: 0,
        totalTokens: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        avgTokensPerCall: 0,
        firstUse: null,
        lastUse: null,
        hourlyDistribution: {},
        dailyBreakdown: {},
        peakHour: null
      };
    }
    
    const totalTokens = this.sum(vlmRecords, 'totalUsageQuantity');
    const totalInput = this.sum(vlmRecords, 'inputUsageQuantity');
    const totalOutput = this.sum(vlmRecords, 'outputUsageQuantity');
    
    // Hourly distribution
    const hourlyDist = {};
    for (let i = 0; i < 24; i++) hourlyDist[i] = 0;
    vlmRecords.forEach(r => {
      const hour = this.getHour(r.consumptionTime);
      hourlyDist[hour]++;
    });
    
    // Find peak hour
    let peakHour = 0;
    let peakCount = 0;
    Object.entries(hourlyDist).forEach(([hour, count]) => {
      if (count > peakCount) {
        peakCount = count;
        peakHour = parseInt(hour);
      }
    });
    
    // Daily breakdown
    const dailyBreakdown = {};
    vlmRecords.forEach(r => {
      const date = r.consumptionTime.slice(0, 10);
      if (!dailyBreakdown[date]) {
        dailyBreakdown[date] = { calls: 0, tokens: 0, inputTokens: 0, outputTokens: 0 };
      }
      dailyBreakdown[date].calls++;
      dailyBreakdown[date].tokens += r.totalUsageQuantity;
      dailyBreakdown[date].inputTokens += r.inputUsageQuantity;
      dailyBreakdown[date].outputTokens += r.outputUsageQuantity;
    });
    
    // Sort by date
    const sortedDaily = Object.entries(dailyBreakdown)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Date range
    const sorted = [...vlmRecords].sort((a, b) => 
      new Date(a.consumptionTime) - new Date(b.consumptionTime)
    );
    
    return {
      totalCalls: vlmRecords.length,
      totalTokens,
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      avgTokensPerCall: Math.round(totalTokens / vlmRecords.length),
      firstUse: sorted[0]?.consumptionTime || null,
      lastUse: sorted[sorted.length - 1]?.consumptionTime || null,
      hourlyDistribution: hourlyDist,
      peakHour,
      peakHourCount: peakCount,
      dailyBreakdown: sortedDaily
    };
  }

  /**
   * Build/refresh daily summaries
   */
  buildDailySummaries(records = null) {
    if (!records) records = this.getRecords();
    
    const dailyData = this.getDailyDistribution(records);
    const summaries = {};
    
    dailyData.forEach(day => {
      const dayRecords = records.filter(r => r.consumptionTime.slice(0, 10) === day.date);
      
      // Cache for this day
      const cacheRead = dayRecords
        .filter(r => r.consumedApi && r.consumedApi.includes('cache-read'))
        .reduce((sum, r) => sum + r.totalUsageQuantity, 0);
      const cacheCreate = dayRecords
        .filter(r => r.consumedApi && r.consumedApi.includes('cache-create'))
        .reduce((sum, r) => sum + r.totalUsageQuantity, 0);
      const cacheTotal = cacheRead + cacheCreate;
      
      // By API
      const byApi = {};
      const apiGroups = this.groupBy(dayRecords, 'consumedApi');
      Object.entries(apiGroups).forEach(([api, recs]) => {
        byApi[api] = {
          tokens: this.sum(recs, 'totalUsageQuantity'),
          count: recs.length
        };
      });
      
      // By Model
      const byModel = {};
      const modelGroups = this.groupBy(dayRecords, 'consumedModel');
      Object.entries(modelGroups).forEach(([model, recs]) => {
        byModel[model] = {
          tokens: this.sum(recs, 'totalUsageQuantity'),
          count: recs.length
        };
      });
      
      // Hourly distribution
      const hourlyDist = {};
      for (let i = 0; i < 24; i++) hourlyDist[i] = 0;
      dayRecords.forEach(r => {
        const hour = this.getHour(r.consumptionTime);
        hourlyDist[hour] += r.totalUsageQuantity;
      });
      
      summaries[day.date] = {
        date: day.date,
        metrics: {
          totalInputTokens: day.inputTokens,
          totalOutputTokens: day.outputTokens,
          totalTokens: day.totalTokens,
          totalAmountSpent: this.sum(dayRecords, 'amountSpent'),
          totalAmountAfterVoucher: this.sum(dayRecords, 'amountAfterVoucher'),
          recordCount: day.recordCount
        },
        cache: {
          readTokens: cacheRead,
          createTokens: cacheCreate,
          hitRate: cacheTotal > 0 ? cacheRead / cacheTotal : 0,
          hitRatePercentage: cacheTotal > 0 ? `${(cacheRead / cacheTotal * 100).toFixed(1)}%` : '0.0%'
        },
        byApi,
        byModel,
        hourlyDistribution: hourlyDist
      };
    });
    
    return summaries;
  }

  /**
   * Build weekly summary
   */
  buildWeeklySummary(records = null, weekStart = null) {
    if (!records) records = this.getRecords();
    
    const startDate = weekStart ? new Date(weekStart) : this.getWeekStart(new Date());
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    
    const weekRecords = this.filterByDateRange(
      records,
      startDate.toISOString(),
      endDate.toISOString()
    );
    
    if (weekRecords.length === 0) {
      return null;
    }
    
    const totalTokens = this.sum(weekRecords, 'totalUsageQuantity');
    const dailyData = this.getDailyDistribution(weekRecords);
    
    // Find peak day
    let peakDay = null;
    let peakTokens = 0;
    dailyData.forEach(day => {
      if (day.totalTokens > peakTokens) {
        peakTokens = day.totalTokens;
        peakDay = day.date;
      }
    });
    
    // Cache
    const cache = this.calculateCacheHitRate(weekRecords);
    
    return {
      weekStart: startDate.toISOString().slice(0, 10),
      weekEnd: endDate.toISOString().slice(0, 10),
      daysInWeek: 7,
      daysWithData: dailyData.length,
      metrics: {
        totalInputTokens: this.sum(weekRecords, 'inputUsageQuantity'),
        totalOutputTokens: this.sum(weekRecords, 'outputUsageQuantity'),
        totalTokens,
        avgDailyTokens: Math.round(totalTokens / 7),
        peakDay,
        peakDayTokens: peakTokens
      },
      cache: {
        totalReadTokens: cache.cacheRead,
        totalCreateTokens: cache.cacheCreate,
        avgHitRate: cache.hitRate,
        totalSavingsTokens: cache.savingsTokens
      },
      dailyBreakdown: dailyData
    };
  }

  /**
   * Build monthly summary
   */
  buildMonthlySummary(records = null, yearMonth = null) {
    if (!records) records = this.getRecords();
    
    const [year, month] = yearMonth 
      ? yearMonth.split('-').map(Number)
      : [new Date().getUTCFullYear(), new Date().getUTCMonth() + 1];
    
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0)); // Last day of month
    
    const monthRecords = this.filterByDateRange(
      records,
      startDate.toISOString(),
      endDate.toISOString()
    );
    
    if (monthRecords.length === 0) {
      return null;
    }
    
    const totalTokens = this.sum(monthRecords, 'totalUsageQuantity');
    const totalDays = endDate.getUTCDate();
    const dailyData = this.getDailyDistribution(monthRecords);
    
    // Find peak day
    let peakDay = null;
    let peakTokens = 0;
    dailyData.forEach(day => {
      if (day.totalTokens > peakTokens) {
        peakTokens = day.totalTokens;
        peakDay = day.date;
      }
    });
    
    // Cache
    const cache = this.calculateCacheHitRate(monthRecords);
    
    // Model usage
    const modelUsage = this.getModelDistribution(monthRecords);
    
    // API usage
    const apiUsage = this.getApiDistribution(monthRecords);
    
    // Weekly breakdown
    const weeklyBreakdown = [];
    for (let week = 1; week <= 5; week++) {
      const weekStart = new Date(Date.UTC(year, month - 1, (week - 1) * 7 + 1));
      if (weekStart > endDate) break;
      const weekEnd = new Date(Date.UTC(year, month - 1, week * 7));
      if (weekEnd > endDate) weekEnd.setTime(endDate.getTime());
      
      const weekRecords = this.filterByDateRange(
        monthRecords,
        weekStart.toISOString(),
        weekEnd.toISOString()
      );
      
      if (weekRecords.length > 0) {
        const weekStartStr = weekStart.toISOString().slice(0, 10);
        weeklyBreakdown.push({
          week: `${year}-W${String(week).padStart(2, '0')}`,
          weekStart: weekStartStr,
          tokens: this.sum(weekRecords, 'totalUsageQuantity')
        });
      }
    }
    
    return {
      month: `${year}-${String(month).padStart(2, '0')}`,
      year,
      daysInMonth: totalDays,
      daysWithData: dailyData.length,
      metrics: {
        totalInputTokens: this.sum(monthRecords, 'inputUsageQuantity'),
        totalOutputTokens: this.sum(monthRecords, 'outputUsageQuantity'),
        totalTokens,
        avgDailyTokens: Math.round(totalTokens / totalDays),
        peakDay,
        peakDayTokens: peakTokens
      },
      cache: {
        totalReadTokens: cache.cacheRead,
        totalCreateTokens: cache.cacheCreate,
        avgHitRate: cache.hitRate,
        totalSavingsTokens: cache.savingsTokens
      },
      modelUsage,
      apiUsage,
      weeklyBreakdown
    };
  }

  /**
   * Get summary with optional date range
   */
  getSummaryWithRange(startDate, endDate) {
    const records = this.getRecords();
    const filtered = this.filterByDateRange(records, startDate, endDate);
    return this.getSummary(filtered);
  }

  /**
   * Get comparison with previous period
   */
  compareToPreviousPeriod(records = null, period = 'daily') {
    if (!records) records = this.getRecords();
    
    const now = new Date();
    let currentStart, currentEnd, prevStart, prevEnd;
    
    if (period === 'daily') {
      currentEnd = new Date(now);
      currentStart = new Date(now);
      currentStart.setUTCDate(currentStart.getUTCDate() - 1);
      
      prevEnd = new Date(currentStart);
      prevStart = new Date(prevEnd);
      prevStart.setUTCDate(prevStart.getUTCDate() - 1);
    } else if (period === 'weekly') {
      currentEnd = new Date(now);
      currentStart = this.getWeekStart(now);
      
      prevEnd = new Date(currentStart);
      prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
      prevStart = this.getWeekStart(prevEnd);
    } else if (period === 'monthly') {
      currentEnd = new Date(now);
      currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      
      prevEnd = new Date(currentStart);
      prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
      prevStart = new Date(Date.UTC(prevEnd.getUTCFullYear(), prevEnd.getUTCMonth(), 1));
    }
    
    const current = this.filterByDateRange(records, currentStart.toISOString(), currentEnd.toISOString());
    const previous = this.filterByDateRange(records, prevStart.toISOString(), prevEnd.toISOString());
    
    const currentTotal = this.sum(current, 'totalUsageQuantity');
    const previousTotal = this.sum(previous, 'totalUsageQuantity');
    
    const change = previousTotal > 0 
      ? ((currentTotal - previousTotal) / previousTotal * 100).toFixed(1)
      : 0;
    
    return {
      currentPeriod: { start: currentStart.toISOString().slice(0, 10), end: currentEnd.toISOString().slice(0, 10) },
      previousPeriod: { start: prevStart.toISOString().slice(0, 10), end: prevEnd.toISOString().slice(0, 10) },
      currentTokens: currentTotal,
      previousTokens: previousTotal,
      changePercent: change,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
    };
  }
}

module.exports = { TokenAnalyzer };
