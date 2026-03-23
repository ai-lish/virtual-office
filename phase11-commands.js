/**
 * Phase 11: Discord Commands
 * Discord command handlers for token analysis
 */

const { TokenAnalyzer } = require('./phase11-analyzer');

/**
 * Format large numbers
 */
function formatNumber(num) {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toLocaleString();
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-HK', {
    timeZone: 'Asia/Hong_Kong',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Get token commands help
 */
function getTokenHelp() {
  return {
    title: '🤖 AI Token 分析命令',
    fields: [
      { name: '`!token summary`', value: '顯示 Token 使用摘要', inline: false },
      { name: '`!token trends [天數]`', value: '顯示使用趨勢（默認7天）', inline: false },
      { name: '`!token by-api`', value: '按 API 類型分佈', inline: false },
      { name: '`!token by-model`', value: '按 Model 分佈', inline: false },
      { name: '`!token cache`', value: 'Cache 命中率分析', inline: false },
      { name: '`!token vlm`', value: 'VLM 圖像使用統計', inline: false },
      { name: '`!token daily [YYYY-MM-DD]`', value: '指定日期的詳細數據', inline: false },
      { name: '`!token import`', value: '手動觸發 CSV 導入', inline: false },
      { name: '`!token report`', value: '生成每日報告', inline: false },
      { name: '`!token help`', value: '顯示此幫助', inline: false }
    ],
    footer: '時間範圍: 使用 startDate/endDate 參數過濾'
  };
}

/**
 * Get summary embed
 */
async function getSummaryEmbed(analyzer) {
  const summary = analyzer.getSummary();
  
  return {
    title: '📊 Token 使用摘要',
    fields: [
      { name: '📈 總用量', value: `${formatNumber(summary.metrics.totalTokens)} tokens`, inline: true },
      { name: '📥 Input', value: formatNumber(summary.metrics.totalInputTokens), inline: true },
      { name: '📤 Output', value: formatNumber(summary.metrics.totalOutputTokens), inline: true },
      { name: '🔢 總記錄', value: `${formatNumber(summary.totalRecords)} 條`, inline: true },
      { name: '⚡ Cache 命中率', value: summary.cache.hitRatePercentage, inline: true },
      { name: '📅 數據範圍', value: `${summary.dateRange.start} 至 ${summary.dateRange.end}`, inline: false }
    ],
    footer: `最後更新: ${new Date().toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong' })}`
  };
}

/**
 * Get trends embed
 */
async function getTrendsEmbed(analyzer, days = 7) {
  const records = analyzer.getRecords();
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  
  const filtered = records.filter(r => new Date(r.consumptionTime) >= cutoff);
  const trends = analyzer.getTrends(filtered, 'daily');
  
  // Take last N days
  const recent = trends.slice(-days);
  
  if (recent.length === 0) {
    return {
      title: '📈 Token 趨勢',
      description: '最近沒有數據',
      footer: '沒有可用數據'
    };
  }
  
  // Format as text chart
  const values = recent.map(t => t.totalTokens);
  const max = Math.max(...values);
  const min = Math.min(...values);
  
  const chartLines = recent.map(t => {
    const bars = Math.round(((t.totalTokens - min) / (max - min || 1)) * 10);
    return `${formatDate(t.period)} │ ${'█'.repeat(bars)}${'░'.repeat(10 - bars)} │ ${formatNumber(t.totalTokens)}`;
  }).join('\n');
  
  return {
    title: `📈 Token 趨勢 (近${days}天)`,
    description: `\`\`\`\n${chartLines}\n\`\`\``,
    fields: [
      { name: '平均每日', value: formatNumber(Math.round(values.reduce((a, b) => a + b, 0) / values.length)), inline: true },
      { name: '最高', value: formatNumber(max), inline: true },
      { name: '最低', value: formatNumber(min), inline: true }
    ],
    footer: `共 ${recent.length} 天有數據`
  };
}

/**
 * Get API distribution embed
 */
async function getApiDistEmbed(analyzer) {
  const records = analyzer.getRecords();
  const dist = analyzer.getApiDistribution(records);
  const total = Object.values(dist).reduce((sum, d) => sum + d.tokens, 0);
  
  if (Object.keys(dist).length === 0) {
    return { title: '🔗 API 分佈', description: '沒有可用數據' };
  }
  
  const lines = Object.entries(dist)
    .sort((a, b) => b[1].tokens - a[1].tokens)
    .map(([api, data]) => {
      const pct = data.percentage || '0%';
      return `**${api}**\n  Tokens: ${formatNumber(data.tokens)} (${pct})\n  調用: ${data.count} 次`;
    });
  
  return {
    title: '🔗 API 類型分佈',
    description: lines.join('\n\n'),
    footer: `總計: ${formatNumber(total)} tokens`
  };
}

/**
 * Get Model distribution embed
 */
async function getModelDistEmbed(analyzer) {
  const records = analyzer.getRecords();
  const dist = analyzer.getModelDistribution(records);
  const total = Object.values(dist).reduce((sum, d) => sum + d.tokens, 0);
  
  if (Object.keys(dist).length === 0) {
    return { title: '🤖 Model 分佈', description: '沒有可用數據' };
  }
  
  // Build visual bar
  const lines = Object.entries(dist)
    .sort((a, b) => b[1].tokens - a[1].tokens)
    .map(([model, data]) => {
      const pct = parseFloat(data.percentage) || 0;
      const bars = Math.round(pct / 5);
      return `**${model}**\n  ${'█'.repeat(bars)}${'░'.repeat(20 - bars)} ${data.percentage}\n  ${formatNumber(data.tokens)} tokens`;
    });
  
  return {
    title: '🤖 Model 分佈',
    description: lines.join('\n\n'),
    footer: `總計: ${formatNumber(total)} tokens`
  };
}

/**
 * Get cache efficiency embed
 */
async function getCacheEfficiencyEmbed(analyzer) {
  const records = analyzer.getRecords();
  const cache = analyzer.calculateCacheHitRate(records);
  const ioRatio = analyzer.calculateInputOutputRatio(records);
  
  const hitRateColor = cache.hitRate >= 0.6 ? '🟢' : cache.hitRate >= 0.4 ? '🟡' : '🔴';
  
  return {
    title: '💾 Cache 效率分析',
    fields: [
      { name: '⚡ 命中率', value: `${hitRateColor} ${cache.hitRatePercentage}`, inline: true },
      { name: '📖 Cache Read', value: formatNumber(cache.cacheRead), inline: true },
      { name: '✍️ Cache Create', value: formatNumber(cache.cacheCreate), inline: true },
      { name: '💰 節省 Tokens', value: formatNumber(cache.savingsTokens), inline: true },
      { name: '📊 Input/Output 比', value: ioRatio.ratio, inline: true }
    ],
    footer: 'Cache 命中率 = Read / (Read + Create)'
  };
}

/**
 * Get VLM usage embed
 */
async function getVLMEmbed(analyzer) {
  const vlm = analyzer.analyzeVLMUsage();
  
  if (vlm.totalCalls === 0) {
    return {
      title: '🖼️ VLM 使用統計',
      description: '目前沒有 VLM 使用記錄'
    };
  }
  
  // Hourly distribution as text
  const hourly = Object.entries(vlm.hourlyDistribution || {})
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => a.hour - b.hour);
  
  const peakIdx = hourly.reduce((max, h, idx) => h.count > hourly[max].count ? idx : max, 0);
  
  return {
    title: '🖼️ VLM (Vision Language Model) 使用統計',
    fields: [
      { name: '🔢 總調用', value: `${vlm.totalCalls} 次`, inline: true },
      { name: '📊 總 Tokens', value: formatNumber(vlm.totalTokens), inline: true },
      { name: '📈 平均/次', value: formatNumber(vlm.avgTokensPerCall), inline: true },
      { name: '⏰ 峰值時段', value: `${vlm.peakHour}:00 (${vlm.peakHourCount} 次)`, inline: true },
      { name: '📅 首次使用', value: vlm.firstUse ? formatDate(vlm.firstUse) : 'N/A', inline: true },
      { name: '📅 最近使用', value: vlm.lastUse ? formatDate(vlm.lastUse) : 'N/A', inline: true }
    ],
    footer: 'VLM 主要用於圖像分析任務'
  };
}

