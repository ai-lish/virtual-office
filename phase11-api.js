/**
 * Phase 11: Token API Endpoints
 * Express routes for token analysis data
 */

const express = require('express');
const { TokenAnalyzer } = require('./phase11-analyzer');

class TokenAPI {
  constructor() {
    this.analyzer = new TokenAnalyzer();
    this.router = express.Router();
    this.initRoutes();
  }

  /**
   * Initialize all routes
   */
  initRoutes() {
    // Summary endpoint
    this.router.get('/summary', (req, res) => this.handleSummary(req, res));
    
    // Trend endpoint
    this.router.get('/trend', (req, res) => this.handleTrend(req, res));
    
    // By API endpoint
    this.router.get('/by-api', (req, res) => this.handleByApi(req, res));
    
    // By Model endpoint
    this.router.get('/by-model', (req, res) => this.handleByModel(req, res));
    
    // Cache efficiency endpoint
    this.router.get('/cache-efficiency', (req, res) => this.handleCacheEfficiency(req, res));
    
    // VLM endpoint
    this.router.get('/vlm', (req, res) => this.handleVLM(req, res));
    
    // Daily endpoint
    this.router.get('/daily', (req, res) => this.handleDaily(req, res));
    
    // Hourly endpoint (for heatmap)
    this.router.get('/hourly', (req, res) => this.handleHourly(req, res));
    
    // Export endpoint
    this.router.get('/export', (req, res) => this.handleExport(req, res));
    
    // Comparison endpoint
    this.router.get('/compare', (req, res) => this.handleCompare(req, res));
    
    // Weekly summary
    this.router.get('/weekly', (req, res) => this.handleWeekly(req, res));
    
    // Monthly summary
    this.router.get('/monthly', (req, res) => this.handleMonthly(req, res));
    
    // Records (paginated)
    this.router.get('/records', (req, res) => this.handleRecords(req, res));
  }

  /**
   * Standard success response
   */
  success(data) {
    return { success: true, data };
  }

  /**
   * Standard error response
   */
  error(message, code = 'ERROR') {
    return { success: false, error: { message, code } };
  }

  /**
   * GET /api/tokens/summary
   * Overall summary statistics
   */
  handleSummary(req, res) {
    try {
      const { startDate, endDate } = req.query;
      let data;
      
      if (startDate || endDate) {
        data = this.analyzer.getSummaryWithRange(startDate, endDate);
      } else {
        data = this.analyzer.getSummary();
      }
      
      res.json(this.success(data));
    } catch (err) {
      console.error('Summary error:', err);
      res.status(500).json(this.error(err.message));
    }
  }

  /**
   * GET /api/tokens/trend
   * Token usage trends
   */
  handleTrend(req, res) {
    try {
      const { period = 'daily', startDate, endDate } = req.query;
      const records = this.analyzer.getRecords();
      let filtered = records;
      
      if (startDate || endDate) {
        filtered = this.analyzer.filterByDateRange(records, startDate, endDate);
      }
      
      const trends = this.analyzer.getTrends(filtered, period);
      
      res.json(this.success({
        period,
        trends
      }));
    } catch (err) {
      console.error('Trend error:', err);
      res.status(500).json(this.error(err.message));
    }
  }

