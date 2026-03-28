/**
 * Copilot Panel — main controller
 * Design spec: virtual-office/docs/DESIGN-SPEC.md
 *
 * Usage:
 *   const panel = new CopilotPanel('#copilot-panel-root');
 *   panel.init();
 */

class CopilotAPI {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl || '';
    this._quotaCache = null;
    this._analysisCache = null;
    this._quotaTs = 0;
    this._analysisTs = 0;
    this.TTL = 5 * 60 * 1000; // 5 minutes
  }

  async _fetch(path) {
    const res = await fetch(this.baseUrl + path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'API error');
    return json.data;
  }

  async getQuota(force = false) {
    const now = Date.now();
    if (!force && this._quotaCache && (now - this._quotaTs) < this.TTL) {
      return this._quotaCache;
    }
    this._quotaCache = await this._fetch('/api/copilot/quota');
    this._quotaTs = now;
    return this._quotaCache;
  }

  async getAnalysis(force = false) {
    const now = Date.now();
    if (!force && this._analysisCache && (now - this._analysisTs) < this.TTL) {
      return this._analysisCache;
    }
    this._analysisCache = await this._fetch('/api/copilot/analysis');
    this._analysisTs = now;
    return this._analysisCache;
  }
}

/* ─────────────────────────────────────────────────────────── */
/*  Helpers                                                    */
/* ─────────────────────────────────────────────────────────── */

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

function fmtNum(n) {
  if (n === undefined || n === null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtCost(c) {
  if (!c && c !== 0) return '—';
  return `$${c.toFixed(4)}`;
}

const MODEL_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981',
  '#3B82F6', '#EF4444', '#14B8A6', '#F97316', '#84CC16'
];

const FEATURE_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'
];

const FEATURE_LABELS = {
  completions: 'Completions',
  inline_suggestions: 'Inline Suggestions',
  chat: 'Chat',
  prompts: 'Prompts',
  other: 'Other'
};

/* ─────────────────────────────────────────────────────────── */
/*  CopilotGauge — SVG ring                                   */
/* ─────────────────────────────────────────────────────────── */

class CopilotGauge {
  constructor(container) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;
    this.R = 70; // outer radius
    this.CIRCUMFERENCE = 2 * Math.PI * this.R;
    this.SIZE = this.R * 2 + 24; // + padding for stroke
  }

  render(data) {
    const { usedPercent, used, total, remaining, dailyBudget, daysRemaining } = data;
    const pct = clamp(parseFloat(usedPercent) || 0, 0, 100);
    const level = pct >= 95 ? 'danger' : pct >= 80 ? 'warning' : 'normal';
    const offset = this.CIRCUMFERENCE - (pct / 100) * this.CIRCUMFERENCE;

    const size = this.SIZE;
    const cx = this.R + 12;
    const cy = this.R + 12;

    this.container.innerHTML = `
      <div class="copilot-gauge-wrap" role="meter"
           aria-valuenow="${Math.round(pct)}"
           aria-valuemin="0"
           aria-valuemax="100"
           aria-label="Copilot quota usage: ${Math.round(pct)}%">
        <svg class="copilot-gauge-svg" viewBox="0 0 ${size} ${size}"
             width="${size}" height="${size}">
          <circle class="copilot-gauge-track"
                  cx="${cx}" cy="${cy}" r="${this.R}" />
          <circle class="copilot-gauge-fill ${level}"
                  cx="${cx}" cy="${cy}" r="${this.R}"
                  stroke-dasharray="${this.CIRCUMFERENCE}"
                  stroke-dashoffset="${this.CIRCUMFERENCE}"
                  style="stroke-dashoffset:${offset};" />
        </svg>
        <div class="copilot-gauge-center">
          <div class="copilot-gauge-pct" aria-live="polite">0%</div>
          <div class="copilot-gauge-label">已用</div>
        </div>
      </div>
      <div class="copilot-gauge-meta">
        <strong>${fmtNum(remaining)}</strong> 剩餘 ·
        <strong>${daysRemaining}</strong> 天
      </div>
      <div class="copilot-gauge-meta" style="margin-top:2px;">
        每日預算 <strong>${dailyBudget}</strong> tokens
      </div>
      <div class="copilot-warning-banner" id="gauge-warning-banner" aria-live="assertive">
        <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span id="gauge-warning-text"></span>
      </div>
    `;

    // Animate percentage counter
    this._animateCounter(pct, level);
    this._updateWarningBanner(level);
  }

  _animateCounter(targetPct, level) {
    const el = this.container.querySelector('.copilot-gauge-pct');
    if (!el) return;
    const duration = 800;
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = `${Math.round(eased * targetPct)}%`;
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = `${Math.round(targetPct)}%`;
    };
    requestAnimationFrame(tick);
  }

  _updateWarningBanner(level) {
    const banner = this.container.querySelector('#gauge-warning-banner');
    const text = this.container.querySelector('#gauge-warning-text');
    if (!banner || !text) return;
    banner.classList.remove('visible', 'warning', 'danger');
    if (level === 'warning') {
      banner.classList.add('visible', 'warning');
      text.textContent = '配額使用已超過 80% — 建議注意用量';
    } else if (level === 'danger') {
      banner.classList.add('visible', 'danger');
      text.textContent = '⚠️ 配額即將耗盡 — 請立即切換至較小的模型';
    }
  }

  showSkeleton() {
    this.container.innerHTML = `
      <div class="copilot-gauge-wrap">
        <div class="copilot-skeleton" style="width:160px;height:160px;border-radius:50%;"></div>
      </div>
      <div class="copilot-gauge-meta">
        <span class="copilot-skeleton" style="display:inline-block;width:80px;height:14px;border-radius:4px;"></span>
      </div>
    `;
  }
}

