/**
 * Phase 11: Token Analysis Cron Jobs
 * Automated tasks for token data management
 */

const fs = require('fs');
const path = require('path');
const { MinimaxCsvImporter } = require('./phase11-csv-importer');
const { TokenAnalyzer } = require('./phase11-analyzer');

const TOKEN_LOG_PATH = path.join(__dirname, 'token-log.json');

/**
 * Update token log data
 */
async function updateTokenLog() {
  const importer = new MinimaxCsvImporter();
  const result = await importer.run();
  return result;
}

/**
 * Rebuild all summaries
 */
async function rebuildSummaries() {
  const analyzer = new TokenAnalyzer();
  const data = analyzer.loadData();
  
  console.log('Rebuilding daily summaries...');
  const daily = analyzer.buildDailySummaries();
  data.dailySummary = daily;
  
  console.log('Rebuilding weekly summaries...');
  const weekly = analyzer.buildWeeklySummary();
  if (weekly) {
    data.weeklySummary = weekly;
  }
  
  console.log('Rebuilding monthly summaries...');
  const monthly = analyzer.buildMonthlySummary();
  if (monthly) {
    data.monthlySummary = monthly;
  }
  
  console.log('Rebuilding VLM usage...');
  const vlm = analyzer.analyzeVLMUsage();
  data.vlmUsage = {
    'coding-plan-vlm': {
      totalCalls: vlm.totalCalls,
      totalTokens: vlm.totalTokens,
      avgTokensPerCall: vlm.avgTokensPerCall,
      firstUse: vlm.firstUse,
      lastUse: vlm.lastUse,
      dailyBreakdown: vlm.dailyBreakdown.reduce((acc, d) => {
        acc[d.date] = { calls: d.calls, tokens: d.tokens };
        return acc;
      }, {})
    }
  };
  
  data.meta.lastUpdated = new Date().toISOString();
  
  fs.writeFileSync(TOKEN_LOG_PATH, JSON.stringify(data, null, 2));
  console.log('Summaries rebuilt successfully');
  
  return { daily: Object.keys(daily).length };
}

/**
 * Send daily report to Discord
 */
async function sendDailyReport(discordClient = null) {
  const analyzer = new TokenAnalyzer();
  const data = analyzer.loadData();
  
  // Get today's summary
  const today = new Date().toISOString().slice(0, 10);
  const todaySummary = data.dailySummary[today];
  
  if (!todaySummary) {
    console.log('No data for today, skipping report');
    return null;
  }
  
  // Get comparison with yesterday
  const comparison = analyzer.compareToPreviousPeriod();
  
  // Format report
  const report = {
    title: `📊 Minimax Token 每日報告 - ${today}`,
    fields: [
      {
        name: '📈 總用量',
        value: `${formatNumber(todaySummary.metrics.totalTokens)} tokens`,
        inline: true
      },
      {
        name: '📥 Input',
        value: formatNumber(todaySummary.metrics.totalInputTokens),
        inline: true
      },
      {
        name: '📤 Output',
        value: formatNumber(todaySummary.metrics.totalOutputTokens),
        inline: true
      },
      {
        name: '🔢 API 調用',
        value: `${todaySummary.metrics.recordCount} 次`,
        inline: true
      },
      {
        name: '⚡ Cache 命中率',
        value: todaySummary.cache.hitRatePercentage,
        inline: true
      },
      {
        name: '📅 vs 昨日',
        value: `${comparison.changePercent > 0 ? '+' : ''}${comparison.changePercent}%`,
        inline: true
      }
    ],
    footer: `報告生成時間: ${new Date().toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong' })}`
  };
  
  // Model breakdown
  const modelLines = Object.entries(todaySummary.byModel || {})
    .map(([model, data]) => `${model}: ${formatNumber(data.tokens)}`)
    .join('\n');
  
  if (modelLines) {
    report.fields.push({
      name: '🤖 Model 分佈',
      value: modelLines.substring(0, 1024),
      inline: false
    });
  }
  
  // If Discord client is available, send to configured channel
  if (discordClient && process.env.DISCORD_REPORT_CHANNEL_ID) {
    const channel = await discordClient.channels.fetch(process.env.DISCORD_REPORT_CHANNEL_ID);
    if (channel) {
      await channel.send({
        embeds: [{
          title: report.title,
          fields: report.fields,
          footer: { text: report.footer },
          color: 0x5865F2,
          timestamp: new Date()
        }]
      });
    }
  }
  
  return report;
}

/**
 * Send weekly report
 */
