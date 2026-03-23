/**
 * Unified Dashboard Module
 * 統一儀表板 - 結合 Phase 6 和 Phase 9 的最佳功能
 * 
 * 包含:
 * - 成員狀態
 * - Pomodoro 進度
 * - 即將到來的會議
 * - 團隊心情
 * - 活動統計
 */

const fs = require('fs');
const path = require('path');

const PHASE6_DATA_PATH = path.join(__dirname, 'phase6-data.json');
const PHASE9_DATA_PATH = path.join(__dirname, 'phase9-data.json');
const POMODORO_DATA_PATH = path.join(__dirname, 'pomodoro-data.json');
const STATUS_DB_PATH = path.join(__dirname, 'status-db.json');
const DASHBOARD_CONFIG_PATH = path.join(__dirname, 'dashboard-config.json');

// 默認配置
function getDefaultConfig() {
  return {
    enabled: true,
    channel: null,           // 自動更新頻道
    messageId: null,         // 儀表板訊息 ID
    refreshInterval: 60000,  // 刷新間隔 (1分鐘)
    sections: {
      members: true,        // 成員狀態
      pomodoro: true,       // Pomodoro 進度
      upcoming: true,       // 即將到來的會議
      mood: true,           // 團隊心情
      activity: true        // 活動統計
    },
    lastUpdate: null
  };
}

