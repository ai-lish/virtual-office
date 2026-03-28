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
    // Records table state
    this.recordsPage = 0;
    this.recordsLimit = 20;
    this.recordsTotal = 0;
    this.recordsFilter = { api: '', model: '', keyName: '' };
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

    // Records filter buttons
    const filterBtn = document.getElementById('records-filter-btn');
    if (filterBtn) {
      filterBtn.addEventListener('click', () => this.applyRecordsFilter());
    }

    const clearBtn = document.getElementById('records-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearRecordsFilter());
    }

    // Pagination buttons
    document.getElementById('page-first')?.addEventListener('click', () => this.goToPage(0));
    document.getElementById('page-prev')?.addEventListener('click', () => this.goToPage(this.recordsPage - 1));
    document.getElementById('page-next')?.addEventListener('click', () => this.goToPage(this.recordsPage + 1));
    document.getElementById('page-last')?.addEventListener('click', () => {
      const lastPage = Math.max(0, Math.ceil(this.recordsTotal / this.recordsLimit) - 1);
      this.goToPage(lastPage);
    });

    // Modal close
    document.getElementById('modal-close')?.addEventListener('click', () => this.closeRecordModal());
    document.getElementById('modal-backdrop')?.addEventListener('click', () => this.closeRecordModal());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeRecordModal();
    });
  }

  /**
   * Load all dashboard data
   */
  async loadAllData() {
    this.showLoading(true, '載入中...');
    
    try {
      this.showLoading(true, '載入摘要...');
      const params = {
        startDate: this.dateRange.startDate,
        endDate: this.dateRange.endDate
      };
      
      this.showLoading(true, '載入數據...');
      // Load all data in parallel
      // Try quick summary first (fast path)
      const quickSummary = await this.api.getSummaryQuick(params.startDate, params.endDate);
      this.data = { summary: quickSummary };
      this.showLoading(true, '載入詳細數據...');

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

      this.showLoading(true, '處理數據...');
      
      this.data = {
        summary: summary,
        trends: trends,
        byApi: byApi,
        byModel: byModel,
        cacheEfficiency: cacheEfficiency,
        vlm: vlm,
        daily: daily,
        hourly: hourly
      };
      
      // Load comparison
      try {
        const compare = await this.api.getCompare('daily');
        this.data.compare = compare;
      } catch (e) {
        console.warn('Could not load comparison:', e);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      this.showError('載入錯誤: ' + error.message);
      this.showLoading(false);
      return;
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
    this.populateFilterOptions();
    this.renderRecordsTable();
  }

  /**
   * Render KPI cards
   */
  renderKPICards() {
    const summary = this.data.summary;
    if (!summary) return;
    
    const { metrics, cache, totalRecords, dateRange } = summary;
    const compare = this.data.compare;
    
    if (!metrics) return;
    
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
    
    const trends = this.data.trends || [];
    const chartHtml = this.charts.renderASCIILineChart(trends, { width: 70, height: 12 });
    container.innerHTML = `<pre class="ascii-chart">${chartHtml}</pre>`;
  }

  /**
   * Render API distribution
   */
  renderApiDistribution() {
    const container = document.getElementById('api-dist-chart');
    if (!container) return;
    
    const byApi = this.data.byApi || {};
    this.charts.renderPieChart(byApi, { container });
  }

  /**
   * Render model distribution
   */
  renderModelDistribution() {
    const container = document.getElementById('model-dist-chart');
    if (!container) return;
    
    const byModel = this.data.byModel || {};
    this.charts.renderPieChart(byModel, { container });
  }

  /**
   * Render hourly heatmap
   */
  renderHeatmap() {
    const container = document.getElementById('heatmap-chart');
    if (!container) return;
    
    const hourly = this.data.hourly || [];
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
    
    const daily = this.data.daily || [];
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
  showLoading(show, message = '載入中...') {
    const loading = document.getElementById('loading');
    const status = document.getElementById('loading-status');
    if (loading) {
      loading.style.display = show ? 'flex' : 'none';
    }
    if (status) {
      status.textContent = message;
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const error = document.getElementById('error-message');
    if (error) {
      error.innerHTML = '';
      const msg = document.createElement('div');
      msg.textContent = message;
      error.appendChild(msg);

      // link to raw token file for troubleshooting
      const rawLink = document.createElement('a');
      rawLink.href = '../token-log.json';
      rawLink.target = '_blank';
      rawLink.style.display = 'block';
      rawLink.style.marginTop = '8px';
      rawLink.style.color = 'white';
      rawLink.textContent = '檢視原始 token-log.json';
      error.appendChild(rawLink);

      const retry = document.createElement('button');
      retry.textContent = '重試';
      retry.className = 'btn btn-primary';
      retry.style.marginTop = '12px';
      retry.addEventListener('click', () => {
        error.style.display = 'none';
        this.refresh();
      });
      error.appendChild(retry);

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

  /**
   * Populate filter dropdowns from loaded data
   */
  populateFilterOptions() {
    const summary = this.data.summary;
    if (!summary) return;

    const apiSelect = document.getElementById('filter-api');
    const modelSelect = document.getElementById('filter-model');
    if (!apiSelect || !modelSelect) return;

    const currentApi = apiSelect.value;
    const currentModel = modelSelect.value;

    // byApi can be either an object (keys = api names) or an array of {api, ...}
    const byApi = summary.byApi || {};
    const apiKeys = Array.isArray(byApi)
      ? byApi.map(item => item.api).filter(Boolean).sort()
      : Object.keys(byApi).sort();

    const byModel = summary.byModel || {};
    const modelKeys = Array.isArray(byModel)
      ? byModel.map(item => item.model).filter(Boolean).sort()
      : Object.keys(byModel).sort();

    // Rebuild API options
    apiSelect.innerHTML = '<option value="">📡 所有 API</option>' +
      apiKeys.map(k => `<option value="${k}"${k === currentApi ? ' selected' : ''}>${k}</option>`).join('');

    // Rebuild model options
    modelSelect.innerHTML = '<option value="">🤖 所有模型</option>' +
      modelKeys.map(k => `<option value="${k}"${k === currentModel ? ' selected' : ''}>${k}</option>`).join('');
  }

  /**
   * Apply filter state from UI controls and reload records
   */
  applyRecordsFilter() {
    this.recordsFilter.api = document.getElementById('filter-api')?.value || '';
    this.recordsFilter.model = document.getElementById('filter-model')?.value || '';
    this.recordsFilter.keyName = document.getElementById('filter-key')?.value.trim() || '';
    this.recordsPage = 0;
    this.renderRecordsTable();
  }

  /**
   * Clear all record filters
   */
  clearRecordsFilter() {
    this.recordsFilter = { api: '', model: '', keyName: '' };
    this.recordsPage = 0;
    const filterKey = document.getElementById('filter-key');
    const filterApi = document.getElementById('filter-api');
    const filterModel = document.getElementById('filter-model');
    if (filterKey) filterKey.value = '';
    if (filterApi) filterApi.value = '';
    if (filterModel) filterModel.value = '';
    this.renderRecordsTable();
  }

  /**
   * Navigate to a specific records page
   */
  goToPage(page) {
    const maxPage = Math.max(0, Math.ceil(this.recordsTotal / this.recordsLimit) - 1);
    this.recordsPage = Math.max(0, Math.min(page, maxPage));
    this.renderRecordsTable();
  }

  /**
   * Get CSS class for API type badge
   */
  getApiBadgeClass(api) {
    if (!api) return 'api-badge-other';
    if (api.includes('cache-read')) return 'api-badge-cache-read';
    if (api.includes('cache-create')) return 'api-badge-cache-create';
    if (api.includes('chatcompletion')) return 'api-badge-chat';
    if (api.includes('vlm') || api.includes('image')) return 'api-badge-vlm';
    return 'api-badge-other';
  }

  /**
   * Format a datetime string for display
   */
  formatDateTime(iso) {
    if (!iso) return '-';
    // Handle range format: "2026-03-27 20:00-21:00"
    if (!iso.includes('T')) {
      // Extract date and start time from "YYYY-MM-DD HH:MM-HH:MM"
      const spaceIdx = iso.indexOf(' ');
      if (spaceIdx > 0) {
        const datePart = iso.slice(0, spaceIdx);
        const timePart = iso.slice(spaceIdx + 1).split('-')[0]; // take start time
        return `${datePart} ${timePart}`;
      }
      return iso;
    }
    // Handle ISO format
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /**
   * Render the records table with current page and filters
   */
  async renderRecordsTable() {
    const tbody = document.getElementById('records-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:var(--token-text-muted);">載入記錄中...</td></tr>';

    try {
      const result = await this.api.getRecords({
        limit: this.recordsLimit,
        offset: this.recordsPage * this.recordsLimit,
        startDate: this.dateRange.startDate,
        endDate: this.dateRange.endDate,
        api: this.recordsFilter.api || undefined,
        model: this.recordsFilter.model || undefined,
        keyName: this.recordsFilter.keyName || undefined
      });

      this.recordsTotal = result.total;
      const records = result.records;
      const startNum = result.offset + 1;

      if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:var(--token-text-muted);">找不到符合條件的記錄</td></tr>';
      } else {
        tbody.innerHTML = records.map((r, i) => {
          const rowNum = startNum + i;
          const apiBadgeClass = this.getApiBadgeClass(r.consumedApi);
          const statusClass = (r.consumptionStatus || '').toUpperCase() === 'SUCCESS'
            ? 'status-badge-success' : 'status-badge-failed';
          const statusText = (r.consumptionStatus || '').toUpperCase() === 'SUCCESS' ? '✓ 成功' : '✗ 失敗';

          return `
            <tr data-record-id="${r.id || ''}" tabindex="0" role="row" aria-label="記錄 ${rowNum}">
              <td style="color:var(--token-text-muted);font-size:12px;">${rowNum}</td>
              <td><span class="record-time">${this.formatDateTime(r.consumptionTime)}</span></td>
              <td><span class="record-key" title="${r.secretKeyName || ''}">${r.secretKeyName || '-'}</span></td>
              <td><span class="api-badge ${apiBadgeClass}" title="${r.consumedApi || ''}">${r.consumedApi || '-'}</span></td>
              <td><span class="record-model" title="${r.consumedModel || ''}">${r.consumedModel || '-'}</span></td>
              <td class="num-col">${this.formatNumber(r.inputUsageQuantity)}</td>
              <td class="num-col">${this.formatNumber(r.outputUsageQuantity)}</td>
              <td class="num-col" style="font-weight:700;">${this.formatNumber(r.totalUsageQuantity)}</td>
              <td><span class="badge ${statusClass}">${statusText}</span></td>
            </tr>
          `;
        }).join('');

        // Attach click/keyboard handlers for detail modal
        tbody.querySelectorAll('tr[data-record-id]').forEach((row, i) => {
          const record = records[i];
          const open = () => this.showRecordDetail(record);
          row.addEventListener('click', open);
          row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
        });
      }

      // Update pagination
      this.updatePaginationControls();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--token-danger);">載入失敗: ${err.message}</td></tr>`;
    }
  }

  /**
   * Update pagination control states and labels
   */
  updatePaginationControls() {
    const totalPages = Math.max(1, Math.ceil(this.recordsTotal / this.recordsLimit));
    const currentPage = this.recordsPage + 1;
    const startNum = this.recordsPage * this.recordsLimit + 1;
    const endNum = Math.min(startNum + this.recordsLimit - 1, this.recordsTotal);

    const info = document.getElementById('records-info');
    if (info) {
      info.textContent = this.recordsTotal > 0
        ? `顯示 ${startNum}–${endNum} / 共 ${this.recordsTotal.toLocaleString()} 條記錄`
        : '無記錄';
    }

    const indicator = document.getElementById('page-indicator');
    if (indicator) {
      indicator.textContent = `第 ${currentPage} / ${totalPages} 頁`;
    }

    const setDisabled = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.disabled = val;
    };

    setDisabled('page-first', this.recordsPage === 0);
    setDisabled('page-prev', this.recordsPage === 0);
    setDisabled('page-next', currentPage >= totalPages);
    setDisabled('page-last', currentPage >= totalPages);
  }

  /**
   * Show the record detail modal
   */
  showRecordDetail(record) {
    const modal = document.getElementById('record-modal');
    const body = document.getElementById('record-modal-body');
    if (!modal || !body) return;

    const apiBadgeClass = this.getApiBadgeClass(record.consumedApi);
    const statusClass = (record.consumptionStatus || '').toUpperCase() === 'SUCCESS'
      ? 'status-badge-success' : 'status-badge-failed';
    const statusText = (record.consumptionStatus || '').toUpperCase() === 'SUCCESS' ? '✓ 成功' : '✗ 失敗';

    body.innerHTML = `
      <div class="record-token-summary">
        <div class="record-token-box">
          <div class="label">⬇ 輸入 Tokens</div>
          <div class="value input-color">${this.formatNumber(record.inputUsageQuantity)}</div>
        </div>
        <div class="record-token-box">
          <div class="label">⬆ 輸出 Tokens</div>
          <div class="value output-color">${this.formatNumber(record.outputUsageQuantity)}</div>
        </div>
        <div class="record-token-box">
          <div class="label">Σ 總計 Tokens</div>
          <div class="value total-color">${this.formatNumber(record.totalUsageQuantity)}</div>
        </div>
      </div>
      <div class="record-detail-grid" style="margin-top:20px;">
        <div class="record-detail-item">
          <div class="record-detail-label">🕐 消費時間</div>
          <div class="record-detail-value">${this.formatDateTime(record.consumptionTime)}</div>
        </div>
        <div class="record-detail-item">
          <div class="record-detail-label">狀態</div>
          <div class="record-detail-value"><span class="badge ${statusClass}">${statusText}</span></div>
        </div>
        <div class="record-detail-item">
          <div class="record-detail-label">📡 API 類型</div>
          <div class="record-detail-value"><span class="api-badge ${apiBadgeClass}">${record.consumedApi || '-'}</span></div>
        </div>
        <div class="record-detail-item">
          <div class="record-detail-label">🤖 模型</div>
          <div class="record-detail-value">${record.consumedModel || '-'}</div>
        </div>
        <div class="record-detail-item">
          <div class="record-detail-label">🔑 API Key</div>
          <div class="record-detail-value">${record.secretKeyName || '-'}</div>
        </div>
        <div class="record-detail-item">
          <div class="record-detail-label">📦 批次</div>
          <div class="record-detail-value">${record.importBatch || '-'}</div>
        </div>
        <div class="record-detail-item">
          <div class="record-detail-label">💰 費用</div>
          <div class="record-detail-value">${record.amountSpent != null ? record.amountSpent : '-'}</div>
        </div>
        <div class="record-detail-item">
          <div class="record-detail-label">💰 折扣後費用</div>
          <div class="record-detail-value">${record.amountAfterVoucher != null ? record.amountAfterVoucher : '-'}</div>
        </div>
        <div class="record-detail-item full-width">
          <div class="record-detail-label">🆔 記錄 ID</div>
          <div class="record-detail-value" style="font-size:13px;font-family:monospace;">${record.id || '-'}</div>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
    document.getElementById('modal-close')?.focus();
  }

  /**
   * Close the record detail modal
   */
  closeRecordModal() {
    const modal = document.getElementById('record-modal');
    if (modal) modal.style.display = 'none';
  }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new TokenDashboard();
  window.dashboard.init();
});