async function sendWeeklyReport(discordClient = null) {
  const analyzer = new TokenAnalyzer();
  const weekly = analyzer.buildWeeklySummary();
  
  if (!weekly) {
    console.log('No data for current week, skipping report');
    return null;
  }
  
  const report = {
    title: `📊 Minimax Token 每週報告 - ${weekly.weekStart} 至 ${weekly.weekEnd}`,
    fields: [
      {
        name: '📈 總用量',
        value: `${formatNumber(weekly.metrics.totalTokens)} tokens`,
        inline: true
      },
      {
        name: '📊 平均每日',
        value: formatNumber(weekly.metrics.avgDailyTokens),
        inline: true
      },
      {
        name: '🏆 峰值日',
        value: `${weekly.metrics.peakDay}: ${formatNumber(weekly.metrics.peakDayTokens)}`,
        inline: true
      },
      {
        name: '⚡ Cache 命中率',
        value: `${(weekly.cache.avgHitRate * 100).toFixed(1)}%`,
        inline: true
      },
      {
        name: '💰 節省 Tokens',
        value: formatNumber(weekly.cache.totalSavingsTokens),
        inline: true
      }
    ]
  };
  
  // Daily breakdown
  const dailyLines = weekly.dailyBreakdown
    .map(d => `${d.date}: ${formatNumber(d.totalTokens)}`)
    .join('\n');
  
  if (dailyLines) {
    report.fields.push({
      name: '📅 每日明細',
      value: dailyLines.substring(0, 1024),
      inline: false
    });
  }
  
  // Send to Discord if available
  if (discordClient && process.env.DISCORD_REPORT_CHANNEL_ID) {
    const channel = await discordClient.channels.fetch(process.env.DISCORD_REPORT_CHANNEL_ID);
    if (channel) {
      await channel.send({
        embeds: [{
          title: report.title,
          fields: report.fields,
          color: 0x57F287,
          timestamp: new Date()
        }]
      });
    }
  }
  
  return report;
}

/**
 * Monthly cleanup - archive old data
 */
async function cleanupOldData(options = {}) {
  const { retainMonths = 3 } = options;
  const analyzer = new TokenAnalyzer();
  const data = analyzer.loadData();
  
  const cutoffDate = new Date();
  cutoffDate.setUTCMonth(cutoffDate.getUTCMonth() - retainMonths);
  const cutoffStr = cutoffDate.toISOString();
  
  // Filter records
  const originalCount = data.records.length;
  data.records = data.records.filter(r => r.consumptionTime >= cutoffStr);
  const removedCount = originalCount - data.records.length;
  
  // Remove old daily summaries
  const dailyDates = Object.keys(data.dailySummary);
  dailyDates.forEach(date => {
    if (date < cutoffStr.slice(0, 10)) {
      delete data.dailySummary[date];
    }
  });
  
  data.meta.totalRecords = data.records.length;
  data.meta.lastUpdated = new Date().toISOString();
  
  fs.writeFileSync(TOKEN_LOG_PATH, JSON.stringify(data, null, 2));
  
  console.log(`Cleanup complete: removed ${removedCount} old records`);
  return { removedRecords: removedCount };
}

/**
 * Format large numbers
 */
function formatNumber(num) {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toString();
}

/**
 * Safe execute with error handling
 */
async function safeExecute(task, taskName, notifyFn = null) {
  try {
    const result = await task();
    console.log(`✓ ${taskName} completed successfully`);
    return result;
  } catch (err) {
    console.error(`✗ ${taskName} failed:`, err.message);
    if (notifyFn) {
      await notifyFn(`${taskName} Failed`, err.message);
    }
    return null;
  }
}

/**
 * Run all daily tasks
 */
async function runDailyTasks(discordClient = null) {
  console.log('=== Running Daily Token Tasks ===');
  console.log(`Started at: ${new Date().toISOString()}`);
  
  const results = {};
  
  // 1. Download and import CSV
  results.import = await safeExecute(
    () => updateTokenLog(),
    'CSV Import'
  );
  
  // 2. Rebuild summaries
  results.summaries = await safeExecute(
    () => rebuildSummaries(),
    'Summary Rebuild'
  );
  
  // 3. Send daily report
  if (discordClient) {
    results.report = await safeExecute(
      () => sendDailyReport(discordClient),
      'Daily Report'
    );
  }
  
  console.log('=== Daily Tasks Complete ===');
  console.log('Results:', JSON.stringify(results, null, 2));
  
  return results;
}

/**
 * Run weekly tasks
 */
async function runWeeklyTasks(discordClient = null) {
  console.log('=== Running Weekly Token Tasks ===');
  
  const results = {};
  
  // Rebuild all summaries
  results.summaries = await safeExecute(
    () => rebuildSummaries(),
    'Summary Rebuild'
  );
  
  // Send weekly report
  if (discordClient) {
    results.report = await safeExecute(
      () => sendWeeklyReport(discordClient),
      'Weekly Report'
    );
  }
  
  return results;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const commands = {
    'import': () => updateTokenLog(),
    'summaries': () => rebuildSummaries(),
    'daily-report': () => sendDailyReport(),
    'weekly-report': () => sendWeeklyReport(),
    'cleanup': () => cleanupOldData(),
    'daily': () => runDailyTasks(),
    'weekly': () => runWeeklyTasks()
  };
  
  const cmd = args[0] || 'daily';
  
  if (commands[cmd]) {
    commands[cmd]().then(result => {
      console.log('Done:', result);
      process.exit(0);
    }).catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
  } else {
    console.log('Available commands:', Object.keys(commands).join(', '));
    process.exit(1);
  }
}

module.exports = {
  updateTokenLog,
  rebuildSummaries,
  sendDailyReport,
  sendWeeklyReport,
  cleanupOldData,
  runDailyTasks,
  runWeeklyTasks,
  formatNumber
};