// 加載 Phase 6 數據
function loadPhase6Data() {
  try {
    if (fs.existsSync(PHASE6_DATA_PATH)) {
      return JSON.parse(fs.readFileSync(PHASE6_DATA_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('[UnifiedDashboard] 載入 Phase 6 數據失敗:', e.message);
  }
  return null;
}

// 保存 Phase 6 數據
function savePhase6Data(data) {
  try {
    fs.writeFileSync(PHASE6_DATA_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[UnifiedDashboard] 保存 Phase 6 數據失敗:', e.message);
  }
}

// 加載 Phase 9 數據
function loadPhase9Data() {
  try {
    if (fs.existsSync(PHASE9_DATA_PATH)) {
      return JSON.parse(fs.readFileSync(PHASE9_DATA_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('[UnifiedDashboard] 載入 Phase 9 數據失敗:', e.message);
  }
  return null;
}

// 加載 Pomodoro 數據
function loadPomodoroData() {
  try {
    if (fs.existsSync(POMODORO_DATA_PATH)) {
      return JSON.parse(fs.readFileSync(POMODORO_DATA_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('[UnifiedDashboard] 載入 Pomodoro 數據失敗:', e.message);
  }
  return null;
}

// 加載狀態數據庫
function loadStatusDB() {
  try {
    if (fs.existsSync(STATUS_DB_PATH)) {
      return JSON.parse(fs.readFileSync(STATUS_DB_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('[UnifiedDashboard] 載入狀態數據失敗:', e.message);
  }
  return { members: {} };
}

// 加載外部儀表板配置
function loadDashboardConfig() {
  try {
    if (fs.existsSync(DASHBOARD_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(DASHBOARD_CONFIG_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('[UnifiedDashboard] 載入儀表板配置失敗:', e.message);
  }
  return { links: {} };
}

// 獲取幫助信息
function getDashboardHelp() {
  return `**📊 統一儀表板命令**:

\`!dashboard\` - 查看完整儀表板
\`!dashboard status\` - 成員狀態
\`!dashboard pomodoro\` - Pomodoro 進度
\`!dashboard calendar\` - 即將到來的會議
\`!dashboard mood\` - 團隊心情
\`!dashboard activity\` - 活動統計

**管理員命令**:
\`!dashboard channel [channel]\` - 設定自動更新頻道
\`!dashboard refresh\` - 立即刷新`;
}

// 處理儀表板命令
async function handleDashboardCommand(message, args, data, phase6Data, phase9Data) {
  const subCommand = args[0]?.toLowerCase();
  const channel = message.channel;

  // 沒有子命令，顯示完整儀表板
  if (!subCommand || subCommand === 'full' || subCommand === '全部') {
    return await showFullDashboard(channel, phase6Data, phase9Data);
  }

  switch (subCommand) {
    case 'status':
    case '成員':
    case 'members':
      return await showMembersStatus(channel, phase9Data);
    
    case 'pomodoro':
    case '番茄':
    case 'tomato':
      return await showPomodoroProgress(channel, phase9Data);
    
    case 'calendar':
    case '會議':
    case 'event':
    case '日程':
      return await showUpcomingEvents(channel, phase9Data);
    
    case 'mood':
    case '心情':
      return await showTeamMood(channel, phase6Data);
    
    case 'activity':
    case '活動':
    case '統計':
      return await showActivityStats(channel, phase6Data);
    
    case 'links':
    case 'link':
    case '連結':
      return await showExternalLinks(channel);
    
    case 'channel':
    case '頻道':
      return await handleChannelSetup(message, args.slice(1), data);
    
    case 'refresh':
    case '刷新':
      return await showFullDashboard(channel, phase6Data, phase9Data);
    
    case 'help':
    case '幫助':
    case '?':
      await channel.send(getDashboardHelp());
      return;
    
    default:
      await channel.send(getDashboardHelp());
  }
}

// 設定頻道
async function handleChannelSetup(message, args, data) {
  const subCommand = args[0]?.toLowerCase();
  
  if (!subCommand || subCommand === 'set') {
    const channel = message.mentions.channels.first() || message.channel;
    data.dashboard.channel = channel.id;
    savePhase9Data(data);
    await message.channel.send(`✅ 儀表板更新頻道已設定為: ${channel}`);
    return;
  }
  
  if (subCommand === 'clear' || subCommand === '移除') {
    data.dashboard.channel = null;
    data.dashboard.messageId = null;
    savePhase9Data(data);
    await message.channel.send('✅ 已移除儀表板自動更新');
    return;
  }
  
  if (subCommand === 'show' || subCommand === '查看') {
    if (data.dashboard.channel) {
      await message.channel.send(`📍 當前儀表板頻道: <#${data.dashboard.channel}>`);
    } else {
      await message.channel.send('📍 未設定自動更新頻道');
    }
    return;
  }
  
  await message.channel.send('用法: `!dashboard channel [set|clear|show]`');
}

// 保存 Phase 9 數據
function savePhase9Data(data) {
  try {
    fs.writeFileSync(PHASE9_DATA_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[UnifiedDashboard] 保存 Phase 9 數據失敗:', e.message);
  }
}

// 顯示完整儀表板
async function showFullDashboard(channel, phase6Data, phase9Data) {
  let dashboard = '';
  const dashConfig = loadDashboardConfig();
  
  // 標題
  dashboard += '📊 **統一團隊儀表板**\n';
  dashboard += `*更新時間: ${new Date().toLocaleString('zh-TW')}*\n\n`;
  
  // 0. 外部連結 (如果有設定)
  if (dashConfig.links.googleSheets || dashConfig.links.notion || dashConfig.links.linear) {
    dashboard += '🔗 **外部儀表板**\n';
    if (dashConfig.links.googleSheets) {
      dashboard += `   📊 Sheets: <${dashConfig.links.googleSheets}>\n`;
    }
    if (dashConfig.links.notion) {
      dashboard += `   📝 Notion: <${dashConfig.links.notion}>\n`;
    }
    if (dashConfig.links.linear) {
      dashboard += `   ✅ Linear: <${dashConfig.links.linear}>\n`;
    }
    dashboard += '\n';
  }
  
  // 1. 成員狀態
  if (phase9Data?.dashboard?.sections?.members !== false) {
    dashboard += await getMembersStatusSection(phase9Data);
  }
  
  // 2. Pomodoro 進度
  if (phase9Data?.dashboard?.sections?.pomodoro !== false) {
    dashboard += await getPomodoroSection(phase9Data);
  }
  
  // 3. 即將到來的會議
  if (phase9Data?.dashboard?.sections?.upcoming !== false) {
    dashboard += await getUpcomingEventsSection(phase9Data);
  }
  
  // 4. 團隊心情
  if (phase9Data?.dashboard?.sections?.mood !== false) {
    dashboard += await getMoodSection(phase6Data);
  }
  
  // 5. 活動統計
  if (phase9Data?.dashboard?.sections?.activity !== false) {
    dashboard += await getActivitySection(phase6Data);
  }
  
  await channel.send(dashboard);
}

// 獲取成員狀態區塊
async function getMembersStatusSection(phase9Data) {
  const statusDB = loadStatusDB();
  const members = Object.values(statusDB.members || {});
  
  const working = members.filter(m => m.status === 'working').length;
  const done = members.filter(m => m.status === 'done').length;
  const blocked = members.filter(m => m.status === 'blocked').length;
  const idle = members.filter(m => !m.status || m.status === 'idle').length;
  
  let section = '👥 **成員狀態**\n';
  section += `   ⏳ 工作中: ${working}\n`;
  section += `   ✅ 已完成: ${done}\n`;
  section += `   🚫 受阻礙: ${blocked}\n`;
  section += `   💤 休息中: ${idle}\n\n`;
  
  return section;
}

// 獲取 Pomodoro 區塊
async function getPomodoroSection(phase9Data) {
  const pomodoroData = loadPomodoroData() || { activeSessions: {} };
  const sessions = Object.values(pomodoroData.activeSessions || {});
  
  let section = '🍅 **Pomodoro 進行中**: ' + sessions.length + '\n';
  
  if (sessions.length === 0) {
    section += '   無進行中的衝刺\n\n';
  } else {
    for (const s of sessions.slice(0, 3)) {
      const remaining = Math.max(0, Math.ceil((s.endTime - Date.now()) / 60000));
      section += `   • ${s.userName}: ${s.task} (${remaining}分鐘)\n`;
    }
    if (sessions.length > 3) {
      section += `   ... 還有 ${sessions.length - 3} 個\n`;
    }
    section += '\n';
  }
  
  return section;
}

// 獲取即將到來的會議區塊
async function getUpcomingEventsSection(phase9Data) {
  const calData = phase9Data?.calendarEnhanced || {};
  const events = calData.upcomingEvents || [];
  
  let section = '📅 **即將到來的會議**\n';
  
  if (events.length === 0) {
    section += '   無預定會議\n\n';
  } else {
    for (const event of events.slice(0, 3)) {
      section += `   • ${event.summary} (${event.time})\n`;
    }
    section += '\n';
  }
  
  return section;
}

// 獲取團隊心情區塊
async function getMoodSection(phase6Data) {
  const moodData = phase6Data?.mood || {};
  const entries = moodData.entries || {};
  
  const today = new Date().toDateString();
  const todayEntries = entries[today] || {};
  
  let section = '😊 **團隊心情**\n';
  
  if (Object.keys(todayEntries).length === 0) {
    section += '   今日暫無匯報\n\n';
  } else {
    const avgMood = Object.values(todayEntries).reduce((sum, e) => sum + e.mood, 0) / Object.keys(todayEntries).length;
    const avgInfo = moodData.moods?.find(m => m.value === Math.round(avgMood)) || { emoji: '😐', label: '一般' };
    section += `   ${avgInfo.emoji} 平均: ${avgMood.toFixed(1)}/5 (${Object.keys(todayEntries).length}人)\n`;
    
    // 顯示各成員心情
    const entryList = Object.entries(todayEntries).map(([userId, entry]) => {
      const moodInfo = moodData.moods?.find(m => m.value === entry.mood) || { emoji: '😐' };
      return `${moodInfo.emoji} <@${userId}>`;
    }).join(' ');
    section += `   ${entryList}\n\n`;
  }
  
  return section;
}

// 獲取活動統計區塊
async function getActivitySection(phase6Data) {
  const gamification = phase6Data?.gamification || {};
  const users = Object.values(gamification.users || {});
  
  let section = '📊 **活動統計**\n';
  
  // 總積分
  const totalPoints = users.reduce((sum, u) => sum + (u.points || 0), 0);
  section += `   🏆 總積分: ${totalPoints}\n`;
  
  // 今日任務完成數
  const today = new Date().toDateString();
  const todayCompleted = users.reduce((sum, u) => {
    const tasks = u.tasks || [];
    return sum + tasks.filter(t => new Date(t.completedAt).toDateString() === today).length;
  }, 0);
  section += `   ✅ 今日完成: ${todayCompleted} 個任務\n`;
  
  // Top 3
  const top3 = users.sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 3);
  if (top3.length > 0) {
    section += `   🥇 Top: ${top3.map(u => u.points || 0).join(' > ')} 分\n`;
  }
  
  section += '\n';
  return section;
}

// 顯示成員狀態
async function showMembersStatus(channel, phase9Data) {
  const section = await getMembersStatusSection(phase9Data);
  await channel.send('👥 **成員狀態**\n\n' + section);
}

// 顯示 Pomodoro 進度
async function showPomodoroProgress(channel, phase9Data) {
  const section = await getPomodoroSection(phase9Data);
  await channel.send('🍅 **Pomodoro 進度**\n\n' + section);
}

// 顯示即將到來的會議
async function showUpcomingEvents(channel, phase9Data) {
  const section = await getUpcomingEventsSection(phase9Data);
  await channel.send('📅 **即將到來的會議**\n\n' + section);
}

// 顯示團隊心情
async function showTeamMood(channel, phase6Data) {
  const section = await getMoodSection(phase6Data);
  await channel.send('😊 **團隊心情**\n\n' + section);
}

// 顯示活動統計
async function showActivityStats(channel, phase6Data) {
  const section = await getActivitySection(phase6Data);
  await channel.send('📊 **活動統計**\n\n' + section);
}

// 顯示外部連結
async function showExternalLinks(channel) {
  const dashConfig = loadDashboardConfig();
  
  let links = '🔗 **外部儀表板連結**\n\n';
  
  if (dashConfig.links.googleSheets) {
    links += `📊 Google Sheets: <${dashConfig.links.googleSheets}>\n`;
  }
  if (dashConfig.links.notion) {
    links += `📝 Notion: <${dashConfig.links.notion}>\n`;
  }
  if (dashConfig.links.linear) {
    links += `✅ Linear: <${dashConfig.links.linear}>\n`;
  }
  
  if (!dashConfig.links.googleSheets && !dashConfig.links.notion && !dashConfig.links.linear) {
    links += '⚠️ 尚未設定儀表板連結\n';
    links += '請使用 `!dashboard set [sheets|notion|linear] [URL]` 設定';
  }
  
  await channel.send(links);
}

// 自動更新儀表板 (用於定時任務)
async function updateDashboard(client, phase9Data) {
  if (!phase9Data?.dashboard?.enabled || !phase9Data?.dashboard?.channel) {
    return;
  }
  
  try {
    const channel = await client.channels.fetch(phase9Data.dashboard.channel);
    if (!channel) return;
    
    const phase6Data = loadPhase6Data();
    
    // 構建儀表板內容
    let dashboard = await buildDashboardContent(phase6Data, phase9Data);
    
    // 發送或更新訊息
    if (phase9Data.dashboard.messageId) {
      try {
        const msg = await channel.messages.fetch(phase9Data.dashboard.messageId);
        if (msg) {
          await msg.edit(dashboard);
          return;
        }
      } catch (e) {
        // 訊息可能已被刪除
      }
    }
    
    // 發新訊息
    const sent = await channel.send(dashboard);
    phase9Data.dashboard.messageId = sent.id;
    phase9Data.dashboard.lastUpdate = Date.now();
    savePhase9Data(phase9Data);
    
  } catch (e) {
    console.error('[UnifiedDashboard] 更新儀表板失敗:', e.message);
  }
}

// 構建儀表板內容
async function buildDashboardContent(phase6Data, phase9Data) {
  let dashboard = '';
  
  // 標題
  dashboard += '📊 **統一團隊儀表板**\n';
  dashboard += `*更新時間: ${new Date().toLocaleString('zh-TW')}*\n\n`;
  
  // 成員狀態
  if (phase9Data?.dashboard?.sections?.members !== false) {
    dashboard += await getMembersStatusSection(phase9Data);
  }
  
  // Pomodoro 進度
  if (phase9Data?.dashboard?.sections?.pomodoro !== false) {
    dashboard += await getPomodoroSection(phase9Data);
  }
  
  // 即將到來的會議
  if (phase9Data?.dashboard?.sections?.upcoming !== false) {
    dashboard += await getUpcomingEventsSection(phase9Data);
  }
  
  // 團隊心情
  if (phase9Data?.dashboard?.sections?.mood !== false) {
    dashboard += await getMoodSection(phase6Data);
  }
  
  // 活動統計
  if (phase9Data?.dashboard?.sections?.activity !== false) {
    dashboard += await getActivitySection(phase6Data);
  }
  
  return dashboard;
}

// 導出模組
module.exports = {
  getDefaultConfig,
  loadPhase6Data,
  savePhase6Data,
  loadPhase9Data,
  savePhase9Data,
  loadPomodoroData,
  loadStatusDB,
  loadDashboardConfig,
  getDashboardHelp,
  handleDashboardCommand,
  showFullDashboard,
  showMembersStatus,
  showPomodoroProgress,
  showUpcomingEvents,
  showTeamMood,
  showActivityStats,
  showExternalLinks,
  updateDashboard,
  buildDashboardContent,
  getMembersStatusSection,
  getPomodoroSection,
  getUpcomingEventsSection,
  getMoodSection,
  getActivitySection
};
