/**
 * Phase 11: Token Dashboard
 * Main dashboard JavaScript
 */

class TokenDashboard {
  constructor() {
    this.api = window.tokenAPI;
    this.charts = window.TokenCharts;
    this.data = {};
    this.dateRange = {
      startDate: null,
      endDate: null
    };
  }

  /**
   * Initialize dashboard
   */
  async init() {
    console.log('Initializing Token Dashboard...');
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load initial data
    await this.loadAllData();
    
    // Render everything
    this.render();
  }

  /**
   * Set up UI event listeners
   */
  setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refresh());
    }
    
    // Export button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportData());
    }
    
    // Date range picker
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    if (startDateInput) {
      startDateInput.addEventListener('change', () => {
        this.dateRange.startDate = startDateInput.value;
        this.refresh();
      });
    }
    
    if (endDateInput) {
      endDateInput.addEventListener('change', () => {
        this.dateRange.endDate = endDateInput.value;
        this.refresh();
      });
    }
    
    // Period selector
    const periodSelect = document.getElementById('period-select');
    if (periodSelect) {
      periodSelect.addEventListener('change', () => this.refresh());
    }
  }

  /**
   * Load all dashboard data
   */
  async loadAllData() {
    this.showLoading(true);
    
    try {
      const params = {
        startDate: this.dateRange.startDate,
        endDate: this.dateRange.endDate
      };
      
      // Load all data in parallel
      const [
        summary,
        trends,
        byApi,
        byModel,
        cacheEfficiency,
        vlm,
        daily,
        hourly
      ] = await Promise.all([
        this.api.getSummary(params.startDate, params.endDate),
        this.api.getTrend('daily', params.startDate, params.endDate),
        this.api.getByApi(params.startDate, params.endDate),
        this.api.getByModel(params.startDate, params.endDate),
        this.api.getCacheEfficiency(params.startDate, params.endDate),
        this.api.getVLM(),
        this.api.getDaily(30, params.startDate, params.endDate),
        this.api.getHourly(params.startDate, params.endDate)
      ]);
      
      this.data = {
        summary: summary.data,
        trends: trends.data,
        byApi: byApi.data,
        byModel: byModel.data,
        cacheEfficiency: cacheEfficiency.data,
        vlm: vlm.data,
        daily: daily.data,
        hourly: hourly.data
      };
      
      // Load comparison
      try {
        const compare = await this.api.getCompare('daily');
        this.data.compare = compare.data;
      } catch (e) {
        console.warn('Could not load comparison:', e);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      this.showError(error.message);
    }
    
    this.showLoading(false);
  }

  /**
   * Refresh all data
   */
  async refresh() {
    await this.loadAllData();
    this.render();
  }

  /**
   * Render the entire dashboard
   */
  render() {
    this.renderKPICards();
    this.renderTrendChart();
    this.renderApiDistribution();
    this.renderModelDistribution();
    this.renderHeatmap();
    this.renderCacheEfficiency();
    this.renderVLMPanel();
    this.renderDailyChart();
  }

  /**
   * Render KPI cards
   */
  renderKPICards() {
    const summary = this.data.summary;
    if (!summary) return;
    
    const { metrics, cache, totalRecords, dateRange } = summary;
    const compare = this.data.compare;
    
    const cards = [
      {
        label: 'Total Tokens',
        value: this.formatNumber(metrics.totalTokens),
        class: '',
        icon: '📊'
      },
      {
        label: 'API Calls',
        value: this.formatNumber(totalRecords),
        class: '',
        icon: '🔢'
      },
      {
        label: 'Cache Hit Rate',
        value: cache.hitRatePercentage,
        class: parseFloat(cache.hitRate) >= 0.6 ? 'success' : parseFloat(cache.hitRate) >= 0.4 ? 'warning' : 'danger',
        icon: '⚡'
      },
      {
        label: 'Input/Output Ratio',
        value: `${metrics.totalInputTokens > 0 ? (metrics.totalInputTokens / (metrics.totalOutputTokens || 1)).toFixed(2) : 'N/A'}`,
        class: '',
        icon: '📈'
      }
    ];
    
    // Add comparison if available
    if (compare) {
      cards.push({
        label: 'vs Yesterday',
        value: `${compare.changePercent > 0 ? '+' : ''}${compare.changePercent}%`,
        class: compare.trend === 'up' ? 'success' : compare.trend === 'down' ? 'danger' : '',
        icon: compare.trend === 'up' ? '📈' : compare.trend === 'down' ? '📉' : '➡️'
      });
    }
    
    const container = document.getElementById('kpi-cards');
    if (!container) return;
    
    container.innerHTML = cards.map(card => `
      <div class="kpi-card">
        <div class="label"><span>${card.icon}</span> ${card.label}</div>
        <div class="value ${card.class}">${card.value}</div>
      </div>
    `).join('');
  }

  /**
   * Render trend chart
   */
  renderTrendChart() {
    const container = document.getElementById('trend-chart');
    if (!container) return;
    
    const trends = this.data.trends?.trends || [];
    const chartHtml = this.charts.renderASCIILineChart(trends, { width: 70, height: 12 });
    container.innerHTML = `<pre class="ascii-chart">${chartHtml}</pre>`;
  }

  /**
   * Render API distribution
   */
  renderApiDistribution() {
    const container = document.getElementById('api-dist-chart');
    if (!container) return;
    
    const byApi = this.data.byApi?.distribution || {};
    this.charts.renderPieChart(byApi, { container });
  }

  /**
   * Render model distribution
   */
  renderModelDistribution() {
    const container = document.getElementById('model-dist-chart');
    if (!container) return;
    
    const byModel = this.data.byModel?.distribution || {};
    this.charts.renderPieChart(byModel, { container });
  }

  /**
   * Render hourly heatmap
   */
  renderHeatmap() {
    const container = document.getElementById('heatmap-chart');
    if (!container) return;
    
    const hourly = this.data.hourly?.hourly || [];
    this.charts.renderHeatmap(hourly, { container });
  }

  /**
   * Render cache efficiency
   */
  renderCacheEfficiency() {
    const container = document.getElementById('cache-meter');
    if (!container) return;
    
    const cache = this.data.cacheEfficiency || { hitRate: 0 };
    this.charts.renderCacheMeter(parseFloat(cache.hitRate) || 0, { container });
  }

  /**
   * Render VLM panel
   */
  renderVLMPanel() {
    const container = document.getElementById('vlm-panel');
    if (!container) return;
    
    const vlm = this.data.vlm || {};
    
    container.innerHTML = `
      <div class="distribution-grid">
        <div class="distribution-item">
          <div class="distribution-color" style="background: #EB459E;"></div>
          <div class="distribution-info">
            <div class="distribution-name">Total VLM Calls</div>
            <div class="distribution-value">${this.formatNumber(vlm.totalCalls || 0)}</div>
          </div>
        </div>
        <div class="distribution-item">
          <div class="distribution-color" style="background: #EB459E;"></div>
          <div class="distribution-info">
            <div class="distribution-name">Total Tokens</div>
            <div class="distribution-value">${this.formatNumber(vlm.totalTokens || 0)}</div>
          </div>
        </div>
        <div class="distribution-item">
          <div class="distribution-color" style="background: #EB459E;"></div>
          <div class="distribution-info">
            <div class="distribution-name">Avg per Call</div>
            <div class="distribution-value">${this.formatNumber(vlm.avgTokensPerCall || 0)}</div>
          </div>
        </div>
        <div class="distribution-item">
          <div class="distribution-color" style="background: #EB459E;"></div>
          <div class="distribution-info">
            <div class="distribution-name">Peak Hour</div>
            <div class="distribution-value">${vlm.peakHour !== null ? `${vlm.peakHour}:00` : 'N/A'}</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render daily bar chart
   */
  renderDailyChart() {
    const container = document.getElementById('daily-chart');
    if (!container) return;
    
    const daily = this.data.daily?.daily || [];
    this.charts.renderBarChart(daily.slice(-14), { container, maxHeight: 120 });
  }

  /**
   * Export data
   */
  exportData() {
    const format = document.getElementById('export-format')?.value || 'json';
    this.api.export(format, this.dateRange.startDate, this.dateRange.endDate);
  }

  /**
   * Show/hide loading state
   */
  showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = show ? 'flex' : 'none';
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const error = document.getElementById('error-message');
    if (error) {
      error.textContent = message;
      error.style.display = 'block';
    }
  }

  /**
   * Format large numbers
   */
  formatNumber(num) {
    if (!num && num !== 0) return 'N/A';
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toLocaleString();
  }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new TokenDashboard();
  window.dashboard.init();
});
