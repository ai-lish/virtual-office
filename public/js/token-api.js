/**
 * Phase 11: Token API Client
 * JavaScript client for token analysis API
 */

class TokenAPI {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl || '';
  }

  /**
   * Make API request
   */
  async request(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}/api/tokens${endpoint}`, window.location.origin);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, value);
      }
    });
    
    try {
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Get summary statistics
   */
  async getSummary(startDate, endDate) {
    return this.request('/summary', { startDate, endDate });
  }

  /**
   * Get token trends
   */
  async getTrend(period = 'daily', startDate, endDate) {
    return this.request('/trend', { period, startDate, endDate });
  }

  /**
   * Get API distribution
   */
  async getByApi(startDate, endDate) {
    return this.request('/by-api', { startDate, endDate });
  }

  /**
   * Get model distribution
   */
  async getByModel(startDate, endDate) {
    return this.request('/by-model', { startDate, endDate });
  }

  /**
   * Get cache efficiency
   */
  async getCacheEfficiency(startDate, endDate) {
    return this.request('/cache-efficiency', { startDate, endDate });
  }

  /**
   * Get VLM usage
   */
  async getVLM() {
    return this.request('/vlm');
  }

  /**
   * Get daily distribution
   */
  async getDaily(limit = 30, startDate, endDate) {
    return this.request('/daily', { limit, startDate, endDate });
  }

  /**
   * Get hourly distribution
   */
  async getHourly(startDate, endDate) {
    return this.request('/hourly', { startDate, endDate });
  }

  /**
   * Get comparison data
   */
  async getCompare(period = 'daily') {
    return this.request('/compare', { period });
  }

  /**
   * Get weekly summary
   */
  async getWeekly(weekStart) {
    return this.request('/weekly', { weekStart });
  }

  /**
   * Get monthly summary
   */
  async getMonthly(month) {
    return this.request('/monthly', { month });
  }

  /**
   * Get paginated records
   */
  async getRecords(page = 1, limit = 50, startDate, endDate) {
    return this.request('/records', { page, limit, startDate, endDate });
  }

  /**
   * Export data
   */
  async export(format = 'json', startDate, endDate) {
    const url = new URL(`${this.baseUrl}/api/tokens/export`, window.location.origin);
    url.searchParams.append('format', format);
    if (startDate) url.searchParams.append('startDate', startDate);
    if (endDate) url.searchParams.append('endDate', endDate);
    
    window.open(url.toString(), '_blank');
  }
}

// Global instance
window.tokenAPI = new TokenAPI();