/* ─────────────────────────────────────────────────────────── */
/*  Recommendation Card                                       */
/* ─────────────────────────────────────────────────────────── */

function renderRecommendation(container, quota) {
  const rec = quota.recommendation || {};
  const level = quota.warningLevel || 'normal';
  const statusMap = {
    normal: { cls: 'status-normal',  label: '配額充裕', emoji: '🟢' },
    warning: { cls: 'status-warning', label: '注意用量', emoji: '🟡' },
    danger:  { cls: 'status-danger',  label: '配額緊張', emoji: '🔴' }
  };
  const s = statusMap[level] || statusMap.normal;
  const model = rec.suggestedModel || quota.modelPreference || 'auto';

  const el = typeof container === 'string' ? document.querySelector(container) : container;
  el.innerHTML = `
    <div class="copilot-rec-header">
      <span class="copilot-rec-emoji" aria-hidden="true">${s.emoji}</span>
      <span class="copilot-rec-title">${s.label}</span>
    </div>
    <p class="copilot-rec-body">${rec.message || '適當使用 Copilot 配額，避免過度消耗。'}</p>
    <div class="copilot-rec-footer">
      <span class="copilot-model-badge">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        ${model}
      </span>
      <a href="https://docs.github.com/en/copilot/managing-copilot/managing-copilot-at-github-enterprise/getting-started-with-github-copilot-chat"
         target="_blank" rel="noopener" class="copilot-btn-switch">
        切換模型
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>
    </div>
  `;
  el.className = `copilot-rec-card ${s.cls}`;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', `Copilot 狀態: ${s.label}`);
}

/* ─────────────────────────────────────────────────────────── */
/*  Trend Chart — SVG area chart                              */
/* ─────────────────────────────────────────────────────────── */

