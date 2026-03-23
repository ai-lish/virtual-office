/**
 * Phase 5: AI 功能模塊
 * - AI 任務助手：自動分析項目進度，給出優化建議
 * - 智能日曆整合：自動同步 Google Calendar，顯示今日/明日會議
 * - 項目進度預測：AI 預測項目完成時間，識別潛在延遲風險
 */

const fs = require('fs');
const path = require('path');

// 數據文件路徑
const DATA_DIR = path.join(__dirname);
const PROJECT_DATA_FILE = path.join(DATA_DIR, 'project-records.json');
const PHASE5_DATA_FILE = path.join(DATA_DIR, 'phase5-data.json');

// 默認 Phase 5 數據結構
const DEFAULT_PHASE5_DATA = {
  projectProgress: {},
  predictions: {},
  lastAnalysis: null,
  calendarCache: {
    today: [],
    tomorrow: []
  }
};

/**
 * 加載 Phase 5 數據
 */
function loadPhase5Data() {
  try {
    if (fs.existsSync(PHASE5_DATA_FILE)) {
      return JSON.parse(fs.readFileSync(PHASE5_DATA_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('[Phase5] 加載數據失敗:', e.message);
  }
  return { ...DEFAULT_PHASE5_DATA };
}

/**
 * 保存 Phase 5 數據
 */
function savePhase5Data(data) {
  try {
    fs.writeFileSync(PHASE5_DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error('[Phase5] 保存數據失敗:', e.message);
    return false;
  }
}

/**
 * 加載項目記錄
 */
function loadProjectRecords() {
  try {
    if (fs.existsSync(PROJECT_DATA_FILE)) {
      return JSON.parse(fs.readFileSync(PROJECT_DATA_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('[Phase5] 加載項目記錄失敗:', e.message);
  }
  return { projects: {} };
}

/**
 * 初始化項目進度數據
 */
function initializeProjectProgress() {
  const records = loadProjectRecords();
  const phase5Data = loadPhase5Data();
  
  for (const [projectName, project] of Object.entries(records.projects)) {
    if (!phase5Data.projectProgress[projectName]) {
      phase5Data.projectProgress[projectName] = {
        status: project.status || 'pending',
        progress: project.status === 'completed' ? 100 : 
                  project.status === 'active' ? 50 : 0,
        startDate: new Date().toISOString(),
        estimatedDays: 30,
        actualDays: 0,
        milestones: [],
        risks: [],
        lastUpdate: new Date().toISOString()
      };
    }
  }
  
  savePhase5Data(phase5Data);
  return phase5Data.projectProgress;
}

/**
 * AI 任務助手：分析項目進度，給出優化建議
 */
function analyzeProjectProgress(projectName = null) {
  const phase5Data = loadPhase5Data();
  const records = loadProjectRecords();
  const projects = records.projects;
  
  let analysis = {
    timestamp: new Date().toISOString(),
    summary: {},
    recommendations: [],
    overallHealth: 'good'
  };
  
  const projectNames = projectName ? [projectName] : Object.keys(projects);
  
  for (const name of projectNames) {
    const project = projects[name];
    const progress = phase5Data.projectProgress[name] || {
      status: project.status || 'pending',
      progress: 0,
      estimatedDays: 30,
      actualDays: 0,
      risks: []
    };
    
    // 計算健康度
    let healthScore = 100;
    const issues = [];
    
    if (project.status === 'pending') {
      healthScore -= 30;
      issues.push('項目尚未開始');
    }
    
    if (progress.risks && progress.risks.length > 0) {
      healthScore -= progress.risks.length * 15;
      issues.push(`存在 ${progress.risks.length} 個風險`);
    }
    
    if (progress.progress < 25 && project.status === 'active') {
      healthScore -= 20;
      issues.push('進度低於預期');
    }
    
    healthScore = Math.max(0, healthScore);
    
    analysis.summary[name] = {
      status: project.status,
      progress: progress.progress,
      healthScore: healthScore,
      issues: issues,
      nextActions: generateNextActions(project, progress)
    };
    
    // 生成優化建議
    if (healthScore < 70) {
      analysis.recommendations.push({
        project: name,
        priority: healthScore < 50 ? 'high' : 'medium',
        suggestions: generateRecommendations(project, progress)
      });
    }
  }
  
  // 整體健康度
  const avgHealth = Object.values(analysis.summary)
    .reduce((sum, p) => sum + p.healthScore, 0) / Object.keys(analysis.summary).length;
  
  if (avgHealth < 50) {
    analysis.overallHealth = 'critical';
  } else if (avgHealth < 70) {
    analysis.overallHealth = 'warning';
  }
  
  phase5Data.lastAnalysis = analysis;
  savePhase5Data(phase5Data);
  
  return analysis;
}

/**
 * 生成下一步行動
 */
function generateNextActions(project, progress) {
  const actions = [];
  
  if (project.status === 'pending') {
    actions.push('開始項目規劃');
    actions.push('設定里程碑');
  } else if (project.status === 'active') {
    if (progress.progress < 50) {
      actions.push('加快開發進度');
      actions.push('解決阻礙問題');
    }
    if (project.next && project.next.length > 0) {
      actions.push(`下一步: ${project.next[0]}`);
    }
  } else if (project.status === 'completed') {
    actions.push('項目已完成');
    actions.push('進行回顧總結');
  }
  
  return actions;
}

/**
 * 生成優化建議
 */
function generateRecommendations(project, progress) {
  const recommendations = [];
  
  if (progress.progress < 30) {
    recommendations.push('建議重新評估項目範圍和資源分配');
  }
  
  if (progress.risks && progress.risks.length > 0) {
    recommendations.push('優先處理已識別的風險');
  }
  
  if (project.status === 'pending') {
    recommendations.push('盡快啟動項目，設定明確的時間表');
  }
  
  recommendations.push('考慮將大型任務拆分為更小的可管理任務');
  
  return recommendations;
}

/**
 * 智能日曆整合：獲取今日/明日會議
 * 注意：需要 Google Calendar API 認證，這裡提供模擬數據和接口
 */
async function getCalendarEvents(days = 1) {
  // 嘗試使用 gog CLI 獲取日曆數據
  const { exec } = require('child_process');
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const fromDate = today.toISOString().split('T')[0];
  const toDate = new Date(today);
  toDate.setDate(toDate.getDate() + days);
  const toDateStr = toDate.toISOString().split('T')[0];
  
  return new Promise((resolve) => {
    exec(`gog calendar events primary --from ${fromDate} --to ${toDateStr}`, 
      { timeout: 10000 },
      (error, stdout, stderr) => {
        if (error) {
          // 如果無法獲取真實數據，返回模擬數據
          console.log('[Phase5] 使用模擬日曆數據');
          resolve(getMockCalendarEvents(days));
        } else {
          try {
            const events = JSON.parse(stdout);
            resolve(processCalendarEvents(events, days));
          } catch (e) {
            resolve(getMockCalendarEvents(days));
          }
        }
      }
    );
  });
}

/**
 * 處理日曆事件數據
 */
function processCalendarEvents(events, days) {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  const result = {
    today: [],
    tomorrow: [],
    hasEvents: false
  };
  
  for (const event of events) {
    const eventDate = event.start?.dateTime || event.start?.date;
    if (!eventDate) continue;
    
    const datePart = eventDate.split('T')[0];
    
    if (datePart === today) {
      result.today.push({
        title: event.summary,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        hangoutLink: event.conferenceData?.entryPoints?.[0]?.uri
      });
    } else if (datePart === tomorrowStr && days > 1) {
      result.tomorrow.push({
        title: event.summary,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        hangoutLink: event.conferenceData?.entryPoints?.[0]?.uri
      });
    }
  }
  
  result.hasEvents = result.today.length > 0 || result.tomorrow.length > 0;
  
  return result;
}

/**
 * 獲取模擬日曆數據（當無法訪問 Google Calendar 時）
 */
function getMockCalendarEvents(days = 1) {
  const now = new Date();
  const hour = now.getHours();
  
  const mockEvents = {
    today: [],
    tomorrow: [],
    hasEvents: false,
    isMock: true
  };
  
  // 模擬一些會議（根據時間）
  if (hour >= 9 && hour < 12) {
    mockEvents.today.push({
      title: '🤖 團隊 Standup',
      start: new Date(now.setHours(9, 0, 0)).toISOString(),
      end: new Date(now.setHours(9, 30, 0)).toISOString(),
      hangoutLink: null,
      isMock: true
    });
  }
  
  if (hour >= 14 && hour < 16) {
    mockEvents.today.push({
      title: '📋 項目會議',
      start: new Date(now.setHours(14, 0, 0)).toISOString(),
      end: new Date(now.setHours(15, 0, 0)).toISOString(),
      hangoutLink: 'https://meet.google.com/abc-defg-hij',
      isMock: true
    });
  }
  
  mockEvents.hasEvents = mockEvents.today.length > 0;
  
  return mockEvents;
}

/**
 * 項目進度預測：預測完成時間，識別風險
 */
function predictProjectCompletion(projectName = null) {
  const phase5Data = loadPhase5Data();
  const records = loadProjectRecords();
  const projects = records.projects;
  
  const predictions = {
    timestamp: new Date().toISOString(),
    projects: {}
  };
  
  const projectNames = projectName ? [projectName] : Object.keys(projects);
  
  for (const name of projectNames) {
    const project = projects[name];
    const progress = phase5Data.projectProgress[name] || {
      progress: 0,
      estimatedDays: 30,
      actualDays: 0
    };
    
    // 簡單的預測算法
    let predictedCompletion = null;
    let confidence = 'low';
    let risks = [];
    
    if (project.status === 'completed') {
      predictedCompletion = '已完成';
      confidence = 'high';
    } else if (project.status === 'pending') {
      predictedCompletion = '未開始';
      confidence = 'low';
      risks.push('項目尚未啟動');
    } else if (progress.progress > 0) {
      // 基於當前進度預測
      const remainingProgress = 100 - progress.progress;
      const dailyRate = progress.progress / Math.max(1, progress.actualDays);
      
      if (dailyRate > 0) {
        const daysRemaining = Math.ceil(remainingProgress / dailyRate);
        const predictedDate = new Date();
        predictedDate.setDate(predictedDate.getDate() + daysRemaining);
        predictedCompletion = predictedDate.toISOString().split('T')[0];
        confidence = dailyRate > 3 ? 'high' : dailyRate > 1 ? 'medium' : 'low';
      }
      
      // 識別風險
      if (dailyRate < 1) {
        risks.push('進度緩慢，可能延遲');
      }
      if (progress.risks && progress.risks.length > 0) {
        risks.push(...progress.risks);
      }
    }
    
    predictions.projects[name] = {
      currentProgress: progress.progress,
      estimatedCompletion: predictedCompletion,
      confidence: confidence,
      risks: risks,
      trend: progress.progress > 50 ? 'accelerating' : 
            progress.progress > 25 ? 'stable' : 'slow'
    };
  }
  
  phase5Data.predictions = predictions;
  savePhase5Data(phase5Data);
  
  return predictions;
}

/**
 * 更新項目進度
 */
function updateProjectProgress(projectName, updates) {
  const phase5Data = loadPhase5Data();
  
  if (!phase5Data.projectProgress[projectName]) {
    phase5Data.projectProgress[projectName] = {
      status: 'active',
      progress: 0,
      startDate: new Date().toISOString(),
      estimatedDays: 30,
      actualDays: 0,
      milestones: [],
      risks: [],
      lastUpdate: new Date().toISOString()
    };
  }
  
  Object.assign(phase5Data.projectProgress[projectName], updates);
  phase5Data.projectProgress[projectName].lastUpdate = new Date().toISOString();
  
  savePhase5Data(phase5Data);
  return phase5Data.projectProgress[projectName];
}

/**
 * 添加風險記錄
 */
function addRisk(projectName, risk) {
  const phase5Data = loadPhase5Data();
  
  if (!phase5Data.projectProgress[projectName]) {
    return null;
  }
  
  if (!phase5Data.projectProgress[projectName].risks) {
    phase5Data.projectProgress[projectName].risks = [];
  }
  
  phase5Data.projectProgress[projectName].risks.push({
    description: risk,
    addedAt: new Date().toISOString(),
    severity: 'medium'
  });
  
  savePhase5Data(phase5Data);
  return phase5Data.projectProgress[projectName].risks;
}

/**
 * 格式化分析結果為 Discord 訊息
 */
function formatAnalysisForDiscord(analysis) {
  let embed = {
    title: '📊 AI 項目分析報告',
    color: analysis.overallHealth === 'good' ? 0x51b749 : 
           analysis.overallHealth === 'warning' ? 0xfbd75b : 0xdc2127,
    fields: [],
    footer: {
      text: `分析時間: ${new Date(analysis.timestamp).toLocaleString('zh-HK')}`
    }
  };
  
  for (const [projectName, summary] of Object.entries(analysis.summary)) {
    const healthEmoji = summary.healthScore >= 70 ? '✅' : 
                        summary.healthScore >= 50 ? '⚠️' : '❌';
    
    embed.fields.push({
      name: `${healthEmoji} ${projectName}`,
      value: `**進度:** ${summary.progress}%\n**健康度:** ${summary.healthScore}%` +
             (summary.issues.length > 0 ? `\n**問題:** ${summary.issues.join(', ')}` : '') +
             `\n**下一步:** ${summary.nextActions[0] || '無'}`,
      inline: true
    });
  }
  
  if (analysis.recommendations.length > 0) {
    embed.fields.push({
      name: '💡 優化建議',
      value: analysis.recommendations.map(r => 
        `[${r.project}] ${r.suggestions.join(', ')}`
      ).join('\n')
    });
  }
  
  return embed;
}

/**
 * 格式化日曆為 Discord 訊息
 */
function formatCalendarForDiscord(events) {
  let embed = {
    title: '📅 今日會議',
    color: 0x46d6db,
    fields: [],
    footer: {}
  };
  
  if (events.isMock) {
    embed.footer.text = '⚠️ 顯示模擬數據（需要 Google Calendar 認證）';
  }
  
  if (!events.hasEvents) {
    embed.description = '今日沒有會議安排';
    return embed;
  }
  
  for (const event of events.today) {
    const time = new Date(event.start).toLocaleTimeString('zh-HK', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const endTime = new Date(event.end).toLocaleTimeString('zh-HK', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    let eventText = `🕐 ${time} - ${endTime}`;
    if (event.hangoutLink) {
      eventText += `\n🔗 [加入會議](${event.hangoutLink})`;
    }
    
    embed.fields.push({
      name: event.title,
      value: eventText,
      inline: false
    });
  }
  
  if (events.tomorrow && events.tomorrow.length > 0) {
    embed.fields.push({
      name: '---',
      value: '**明日會議:**',
      inline: false
    });
    
    for (const event of events.tomorrow) {
      const time = new Date(event.start).toLocaleTimeString('zh-HK', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      embed.fields.push({
        name: event.title,
        value: `🕐 ${time}`,
        inline: true
      });
    }
  }
  
  return embed;
}

/**
 * 格式化預測為 Discord 訊息
 */
function formatPredictionsForDiscord(predictions) {
  let embed = {
    title: '🔮 項目進度預測',
    color: 0x5484ed,
    fields: [],
    footer: {
      text: `預測時間: ${new Date(predictions.timestamp).toLocaleString('zh-HK')}`
    }
  };
  
  for (const [projectName, pred] of Object.entries(predictions.projects)) {
    const trendEmoji = pred.trend === 'accelerating' ? '📈' : 
                       pred.trend === 'stable' ? '➡️' : '📉';
    const riskEmoji = pred.risks.length > 0 ? '⚠️' : '✅';
    
    let value = `**當前進度:** ${pred.currentProgress}%\n` +
                `**預測完成:** ${pred.estimatedCompletion || '未知'}\n` +
                `**趨勢:** ${trendEmoji} ${pred.trend}\n` +
                `**置信度:** ${pred.confidence}`;
    
    if (pred.risks.length > 0) {
      value += `\n**風險:** ${pred.risks.join(', ')}`;
    }
    
    embed.fields.push({
      name: `${riskEmoji} ${projectName}`,
      value: value,
      inline: true
    });
  }
  
  return embed;
}

// 導出模塊
module.exports = {
  initializeProjectProgress,
  analyzeProjectProgress,
  getCalendarEvents,
  predictProjectCompletion,
  updateProjectProgress,
  addRisk,
  formatAnalysisForDiscord,
  formatCalendarForDiscord,
  formatPredictionsForDiscord,
  loadPhase5Data,
  savePhase5Data
};
