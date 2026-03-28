/**
 * Phase 11: Token Charts
 * Chart rendering utilities for token dashboard
 */

class TokenCharts {
  /**
   * Format large numbers
   */
  static formatNumber(num) {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  }

  /**
   * Render ASCII line chart for trends
   */
  static renderASCIILineChart(data, options = {}) {
    const { width = 60, height = 15, label = '' } = options;
    
    if (!data || data.length === 0) {
      return 'No data available';
    }
    
    // Extract values
    const values = data.map(d => d.totalTokens || d.tokens || 0);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    
    // Create grid
    const grid = [];
    for (let i = 0; i < height; i++) {
      grid.push(' '.repeat(width));
    }
    
    // Plot points
    const plotPoints = values.map((val, idx) => {
      const x = Math.floor((idx / (values.length - 1)) * (width - 1));
      const y = height - 1 - Math.floor(((val - min) / range) * (height - 1));
      return { x, y, val };
    });
    
    // Draw on grid
    plotPoints.forEach((point, i) => {
      const prev = i > 0 ? plotPoints[i - 1] : point;
      const next = i < plotPoints.length - 1 ? plotPoints[i + 1] : point;
      
      // Draw line between points
      const minX = Math.min(prev.x, point.x);
      const maxX = Math.max(prev.x, point.x);
      
      for (let x = minX; x <= maxX; x++) {
        if (x >= 0 && x < width) {
          const t = (x - prev.x) / (point.x - prev.x || 1);
          const expectedY = Math.round(prev.y + (point.y - prev.y) * t);
          if (expectedY >= 0 && expectedY < height) {
            const row = grid[expectedY];
            grid[expectedY] = row.substring(0, x) + '●' + row.substring(x + 1);
          }
        }
      }
    });
    
    // Add Y-axis labels
    const yLabels = [max, Math.round((max + min) / 2), min];
    yLabels.forEach((val, i) => {
      const y = Math.floor((height / 2) * i);
      if (y < height) {
        const label = TokenCharts.formatNumber(val).padStart(8);
        grid[y] = label + ' │' + grid[y];
      }
    });
    
    // Add X-axis labels
    const xLabels = [0, Math.floor(data.length / 2), data.length - 1];
    xLabels.forEach(idx => {
      if (idx < data.length) {
        const label = data[idx].period?.slice(5) || '';
        const pos = Math.floor((idx / (data.length - 1)) * (width - 8)) + 8;
        if (pos < width) {
          grid[height - 1] = grid[height - 1].substring(0, pos) + label + grid[height - 1].substring(pos + label.length);
        }
      }
    });
    
    return grid.join('\n');
  }

  /**
   * Render distribution as ASCII bar chart
   */
  static renderASCIIDistribution(data) {
    if (!data || Object.keys(data).length === 0) {
      return 'No data available';
    }
    
    const entries = Object.entries(data);
    const maxVal = Math.max(...entries.map(([, d]) => d.tokens || 0));
    const maxWidth = 40;
    
    const lines = entries.map(([name, d]) => {
      const tokens = d.tokens || 0;
      const count = d.count || 0;
      const pct = d.percentage || '0%';
      const barLen = Math.round((tokens / maxVal) * maxWidth);
      const bar = '█'.repeat(barLen) + '░'.repeat(maxWidth - barLen);
      return `${name.padEnd(25)} ${bar} ${TokenCharts.formatNumber(tokens).padStart(8)} (${count}) ${pct}`;
    });
    
    return lines.join('\n');
  }

  /**
   * Render heatmap for hourly distribution
   */
  static renderHeatmap(hourlyData, options = {}) {
    const container = options.container;
    if (!container) return;
    
    // Find max value
    const values = Array.isArray(hourlyData) 
      ? hourlyData.map(h => h.tokens)
      : Object.values(hourlyData);
    const max = Math.max(...values) || 1;
    
    // Color scale
    const colors = [
      '#1E1F22', // 0% - very dark
      '#2C3E50', // 25%
      '#34495E', // 50%
      '#5865F2', // 75%
      '#7289DA', // 90%
      '#57F287'  // 100%
    ];
    
    const getColor = (val) => {
      const ratio = val / max;
      const idx = Math.min(Math.floor(ratio * (colors.length - 1)), colors.length - 1);
      return colors[idx];
    };
    
    // Build HTML
    const hours = Array.isArray(hourlyData) 
      ? hourlyData.map((h, i) => ({ hour: h.hour !== undefined ? h.hour : i, tokens: h.tokens }))
      : Object.entries(hourlyData).map(([h, t]) => ({ hour: parseInt(h), tokens: t }));
    
    // Sort by hour
    hours.sort((a, b) => a.hour - b.hour);
    
    container.innerHTML = hours.map(({ hour, tokens }) => {
      const pct = Math.round((tokens / max) * 100);
      return `
        <div class="heatmap-hour" title="${TokenCharts.formatNumber(tokens)} tokens at ${hour}:00">
          <div class="bar" style="height: ${Math.max(pct, 5)}%; background: ${getColor(tokens)};"></div>
          <span class="label">${hour}</span>
        </div>
      `;
    }).join('');
  }