/**
 * Get daily summary embed
 */
async function getDailyEmbed(analyzer, date) {
  const data = analyzer.loadData();
  const dailySummary = data.dailySummary;
  
  const targetDate = date || new Date().toISOString().slice(0, 10);
  const summary = dailySummary[targetDate];
  
  if (!summary) {
    return {
      title: `📅 ${targetDate} 數據`,
      description: '沒有這天的數據'
    };
  }
  
  return {
    title: `📅 ${targetDate} 每日摘要`,
    fields: [
      { name: '📊 總 Tokens', value: formatNumber(summary.metrics.totalTokens), inline: true },
      { name: '📥 Input', value: formatNumber(summary.metrics.totalInputTokens), inline: true },
      { name: '📤 Output', value: formatNumber(summary.metrics.totalOutputTokens), inline: true },
      { name: '🔢 API 調用', value: `${summary.metrics.recordCount} 次`, inline: true },
      { name: '⚡ Cache 命中率', value: summary.cache.hitRatePercentage, inline: true }
    ],
    footer: '數據每日更新'
  };
}

/**
 * Handle !token command
 */
async function handleTokenCommand(message, args) {
  const analyzer = new TokenAnalyzer();
  const subcommand = args[0]?.toLowerCase();
  
  try {
    let embed;
    
    switch (subcommand) {
      case 'summary':
      case undefined:
        embed = await getSummaryEmbed(analyzer);
        break;
        
      case 'trends':
      case 'trend':
        const days = parseInt(args[1]) || 7;
        embed = await getTrendsEmbed(analyzer, days);
        break;
        
      case 'by-api':
      case 'api':
        embed = await getApiDistEmbed(analyzer);
        break;
        
      case 'by-model':
      case 'model':
        embed = await getModelDistEmbed(analyzer);
        break;
        
      case 'cache':
      case 'cache-efficiency':
        embed = await getCacheEfficiencyEmbed(analyzer);
        break;
        
      case 'vlm':
        embed = await getVLMEmbed(analyzer);
        break;
        
      case 'daily':
        const date = args[1] || new Date().toISOString().slice(0, 10);
        embed = await getDailyEmbed(analyzer, date);
        break;
        
      case 'help':
      default:
        embed = getTokenHelp();
        break;
    }
    
    // Send embed
    if (message) {
      await message.reply({
        embeds: [{
          title: embed.title,
          description: embed.description,
          fields: embed.fields,
          footer: embed.footer ? { text: embed.footer } : undefined,
          color: 0x5865F2,
          timestamp: new Date()
        }]
      });
    }
    
    return embed;
    
  } catch (error) {
    console.error('Token command error:', error);
    if (message) {
      await message.reply('❌ 命令執行失敗: ' + error.message);
    }
    return null;
  }
}