class CopilotTrendChart {
  constructor(container) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;
    this.tooltip = null;
    this.data = [];
  }

  render(data) {
    this.data = data || [];
    const container = this.container;
    const wrap = container.querySelector('.copilot-trend-chart-wrap') || container;

    if (!this.data.length || this.data.every(d => d.count === 0 && d.premiumCost === 0)) {
      wrap.innerHTML = `<div class="copilot-trend-empty">本週尚無 Copilot 使用記錄</div>`;
      return;
    }

    // Dimensions
    const W = wrap.clientWidth || 600;
    const H = 160;
    const PL = 40; // padding left (Y-axis)
    const PT = 12;
    const PR = 12;
    const PB = 32;
    const chartW = W - PL - PR;
    const chartH = H - PT - PB;

    const values = this.data.map(d => d.count || 0);
    const maxVal = Math.max(...values, 1);
    const minVal = 0;

    // Gridlines
    const gridlines = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
      const y = PT + chartH * (1 - ratio);
      const val = Math.round(minVal + (maxVal - minVal) * ratio);
      return { y, val };
    });

    // Points
    const n = this.data.length;
    const points = this.data.map((d, i) => ({
      x: PL + (n <= 1 ? chartW / 2 : (i / (n - 1)) * chartW),
      y: PT + chartH * (1 - ((d.count || 0) - minVal) / (maxVal - minVal || 1)),
      date: d.date,
      count: d.count,
      cost: d.premiumCost
    }));

    // Build SVG path
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
    const areaPath = linePath
      + ` L ${points[points.length - 1].x.toFixed(2)} ${(PT + chartH).toFixed(2)}`
      + ` L ${points[0].x.toFixed(2)} ${(PT + chartH).toFixed(2)} Z`;

    // X labels
    const xLabels = points.map((p, i) => {
      const date = new Date(p.date);
      const label = `${date.getMonth() + 1}/${date.getDate()}`;
      return `<text x="${p.x}" y="${PT + chartH + 18}"
        text-anchor="middle" font-size="11" fill="var(--copilot-text-muted)"
        font-family="var(--font)">${label}</text>`;
    }).join('');

    // Y labels
    const yLabels = gridlines.map(g => `
      <text x="${PL - 6}" y="${g.y + 4}" text-anchor="end"
        font-size="10" fill="var(--copilot-text-muted)"
        font-family="var(--font)">${fmtNum(g.val)}</text>
    `).join('');

    // SVG grid lines
    const svgGridlines = gridlines.map(g => `
      <line x1="${PL}" y1="${g.y}" x2="${PL + chartW}" y2="${g.y}"
        stroke="var(--copilot-border)" stroke-width="1"
        stroke-dasharray="${g.val === 0 ? 'none' : '3,3'}" />
    `).join('');

    // Invisible hover overlay
    const hoverRects = points.map((p, i) => `
      <rect x="${p.x - chartW / n / 2}" y="${PT}" width="${chartW / n}"
        height="${chartH}" fill="transparent"
        data-index="${i}" class="copilot-trend-hover-zone"
        style="cursor:crosshair;" />
    `).join('');

    // Tooltip
    let tooltipHTML = `<div class="copilot-trend-tooltip" id="trend-tooltip">
      <div class="copilot-trend-tooltip-date"></div>
      <div class="copilot-trend-tooltip-val"></div>
    </div>`;

    wrap.innerHTML = `
      <div style="position:relative; height:${H}px;">
        <svg class="copilot-trend-svg" viewBox="0 0 ${W} ${H}"
             preserveAspectRatio="xMidYMid meet" role="img"
             aria-label="Copilot 7-day usage trend chart">
          <title>Copilot 7-day usage trend</title>
          <desc>Line chart showing daily Copilot usage for the last 7 days</desc>
          ${svgGridlines}
          <path d="${areaPath}" fill="url(#trendGradient)" opacity="0.4" />
          <path d="${linePath}" fill="none" stroke="var(--copilot-chart-1)"
                stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
          ${points.map((p, i) => `
            <circle cx="${p.x}" cy="${p.y}" r="4"
              fill="var(--copilot-bg)" stroke="var(--copilot-chart-1)"
              stroke-width="2" class="copilot-trend-dot"
              data-index="${i}"
              style="cursor:pointer;" />
          `).join('')}
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--copilot-chart-1)" />
              <stop offset="100%" stop-color="var(--copilot-chart-1)" stop-opacity="0" />
            </linearGradient>
          </defs>
          ${xLabels}
          ${yLabels}
          ${hoverRects}
        </svg>
        ${tooltipHTML}
      </div>
    `;

    // Bind hover events
    this._bindHover(points, wrap);
  }

  _bindHover(points, wrap) {
    const tooltip = wrap.querySelector('#trend-tooltip');
    const dots = wrap.querySelectorAll('.copilot-trend-dot');

    const showTip = (idx) => {
      const p = points[idx];
      if (!p) return;
      const svg = wrap.querySelector('svg');
      const rect = svg.getBoundingClientRect();
      const svgW = rect.width;
      const svgH = rect.height;
      const vbW = parseFloat(svg.getAttribute('viewBox').split(' ')[2]);
      const vbH = parseFloat(svg.getAttribute('viewBox').split(' ')[3]);
      const scaleX = svgW / vbW;
      const scaleY = svgH / vbH;

      const tipX = p.x * scaleX;
      const tipY = p.y * scaleY;

      tooltip.querySelector('.copilot-trend-tooltip-date').textContent = p.date;
      tooltip.querySelector('.copilot-trend-tooltip-val').textContent =
        `${fmtNum(p.count)} calls · ${fmtCost(p.cost)}`;

      tooltip.style.left = `${tipX + 10}px`;
      tooltip.style.top = `${tipY - 40}px`;
      tooltip.classList.add('visible');
    };

    const hideTip = () => tooltip.classList.remove('visible');

    dots.forEach((dot, i) => {
      dot.addEventListener('mouseenter', () => showTip(i));
      dot.addEventListener('mouseleave', hideTip);
      dot.addEventListener('focus', () => showTip(i));
      dot.addEventListener('blur', hideTip);
    });

    const zones = wrap.querySelectorAll('.copilot-trend-hover-zone');
    zones.forEach((zone, i) => {
      zone.addEventListener('mouseenter', () => showTip(i));
      zone.addEventListener('mouseleave', hideTip);
    });
  }
}