  /**
   * Render pie chart for distribution
   */
  static renderPieChart(data, options = {}) {
    const container = options.container;
    if (!container || !data) return;
    
    const entries = Object.entries(data);
    const total = entries.reduce((sum, [, d]) => sum + (d.tokens || 0), 0);
    
    if (total === 0) {
      container.innerHTML = '<div class="loading">No data</div>';
      return;
    }
    
    const colors = ['#5865F2', '#57F287', '#FEE75C', '#ED4245', '#7289DA', '#EB459E'];
    let currentDeg = 0;
    
    const segments = entries.map(([name, d], i) => {
      const deg = ((d.tokens || 0) / total) * 360;
      const segment = `
        <div class="distribution-item" style="cursor: pointer;" title="${name}">
          <div class="distribution-color" style="background: ${colors[i % colors.length]};"></div>
          <div class="distribution-info">
            <div class="distribution-name">${name}</div>
            <div class="distribution-value">${TokenCharts.formatNumber(d.tokens || 0)}</div>
            <div class="distribution-percent">${d.percentage || '0%'}</div>
          </div>
        </div>
      `;
      currentDeg += deg;
      return segment;
    });
    
    // Build conic gradient
    let cumulativeDeg = 0;
    const gradientParts = entries.map(([, d], i) => {
      const deg = ((d.tokens || 0) / total) * 360;
      const start = cumulativeDeg;
      cumulativeDeg += deg;
      return `${colors[i % colors.length]} ${start}deg ${cumulativeDeg}deg`;
    });
    
    container.innerHTML = `
      <div style="display: flex; gap: 24px; align-items: center;">
        <div class="css-pie-chart" style="--pct1: ${entries[0] ? ((entries[0][1].tokens || 0) / total) * 100 : 0}; 
                                        --pct2: ${entries[1] ? ((entries[1][1].tokens || 0) / total) * 100 : 0}; 
                                        --pct3: ${entries[2] ? ((entries[2][1].tokens || 0) / total) * 100 : 0}; 
                                        --pct4: ${entries[3] ? ((entries[3][1].tokens || 0) / total) * 100 : 0}; 
                                        background: conic-gradient(${gradientParts.join(', ')});"></div>
        <div class="distribution-grid" style="flex: 1;">
          ${segments.join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render bar chart for daily data
   */
  static renderBarChart(data, options = {}) {
    const container = options.container;
    if (!container) return;
    
    if (!data || data.length === 0) {
      container.innerHTML = '<div class="loading">No data</div>';
      return;
    }
    
    const max = Math.max(...data.map(d => d.tokens || d.totalTokens || 0));
    const barMaxHeight = options.maxHeight || 150;
    
    const bars = data.map(d => {
      const value = d.tokens || d.totalTokens || 0;
      const height = Math.round((value / max) * barMaxHeight);
      const label = d.period?.slice(5) || d.date?.slice(5) || '';
      
      return `
        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
          <div style="height: ${barMaxHeight}px; display: flex; align-items: flex-end; width: 100%;">
            <div class="bar" style="width: 80%; margin: 0 auto; height: ${height}px; 
                 background: linear-gradient(to top, #5865F2, #7289DA); border-radius: 4px 4px 0 0;
                 transition: height 0.3s;" title="${TokenCharts.formatNumber(value)}"></div>
          </div>
          <span style="font-size: 10px; margin-top: 8px; color: var(--token-text-muted);">
            ${label}
          </span>
        </div>
      `;
    }).join('');
    
    container.innerHTML = `<div style="display: flex; gap: 4px; height: ${barMaxHeight + 40}px;">${bars}</div>`;
  }

  /**
   * Render cache efficiency meter
   */
  static renderCacheMeter(hitRate, options = {}) {
    const container = options.container;
    if (!container) return;
    
    const pct = (hitRate * 100).toFixed(1);
    const className = hitRate >= 0.6 ? 'good' : hitRate >= 0.4 ? 'medium' : 'low';
    
    container.innerHTML = `
      <div class="cache-meter">
        <div class="cache-meter-fill ${className}" style="width: ${pct}%;"></div>
        <span class="cache-meter-text">${pct}%</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; color: var(--token-text-muted);">
        <span>Cache Hit Rate</span>
        <span>${className === 'good' ? '🟢 Good' : className === 'medium' ? '🟡 Medium' : '🔴 Low'}</span>
      </div>
    `;
  }
}

// Export for use
window.TokenCharts = TokenCharts;