/**
 * Handle !token import command (admin only)
 */
async function handleTokenImport(message, discordClient) {
  if (!message) return;
  
  try {
    await message.reply('🔄 正在導入 CSV 數據...');
    
    const { updateTokenLog, rebuildSummaries } = require('./phase11-cron');
    
    // Run import
    const importResult = await updateTokenLog();
    
    // Rebuild summaries
    const summaryResult = await rebuildSummaries();
    
    await message.reply({
      embeds: [{
        title: '✅ CSV 導入完成',
        description: `成功導入 ${importResult.added} 條新記錄`,
        fields: [
          { name: '新增', value: `${importResult.added}`, inline: true },
          { name: '跳過', value: `${importResult.skipped}`, inline: true },
          { name: '總計', value: `${importResult.total}`, inline: true },
          { name: '每日摘要', value: `${summaryResult.daily} 天`, inline: false }
        ],
        color: 0x57F287,
        timestamp: new Date()
      }]
    });
    
  } catch (error) {
    console.error('Import error:', error);
    await message.reply('❌ 導入失敗: ' + error.message);
  }
}

/**
 * Handle !token report command
 */
async function handleTokenReport(message, discordClient) {
  try {
    const { sendDailyReport } = require('./phase11-cron');
    
    const report = await sendDailyReport(discordClient);
    
    if (!report) {
      await message.reply('⚠️ 今天沒有數據');
      return;
    }
    
    await message.reply({
      embeds: [{
        title: report.title,
        fields: report.fields,
        footer: report.footer ? { text: report.footer } : undefined,
        color: 0x5865F2,
        timestamp: new Date()
      }]
    });
    
  } catch (error) {
    console.error('Report error:', error);
    await message.reply('❌ 報告生成失敗: ' + error.message);
  }
}

module.exports = {
  handleTokenCommand,
  handleTokenImport,
  handleTokenReport,
  getTokenHelp
};