/* ─────────────────────────────────────────────────────────── */
/*  Model Distribution — horizontal bars                      */
/* ─────────────────────────────────────────────────────────── */

function renderModelDistribution(container, data) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;

  if (!data || Object.keys(data).length === 0) {
    el.innerHTML = `<div class="copilot-dist-empty">尚無模型使用數據</div>`;
    return;
  }

  // Sort by token count desc
  const entries = Object.entries(data)
    .map(([model, stats]) => ({
      model,
      tokens: stats.tokens || 0,
      count: stats.count || 0,
      pct: parseFloat(stats.percentage) || 0
    }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 6); // top 6

  const maxTokens = Math.max(...entries.map(e => e.tokens), 1);

  el.innerHTML = entries.map((e, i) => {
    const barW = (e.tokens / maxTokens) * 100;
    const color = MODEL_COLORS[i % MODEL_COLORS.length];
    return `
      <div class="copilot-model-bar-row"
           title="${e.model}: ${fmtNum(e.tokens)} tokens, ${e.count} calls">
        <span class="copilot-model-name" aria-label="模型: ${e.model}">${e.model}</span>
        <div class="copilot-model-bar-wrap">
          <div class="copilot-model-bar" role="meter"
               aria-label="${e.model}: ${e.pct.toFixed(1)}%"
               style="width:0%;background:${color};"
               data-target-width="${barW}"></div>
        </div>
        <span class="copilot-model-pct">${e.pct.toFixed(0)}%</span>
        <span class="copilot-model-count">${fmtNum(e.count)}</span>
      </div>
    `;
  }).join('');

  // Animate bars in
  requestAnimationFrame(() => {
    el.querySelectorAll('.copilot-model-bar').forEach((bar, i) => {
      setTimeout(() => {
        bar.style.width = bar.dataset.targetWidth + '%';
      }, i * 60);
    });
  });
}

/* ─────────────────────────────────────────────────────────── */
/*  Feature Distribution — donut chart                       */
/* ─────────────────────────────────────────────────────────── */

class CopilotDonut {
  constructor(container) {
    this.container = typeof container === 'string'
      ? document.querySelector(container) : container;
    this.data = [];
  }