  /**
   * GET /api/tokens/by-api
   * API type distribution
   */
  handleByApi(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const records = this.analyzer.getRecords();
      let filtered = records;
      
      if (startDate || endDate) {
        filtered = this.analyzer.filterByDateRange(records, startDate, endDate);
      }
      
      const distribution = this.analyzer.getApiDistribution(filtered);
      const totalTokens = Object.values(distribution)
        .reduce((sum, d) => sum + d.tokens, 0);
      
      res.json(this.success({
        distribution,
        totalTokens,
        recordCount: filtered.length
      }));
    } catch (err) {
      console.error('ByApi error:', err);
      res.status(500).json(this.error(err.message));
    }
  }

  /**
   * GET /api/tokens/by-model
   * Model distribution
   */
  handleByModel(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const records = this.analyzer.getRecords();
      let filtered = records;
      
      if (startDate || endDate) {
        filtered = this.analyzer.filterByDateRange(records, startDate, endDate);
      }
      
      const distribution = this.analyzer.getModelDistribution(filtered);
      const totalTokens = Object.values(distribution)
        .reduce((sum, d) => sum + d.tokens, 0);
      
      res.json(this.success({
        distribution,
        totalTokens,
        recordCount: filtered.length
      }));
    } catch (err) {
      console.error('ByModel error:', err);
      res.status(500).json(this.error(err.message));
    }
  }

  /**
   * GET /api/tokens/cache-efficiency
   * Cache hit rate analysis
   */
  handleCacheEfficiency(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const records = this.analyzer.getRecords();
      let filtered = records;
      
      if (startDate || endDate) {
        filtered = this.analyzer.filterByDateRange(records, startDate, endDate);
      }
      
      const cache = this.analyzer.calculateCacheHitRate(filtered);
      const ioRatio = this.analyzer.calculateInputOutputRatio(filtered);
      
      res.json(this.success({
        ...cache,
        totalTokens: ioRatio.totalTokens,
        inputTokens: ioRatio.inputTokens,
        outputTokens: ioRatio.outputTokens,
        inputOutputRatio: ioRatio.ratio
      }));
    } catch (err) {
      console.error('CacheEfficiency error:', err);
      res.status(500).json(this.error(err.message));
    }
  }

  /**
   * GET /api/tokens/vlm
   * VLM usage analysis
   */
  handleVLM(req, res) {
    try {
      const vlm = this.analyzer.analyzeVLMUsage();
      
      res.json(this.success(vlm));
    } catch (err) {
      console.error('VLM error:', err);
      res.status(500).json(this.error(err.message));
    }
  }

  /**
   * GET /api/tokens/daily
   * Daily distribution
   */
  handleDaily(req, res) {
    try {
      const { startDate, endDate, limit = 30 } = req.query;
      const records = this.analyzer.getRecords();
      let filtered = records;
      
      if (startDate || endDate) {
        filtered = this.analyzer.filterByDateRange(records, startDate, endDate);
      }
      
      let daily = this.analyzer.getDailyDistribution(filtered);
      
      // Apply limit (most recent first)
      if (limit) {
        daily = daily.slice(-parseInt(limit));
      }
      
      res.json(this.success({
        daily,
        count: daily.length
      }));
    } catch (err) {
      console.error('Daily error:', err);
      res.status(500).json(this.error(err.message));
    }
  }

  /**
   * GET /api/tokens/hourly
   * Hourly distribution (for heatmap)
   */
  handleHourly(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const records = this.analyzer.getRecords();
      let filtered = records;
      
      if (startDate || endDate) {
        filtered = this.analyzer.filterByDateRange(records, startDate, endDate);
      }
      
      const hourly = this.analyzer.getHourlyDistribution(filtered);
      
      // Convert to array format
      const hourlyArray = Object.entries(hourly).map(([hour, tokens]) => ({
        hour: parseInt(hour),
        tokens
      }));
      
      res.json(this.success({
        hourly: hourlyArray,
        peakHour: hourlyArray.reduce((max, h) => h.tokens > max.tokens ? h : max, hourlyArray[0])
      }));
    } catch (err) {
      console.error('Hourly error:', err);
      res.status(500).json(this.error(err.message));
    }
  }

  /**
   * GET /api/tokens/export
   * Export data as CSV or JSON
   */
  handleExport(req, res) {
    try {
      const { format = 'json', startDate, endDate } = req.query;
      const records = this.analyzer.getRecords();
      let filtered = records;
      
      if (startDate || endDate) {
        filtered = this.analyzer.filterByDateRange(records, startDate, endDate);
      }
      
      if (format === 'csv') {
        // Generate CSV
        const headers = [
          'id', 'secretKeyName', 'consumedApi', 'consumedModel',
          'amountSpent', 'amountAfterVoucher', 'inputUsageQuantity',
          'outputUsageQuantity', 'totalUsageQuantity', 'consumptionTime',
          'consumptionStatus'
        ];
        
        const csvRows = [headers.join(',')];
        filtered.forEach(r => {
          const row = headers.map(h => {
            let val = r[h] || '';
            if (typeof val === 'string' && val.includes(',')) {
              val = `"${val}"`;
            }
            return val;
          });
          csvRows.push(row.join(','));
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=token-export.csv');
        res.send(csvRows.join('\n'));
      } else {
        res.json(this.success({
          records: filtered,
          count: filtered.length,
          exportedAt: new Date().toISOString()
        }));
      }
    } catch (err) {
      console.error('Export error:', err);
      res.status(500).json(this.error(err.message));
    }
  }

  /**
   * GET /api/tokens/compare
   * Compare current period to previous
   */
  handleCompare(req, res) {
    try {
      const { period = 'daily' } = req.query;
      const comparison = this.analyzer.compareToPreviousPeriod(null, period);
      
      res.json(this.success(comparison));
    } catch (err) {
      console.error('Compare error:', err);
      res.status(500).json(this.error(err.message));
    }
  }

  /**
   * GET /api/tokens/weekly
   * Weekly summary
   */
  handleWeekly(req, res) {
    try {
      const { weekStart } = req.query;
      const summary = this.analyzer.buildWeeklySummary(null, weekStart);
      
      if (!summary) {
        return res.status(404).json(this.error('No data for specified week'));
      }
      
      res.json(this.success(summary));
    } catch (err) {
      console.error('Weekly error:', err);
      res.status(500).json(this.error(err.message));
    }
  }

  /**
   * GET /api/tokens/monthly
   * Monthly summary
   */
  handleMonthly(req, res) {
    try {
      const { month } = req.query; // Format: YYYY-MM
      const summary = this.analyzer.buildMonthlySummary(null, month);
      
      if (!summary) {
        return res.status(404).json(this.error('No data for specified month'));
      }
      
      res.json(this.success(summary));
    } catch (err) {
      console.error('Monthly error:', err);
      res.status(500).json(this.error(err.message));
    }
  }

  /**
   * GET /api/tokens/records
   * Paginated records
   */
  handleRecords(req, res) {
    try {
      const { page = 1, limit = 50, startDate, endDate } = req.query;
      const records = this.analyzer.getRecords();
      let filtered = records;
      
      if (startDate || endDate) {
        filtered = this.analyzer.filterByDateRange(records, startDate, endDate);
      }
      
      // Sort by time descending
      filtered = [...filtered].sort((a, b) => 
        new Date(b.consumptionTime) - new Date(a.consumptionTime)
      );
      
      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), 100);
      const start = (pageNum - 1) * limitNum;
      const end = start + limitNum;
      
      res.json(this.success({
        records: filtered.slice(start, end),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limitNum)
        }
      }));
    } catch (err) {
      console.error('Records error:', err);
      res.status(500).json(this.error(err.message));
    }
  }

  /**
   * Get router for use in Express app
   */
  getRouter() {
    return this.router;
  }
}

module.exports = { TokenAPI };