  render(data) {
    this.data = data || {};
    const entries = Object.entries(this.data)
      .map(([key, stats]) => ({
        key,
        label: FEATURE_LABELS[key] || key,
        count: stats.count || 0,
        tokens: stats.tokens || 0,
        color: FEATURE_COLORS[Object.keys(this.data).indexOf(key) % FEATURE_COLORS.length]
      }))
      .filter(e => e.count > 0)
      .sort((a, b) => b.count - a.count);

    const total = entries.reduce((s, e) => s + e.count, 0);

    if (!entries.length) {
      this.container.innerHTML = `<div class="copilot-dist-empty">尚無功能使用數據</div>`;
      return;
    }

    const R = 50;
    const r = 32;
    const cx = 60;
    const cy = 60;
    const circumference = 2 * Math.PI * R;

    let cumulativeDeg = 0;
    const segments = entries.map(e => {
      const deg = (e.count / total) * 360;
      const start = cumulativeDeg;
      cumulativeDeg += deg;
      const strokeDasharray = `${(deg / 360) * circumference} ${circumference}`;
      const strokeDashoffset = -(start / 360) * circumference;
      const seg = `
        <circle class="copilot-donut-segment" cx="${cx}" cy="${cy}" r="${R}"
          fill="none" stroke="${e.color}" stroke-width="18"
          stroke-dasharray="${strokeDasharray}"
          stroke-dashoffset="${strokeDashoffset}"
          data-label="${e.label}" data-count="${e.count}"
          role="button" tabindex="0"
          aria-label="${e.label}: ${e.count} calls (${((e.count/total)*100).toFixed(0)}%)" />
      `;
      return seg;
    }).join('');

    this.container.innerHTML = `
      <div class="copilot-donut-wrap">
        <div style="position:relative;flex-shrink:0;">
          <svg class="copilot-donut-svg" viewBox="0 0 120 120" role="img"
               aria-label="Copilot feature usage donut chart">
            <title>Feature distribution</title>
            ${segments}
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--copilot-surface)" />
            <text class="copilot-donut-center-text" x="${cx}" y="${cy + 5}"
              text-anchor="middle" dominant-baseline="middle">${fmtNum(total)}</text>
            <text class="copilot-donut-center-sub" x="${cx}" y="${cy + 18}"
              text-anchor="middle">calls</text>
          </svg>
        </div>
        <div class="copilot-donut-legend" role="list" aria-label="Feature legend">
          ${entries.map(e => `
            <div class="copilot-donut-legend-item" role="listitem"
                 title="${e.label}: ${e.count} calls">
              <span class="copilot-donut-legend-dot" style="background:${e.color};"
                    aria-hidden="true"></span>
              <span class="copilot-donut-legend-label">${e.label}</span>
              <span class="copilot-donut-legend-value">${fmtNum(e.count)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

/* ─────────────────────────────────────────────────────────── */
/*  Usage Summary — animate-on-mount stat cells              */
/* ─────────────────────────────────────────────────────────── */

function renderUsageSummary(container, analysis) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  const summary = analysis?.summary || {};

  const cells = [
    {
      label: '今日',
      count: summary.today?.count || 0,
      sub: fmtCost(summary.today?.premiumCost)
    },
    {
      label: '本週',
      count: summary.week?.count || 0,
      sub: fmtCost(summary.week?.premiumCost)
    },
    {
      label: '總計',
      count: summary.total?.count || 0,
      sub: fmtCost(summary.total?.premiumCost)
    }
  ];

  el.innerHTML = `
    <div class="copilot-summary-row" role="region" aria-label="Usage summary">
      ${cells.map(c => `
        <div class="copilot-summary-cell">
          <div class="copilot-summary-label">${c.label}</div>
          <div class="copilot-summary-value" aria-live="polite">0</div>
          <div class="copilot-summary-sub">${c.sub}</div>
        </div>
      `).join('')}
    </div>
  `;

  // Animate counts
  el.querySelectorAll('.copilot-summary-value').forEach((el, i) => {
    const target = cells[i].count;
    _animateCount(el, target);
  });
}

function _animateCount(el, target) {
  const duration = 600;
  const start = performance.now();
  const tick = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = fmtNum(Math.round(eased * target));
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = fmtNum(target);
  };
  requestAnimationFrame(tick);
}

/* ─────────────────────────────────────────────────────────── */
/*  CopilotPanel — main orchestrator                          */
/* ─────────────────────────────────────────────────────────── */

class CopilotPanel {
  /**
   * @param {string|Element} root - CSS selector or DOM element
   */
  constructor(root) {
    this.root = typeof root === 'string' ? document.querySelector(root) : root;
    this.api = new CopilotAPI();
    this._refreshTimer = null;
    this.gauge = null;
    this.trendChart = null;
    this.donut = null;
  }

  async init() {
    this._renderShell();
    this._bindControls();
    await this.refresh();
    this._startAutoRefresh();
  }

  _renderShell() {
    this.root.innerHTML = `
      <!-- Header -->
      <div class="copilot-header">
        <div class="copilot-title">
          <div class="copilot-title-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path d="M12 6v6l4 2"/></svg>
          </div>
          Copilot 使用面板
        </div>
        <div class="copilot-header-actions">
          <button class="copilot-btn copilot-btn-refresh"
                  id="cp-refresh-btn"
                  aria-label="重新整理 Copilot 數據">
            <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            重新整理
          </button>
        </div>
      </div>

      <!-- Top row: Gauge + Recommendation -->
      <div class="copilot-top-row">
        <div class="copilot-gauge-card" id="cp-gauge-card" aria-label="配額使用量">
          <!-- Gauge rendered here -->
        </div>
        <div class="copilot-rec-card status-normal" id="cp-rec-card" role="status">
          <!-- Recommendation rendered here -->
        </div>
      </div>

      <!-- 7-Day Trend -->
      <div class="copilot-section">
        <div class="copilot-section-title">
          <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          7 天趨勢
        </div>
        <div class="copilot-trend-card">
          <div class="copilot-trend-header">
            <div class="copilot-trend-legend">
              <div class="copilot-trend-legend-item">
                <div class="copilot-trend-legend-dot" style="background:var(--copilot-chart-1);"></div>
                <span>使用次數</span>
              </div>
            </div>
          </div>
          <div class="copilot-trend-chart-wrap" id="cp-trend-wrap">
            <!-- Trend chart rendered here -->
          </div>
        </div>
      </div>

      <!-- Model + Feature Distribution -->
      <div class="copilot-two-col" style="margin-bottom:24px;">
        <div>
          <div class="copilot-section-title">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            模型分佈
          </div>
          <div class="copilot-dist-card" id="cp-model-dist">
            <!-- Model bars rendered here -->
          </div>
        </div>
        <div>
          <div class="copilot-section-title">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
            功能分佈
          </div>
          <div class="copilot-dist-card" id="cp-feature-dist">
            <!-- Donut rendered here -->
          </div>
        </div>
      </div>

      <!-- Usage Summary -->
      <div class="copilot-section">
        <div class="copilot-section-title">
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          使用摘要
        </div>
        <div id="cp-usage-summary">
          <!-- Summary cells rendered here -->
        </div>
      </div>

      <!-- Footer -->
      <div class="copilot-footer">
        <span class="copilot-footer-time" id="cp-last-updated">—</span>
        <a href="http://localhost:5678" target="_blank" rel="noopener"
           class="copilot-automate-link"
           aria-label="在 n8n 中自動化 Copilot 工作流程">
          <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          n8n 自動化
        </a>
      </div>
    `;

    // Init sub-components
    this.gauge = new CopilotGauge('#cp-gauge-card');
    this.trendChart = new CopilotTrendChart('#cp-trend-wrap');
    this.donut = new CopilotDonut('#cp-feature-dist');
  }

  _bindControls() {
    const btn = document.getElementById('cp-refresh-btn');
    if (btn) {
      btn.addEventListener('click', () => this._onRefreshClick());
    }
  }

  async _onRefreshClick() {
    const btn = document.getElementById('cp-refresh-btn');
    if (btn) btn.classList.add('copilot-btn-refreshing');
    await this.refresh(force(true));
    if (btn) btn.classList.remove('copilot-btn-refreshing');
  }

  force(val) { return val; }

  async refresh(force = false) {
    try {
      const [quota, analysis] = await Promise.all([
        this.api.getQuota(force),
        this.api.getAnalysis(force)
      ]);

      // 1. Quota gauge
      this.gauge.render(quota);

      // 2. Recommendation
      renderRecommendation('#cp-rec-card', quota);

      // 3. 7-day trend
      this.trendChart.render(analysis?.trend7Days || []);

      // 4. Model distribution
      renderModelDistribution('#cp-model-dist', analysis?.modelDistribution || {});

      // 5. Feature donut
      this.donut.render(analysis?.featureDistribution || {});

      // 6. Usage summary
      renderUsageSummary('#cp-usage-summary', analysis);

      // 7. Last updated
      const now = new Date();
      const ts = now.toLocaleString('zh-HK', {
        month: 'numeric', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      const el = document.getElementById('cp-last-updated');
      if (el) el.textContent = `更新於 ${ts}`;

    } catch (err) {
      console.error('[CopilotPanel] refresh error:', err);
      this._showError(err.message);
    }
  }

  _showError(msg) {
    this.root.innerHTML = `
      <div class="copilot-error" role="alert">
        <span class="copilot-error-icon">⚠️</span>
        <p class="copilot-error-msg">載入失敗：${msg}</p>
        <button class="copilot-btn copilot-btn-switch" onclick="location.reload()">
          重試
        </button>
      </div>
    `;
  }

  _startAutoRefresh() {
    this._refreshTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.refresh();
      }
    }, 5 * 60 * 1000);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.refresh(); // fresh data when tab becomes visible
      }
    });
  }

  destroy() {
    if (this._refreshTimer) clearInterval(this._refreshTimer);
  }
}

// Export
window.CopilotPanel = CopilotPanel;
window.CopilotAPI = CopilotAPI;
