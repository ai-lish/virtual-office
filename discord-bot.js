#!/usr/bin/env node
/**
 * Discord Virtual Office Bot
 * 功能：
 * 1. 监听 Voice 频道成员加入/离开事件
 * 2. 更新成员状态为"在崗"
 * 3. 自动清理落后/完成的 threads
 * 4. Cron Bot - 定時提醒 (每日 standup、週報催交)
 * 5. 範本訊息命令
 * 
 * 环境变量:
 *   DISCORD_BOT_TOKEN - Discord Bot Token
 *   OPENCLAW_API_URL - OpenClaw API URL (可选)
 * 
 * 运行方式: node discord-bot.js
 */

const { Client, GatewayIntentBits, ChannelType, PermissionsBitField, MessageEmbed, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const TEMPLATES_PATH = path.join(__dirname, 'templates.json');
const STATUS_PATH = path.join(__dirname, 'voice-status.json');
const CRON_CONFIG_PATH = path.join(__dirname, 'cron-config.json');
const STATUS_DB_PATH = path.join(__dirname, 'status-db.json');
const STANDUP_DB_PATH = path.join(__dirname, 'standup-db.json');
const DASHBOARD_CONFIG_PATH = path.join(__dirname, 'dashboard-config.json');
const KEYWORD_DB_PATH = path.join(__dirname, 'keyword-db.json');
const POLL_DB_PATH = path.join(__dirname, 'poll-db.json');
const WORKSPACE_CONFIG_PATH = path.join(__dirname, 'workspace-config.json');
const PHASE5_DATA_PATH = path.join(__dirname, 'phase5-data.json');
const PHASE7_DATA_PATH = path.join(__dirname, 'phase7-data.json');
const PHASE8_DATA_PATH = path.join(__dirname, 'phase8-data.json');
const PHASE9_DATA_PATH = path.join(__dirname, 'phase9-data.json');

// Phase 5: AI 功能
let phase5;
try {
  phase5 = require('./phase5-ai-features.js');
} catch (e) {
  console.log('[Phase5] 模組載入失敗:', e.message);
  phase5 = null;
}

// Phase 6: 更多 AI 功能 (白板、遊戲化、心情、提醒、儀表板)
let phase6;
try {
  phase6 = require('./phase6-ai-features.js');
} catch (e) {
  console.log('[Phase6] 模組載入失敗:', e.message);
  phase6 = null;
}

// Phase 7: 10項新功能 (Webhooks, 開工儀式, Voice通知, Ondi狀態, 每週主題, AI Summaries, Calendar推播, Sync, Poll, Analytics)
let phase7;
try {
  phase7 = require('./phase7-new-features.js');
} catch (e) {
  console.log('[Phase7] 模組載入失敗:', e.message);
  phase7 = null;
}

// Phase 8: 6項新功能 (Notion/Airtable同步, Jenkins通知, 截止提醒, 安靜時段, 每月清理, Thread封存)
let phase8;
try {
  phase8 = require('./phase8-new-features.js');
} catch (e) {
  console.log('[Phase8] 模組載入失敗:', e.message);
  phase8 = null;
}

// Phase 9: 10項新功能建議
let phase9;
try {
  phase9 = require('./phase9-new-features.js');
} catch (e) {
  console.log('[Phase9] 模組載入失敗:', e.message);
  phase9 = null;
}

// Pomodoro: 每日任務衝刺計時器
let pomodoro;
try {
  pomodoro = require('./phase-pomodoro.js');
} catch (e) {
  console.log('[Pomodoro] 模組載入失敗:', e.message);
  pomodoro = null;
}

// Team Weather: 心情天氣預報
let teamWeather;
try {
  teamWeather = require('./phase-team-weather.js');
} catch (e) {
  console.log('[TeamWeather] 模組載入失敗:', e.message);
  teamWeather = null;
}

// Unified Dashboard: 統一儀表板
let unifiedDashboard;
try {
  unifiedDashboard = require('./unified-dashboard.js');
} catch (e) {
  console.log('[UnifiedDashboard] 模組載入失敗:', e.message);
  unifiedDashboard = null;
}

// 加载配置
function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    console.error('無法載入配置:', e.message);
    return {};
  }
}

// 加载範本
function loadTemplates() {
  try {
    return JSON.parse(fs.readFileSync(TEMPLATES_PATH, 'utf8'));
  } catch (e) {
    console.error('無法載入範本:', e.message);
    return {};
  }
}

// 加载 Cron 配置
function loadCronConfig() {
  try {
    return JSON.parse(fs.readFileSync(CRON_CONFIG_PATH, 'utf8'));
  } catch (e) {
    // 使用默认配置
    return {
      standup: {
        enabled: true,
        time: '09:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        channel: null,
        message: '🌅 **每日 Standup 提醒**\n\n請各位成員匯報：\n• 昨日完成\n• 今日計劃\n• 阻礙/需要協助\n\n使用 `!template standup` 獲取範本'
      },
      weekly: {
        enabled: true,
        time: '17:00',
        days: ['friday'],
        channel: null,
        message: '📊 **週報催交提醒**\n\n今日係星期五，請提交週報！\n使用 `!template weekly` 獲取範本'
      }
    };
  }
}

// 保存 Cron 配置
function saveCronConfig(config) {
  fs.writeFileSync(CRON_CONFIG_PATH, JSON.stringify(config, null, 2));
}

// 加载 Status 数据库
function loadStatusDB() {
  try {
    return JSON.parse(fs.readFileSync(STATUS_DB_PATH, 'utf8'));
  } catch (e) {
    return { members: {} };
  }
}

// 保存 Status 数据库
function saveStatusDB(db) {
  fs.writeFileSync(STATUS_DB_PATH, JSON.stringify(db, null, 2));
}

// 加载 Standup 数据库
function loadStandupDB() {
  try {
    return JSON.parse(fs.readFileSync(STANDUP_DB_PATH, 'utf8'));
  } catch (e) {
    return { standups: [] };
  }
}

// 保存 Standup 数据库
function saveStandupDB(db) {
  fs.writeFileSync(STANDUP_DB_PATH, JSON.stringify(db, null, 2));
}

// 加载 Dashboard 配置
function loadDashboardConfig() {
  try {
    return JSON.parse(fs.readFileSync(DASHBOARD_CONFIG_PATH, 'utf8'));
  } catch (e) {
    return {
      links: {
        googleSheets: null,
        notion: null,
        linear: null
      },
      pinnedMessageId: null,
      weeklyReport: {
        channel: null,
        day: 'friday',
        time: '17:00'
      }
    };
  }
}

// 保存 Dashboard 配置
function saveDashboardConfig(config) {
  fs.writeFileSync(DASHBOARD_CONFIG_PATH, JSON.stringify(config, null, 2));
}

// 加载关键词订阅数据库
function loadKeywordDB() {
  try {
    return JSON.parse(fs.readFileSync(KEYWORD_DB_PATH, 'utf8'));
  } catch (e) {
    return { subscriptions: {}, announcementFormats: {}, notificationHistory: [] };
  }
}

// 保存关键词订阅数据库
function saveKeywordDB(db) {
  fs.writeFileSync(KEYWORD_DB_PATH, JSON.stringify(db, null, 2));
}

// 加载投票数据库
function loadPollDB() {
  try {
    return JSON.parse(fs.readFileSync(POLL_DB_PATH, 'utf8'));
  } catch (e) {
    return { polls: [], defaultDuration: 3600, quickOptions: {} };
  }
}

// 保存投票数据库
function savePollDB(db) {
  fs.writeFileSync(POLL_DB_PATH, JSON.stringify(db, null, 2));
}

// 加载工作区配置
function loadWorkspaceConfig() {
  try {
    return JSON.parse(fs.readFileSync(WORKSPACE_CONFIG_PATH, 'utf8'));
  } catch (e) {
    return { google: {}, notion: {}, gcal: {} };
  }
}

// 保存工作区配置
function saveWorkspaceConfig(config) {
  fs.writeFileSync(WORKSPACE_CONFIG_PATH, JSON.stringify(config, null, 2));
}

// 加载 Phase 9 数据
function loadPhase9Data() {
  try {
    return JSON.parse(fs.readFileSync(PHASE9_DATA_PATH, 'utf8'));
  } catch (e) {
    if (phase9 && phase9.initPhase9Data) {
      return phase9.initPhase9Data();
    }
    return {};
  }
}

// 保存 Phase 9 数据
function savePhase9Data(data) {
  fs.writeFileSync(PHASE9_DATA_PATH, JSON.stringify(data, null, 2));
}

// 保存语音频道状态
function saveVoiceStatus(status) {
  fs.writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2));
}

// 从 config 获取频道映射
function getChannelMapping(config) {
  const discord = config.discord || {};
  return {
    design: discord.channels?.design?.name || '設計組',
    dev: discord.channels?.dev?.name || '開發組',
    support: discord.channels?.support?.name || '客服組'
  };
}

// 构建语音频道状态
function buildVoiceStatus(guild, channelMapping) {
  const status = {
    timestamp: Date.now(),
    channels: {
      design: { name: channelMapping.design, members: [], count: 0 },
      dev: { name: channelMapping.dev, members: [], count: 0 },
      support: { name: channelMapping.support, members: [], count: 0 }
    },
    total: 0
  };

  // 遍历所有语音频道
  if (guild.channels && guild.channels.cache) {
    guild.channels.cache.forEach(channel => {
      if (channel.type === ChannelType.GuildVoice) {
        // 匹配频道名称
        let targetGroup = null;
        if (channel.name.includes('設計')) targetGroup = 'design';
        else if (channel.name.includes('開發')) targetGroup = 'dev';
        else if (channel.name.includes('客服')) targetGroup = 'support';

        if (targetGroup && channel.members.size > 0) {
          const memberNames = [];
          channel.members.forEach(member => {
            if (!member.user.bot) {
              memberNames.push(member.displayName);
            }
          });
          status.channels[targetGroup].members = memberNames;
          status.channels[targetGroup].count = memberNames.length;
          status.total += memberNames.length;
        }
      }
    });
  }

  return status;
}

// 解析时间
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

// 检查今天是否需要发送
function shouldSendToday(cronConfig, type) {
  const config = cronConfig[type];
  if (!config || !config.enabled) return false;
  
  const today = new Date();
  const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][today.getDay()];
  
  return config.days.includes(dayName);
}

// 定时任务检查
let lastCheckedDate = null;
let lastCheckedMinute = null;

function checkCronJobs(client, cronConfig) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const minute = now.getMinutes();
  const hour = now.getHours();
  
  // 避免同一分钟重复执行
  if (lastCheckedDate === today && lastCheckedMinute === minute) return;
  lastCheckedDate = today;
  lastCheckedMinute = minute;
  
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  
  // 检查 standup
  if (shouldSendToday(cronConfig, 'standup')) {
    const standupTime = parseTime(cronConfig.standup.time);
    if (hour === standupTime.hours && minute === standupTime.minutes) {
      sendCronMessage(client, cronConfig.standup, 'standup');
    }
  }
  
  // 检查 weekly
  if (shouldSendToday(cronConfig, 'weekly')) {
    const weeklyTime = parseTime(cronConfig.weekly.time);
    if (hour === weeklyTime.hours && minute === weeklyTime.minutes) {
      sendCronMessage(client, cronConfig.weekly, 'weekly');
    }
  }
  
  // 检查心情問候 (moodGreeting)
  if (shouldSendToday(cronConfig, 'moodGreeting')) {
    const moodTime = parseTime(cronConfig.moodGreeting.time);
    if (hour === moodTime.hours && minute === moodTime.minutes) {
      sendCronMessage(client, cronConfig.moodGreeting, 'moodGreeting');
    }
  }
}

// 发送 Cron 消息
async function sendCronMessage(client, config, type) {
  if (!config.channel) {
    console.log(`⚠️ ${type} 提醒未設置頻道`);
    return;
  }
  
  try {
    const channel = await client.channels.fetch(config.channel);
    if (channel) {
      await channel.send(config.message);
      console.log(`✅ 已發送 ${type} 提醒`);
    }
  } catch (e) {
    console.error(`發送 ${type} 失敗:`, e.message);
  }
}

// 處理命令
async function handleCommand(client, message, command) {
  const templates = loadTemplates();
  const args = command.slice(1).split(' ');
  const subCommand = args[0]?.toLowerCase();
  
  // !help 命令
  if (subCommand === 'help' || !subCommand) {
    const helpText = `📚 **虛擬辦公室命令幫助**

**範本命令**:
\`!template task\` - 任務更新範本
\`!template blocker\` - 阻礙報告範本  
\`!template review\` - 程式碼審查請求範本
\`!template standup\` - 每日 Standup 範本
\`!template weekly\` - 週報範本

**狀態命令 (Phase 3 - Embed 卡片)**:
\`!status\` - 查看所有成員狀態 (Embed 卡片)
\`!status set [任務]\` - 設定當前狀態
\`!status done\` - 標記為完成
\`!status blocker [原因]\` - 標記阻礙

**專案狀態命令**:
\`!project\` - 查看所有專案列表
\`!project [名稱]\` - 查看專案狀態 (Embed 卡片)

**Standup 命令 (Phase 3)**:
\`!standup\` - 獲取 Standup 範本
\`!standup reply\` - 回覆今日 Standup
\`!standup list\` - 查看今日 Standup
\`!standup summary\` - 生成摘要

**儀表板命令 (Phase 3/6/9 統一)**:
\`!dashboard\` - 查看統一儀表板
\`!dashboard status\` - 成員狀態
\`!dashboard pomodoro\` - Pomodoro 進度
\`!dashboard calendar\` - 即將到來的會議
\`!dashboard mood\` - 團隊心情
\`!dashboard activity\` - 活動統計
\`!dashboard links\` - 外部儀表板連結
\`!dashboard set [type] [URL]\` - 設定外部連結
\`!dashboard channel [channel]\` - 設定自動更新頻道

**關鍵詞訂閱 (Phase 4)**:
\`!keyword add [關鍵詞]\` - 訂閱關鍵詞
\`!keyword remove [關鍵詞]\` - 取消訂閱
\`!keyword list\` - 查看已訂閱關鍵詞
\`!keyword formats\` - 查看公告格式

**投票命令 (Phase 4)**:
\`!poll [問題]\` - 創建投票
\`!poll quick [類型]\` - 快速投票 (yesno/priority/status)
\`!poll urgent [問題]\` - 緊急投票 (24小時)
\`!poll list\` - 查看進行中投票
\`!poll close [ID]\` - 結束投票

**Google Workspace (Phase 4)**:
\`!gcal\` - 查看今日會議
\`!gcal week\` - 查看本週會議
\`!notion [頁面]\` - 查看 Notion 頁面
\`!drive\` - 查看 Drive 資料夾
\`!workspace config\` - 設定整合

**其他命令**:
\`!templates\` - 列出所有範本
\`!cron status\` - 查看定時提醒狀態
\`!cron test moodGreeting\` - 測試心情問候

**Phase 7: 10項新功能**:
\`!phase7\` - Phase 7 幫助
\`!phase7 webhook add [類型]\` - 添加 Webhook (rss/github/pypi)
\`!phase7 webhook list\` - 查看 Webhook 列表
\`!phase7 greeting set [#channel]\` - 設定每日問候頻道
\`!phase7 voice join [#channel]\` - 設定 Voice 加入通知
\`!phase7 voice leave [#channel]\` - 設定 Voice 離開通知
\`!phase7 ondi set [#channel]\` - 設定「喺度」狀態頻道
\`!phase7 ondi history\` - 查看「喺度」歷史
\`!phase7 theme\` - 查看今日主題
\`!phase7 theme set [#channel]\` - 設定主題頻道
\`!phase7 stats\` - 查看使用統計
\`!stats\` - 快速查看統計 (捷徑)

**Phase 8: 6項新功能**:
\`!phase8\` - Phase 8 幫助
\`!phase8 notion enable [apiKey] [dbId]\` - 啟用 Notion 同步
\`!phase8 airtable enable [apiKey] [baseId]\` - 啟用 Airtable 同步
\`!phase8 jenkins enable [url]\` - 啟用 Jenkins 監控
\`!phase8 ci enable github\` - 啟用 GitHub Actions 監控
\`!phase8 deadline add [任務] [@user] [+1d]\` - 添加任務截止時間
\`!phase8 deadline list\` - 查看所有任務
\`!phase8 quiet on/off\` - 開關安靜時段
\`!phase8 quiet set [start] [end]\` - 設定安靜時段
\`!phase8 cleanup run\` - 執行每月清理
\`!phase8 archive run\` - 執行 Thread 封存

**捷徑命令**:
\`!deadline\` - 查看任務列表
\`!quiet status\` - 查看安靜時段
\`!archive list\` - 查看封存記錄

**Phase 9: 10項新功能**:
\`!thread [類型]\` - Thread 範本 (dailyLog/weeklyLog/projectUpdate/bugReport)
\`!forum list\` - 查看項目論壇
\`!forum create [項目]\` - 創建項目論壇
\`!menu\` - 顯示命令選單 (Select Menu)
\`!follow list\` - 查看 Channel Follow
\`!phase9\` - Phase 9 幫助

**Phase 11: Token 分析**:
\`!token summary\` - Token 使用摘要
\`!token trends [天數]\` - 使用趨勢
\`!token by-api\` - 按 API 分佈
\`!token by-model\` - 按 Model 分佈
\`!token cache\` - Cache 命中率
\`!token vlm\` - VLM 使用統計
\`!token daily [日期]\` - 每日詳細數據
\`!token import\` - 手動觸發 CSV 導入
\`!token report\` - 生成每日報告

**斜線指令 (Slash Commands)**:
\`/template\` - 獲取範本
\`/status\` - 查看狀態
\`/pomodoro\` - Pomodoro 計時器
\`/poll\` - 創建投票
\`/remind\` - 設定提醒
\`/gcal\` - 查看日曆
\`/help\` - 獲取幫助

**Pomodoro 衝刺計時器**:
\`!pomodoro\` - 幫助
\`!pomodoro start [任務]\` - 開始25分鐘衝刺
\`!pomodoro short\` - 短休息 (5分鐘)
\`!pomodoro long\` - 長休息 (15分鐘)
\`!pomodoro status\` - 查看狀態
\`!pomodoro stop\` - 停止
\`!pomodoro stats\` - 統計
\`!sprint [任務]\` - 快速開始衝刺

**心情天氣預報**:
\`!weather\` - 團隊天氣圖 (心情 + 天氣)
\`!weather today\` - 今日天氣
\`!weather forecast\` - 3日預報
\`!weather set [城市]\` - 設定位置
\`!moodweather\` - 快速查看團隊天氣圖

**快速使用**:
直接輸入 \`!template [類型]\` 或 \`!status set [任務]\``;
    await message.channel.send(helpText);
    return;
  }
  
  // !templates 列出所有範本
  if (subCommand === 'templates') {
    const list = Object.entries(templates.templates).map(([key, t]) => 
      `• \`!template ${key}\` - ${t.name}: ${t.description}`
    ).join('\n');
    await message.channel.send(`📋 **可用範本**:\n${list}`);
    return;
  }
  
  // !template 命令
  if (subCommand === 'template') {
    const templateKey = args[1]?.toLowerCase();
    const template = templates.templates[templateKey];
    
    if (!template) {
      await message.channel.send(`❌ 未知的範本類型: ${templateKey}\n使用 \`!templates\` 查看可用範本`);
      return;
    }
    
    // 填充默认值的範本
    const today = new Date().toLocaleDateString('zh-TW', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const formattedTemplate = template.format
      .replace(/{date}/g, today)
      .replace(/{owner}/g, message.author.displayName)
      .replace(/{reporter}/g, message.author.displayName)
      .replace(/{author}/g, message.author.displayName)
      .replace(/{completed}/g, '• ')
      .replace(/{inProgress}/g, '• ')
      .replace(/{nextSteps}/g, '• ')
      .replace(/{description}/g, '[描述問題]')
      .replace(/{solutionsTried}/g, '• ')
      .replace(/{neededHelp}/g, '[需要甚麼協助]')
      .replace(/{priority}/g, '🔶 中等')
      .replace(/{prTitle}/g, '[PR 標題]')
      .replace(/{prLink}/g, '[PR 連結]')
      .replace(/{summary}/g, '[變更摘要]')
      .replace(/{testing}/g, '• ')
      .replace(/{reviewFocus}/g, '[需要特別關注的地方]')
      .replace(/{yesterdayDone}/g, '• ')
      .replace(/{todayPlan}/g, '• ')
      .replace(/{blockers}/g, '• ')
      .replace(/{weeklyCompleted}/g, '• ')
      .replace(/{tasksCompleted}/g, '0')
      .replace(/{prMerged}/g, '0')
      .replace(/{reviewsDone}/g, '0')
      .replace(/{learnings}/g, '• ')
      .replace(/{nextWeekGoals}/g, '• ')
      .replace(/{weekOf}/g, new Date().toLocaleDateString('zh-TW', { 
        year: 'numeric', 
        month: 'long' 
      }));
    
    await message.channel.send(formattedTemplate);
    return;
  }
  
  // ==================== Phase 9: 10項新功能 ====================
  
  // !thread 命令 - Thread Templates
  if (subCommand === 'thread') {
    if (phase9 && phase9.handleThreadTemplateCommand) {
      const phase9Data = loadPhase9Data();
      await phase9.handleThreadTemplateCommand(message, args.slice(1), phase9Data);
    } else {
      await message.channel.send('📝 **Thread 範本**\n\n`!thread dailyLog` - 每日工作日誌\n`!thread weeklyLog` - 每週工作週報\n`!thread projectUpdate` - 項目更新\n`!thread bugReport` - Bug 報告');
    }
    return;
  }
  
  // !forum 命令 - Forum Channel
  if (subCommand === 'forum') {
    if (phase9 && phase9.handleForumCommand) {
      const phase9Data = loadPhase9Data();
      await phase9.handleForumCommand(message, args.slice(1), phase9Data);
    } else {
      await message.channel.send('📁 **Forum Channel 命令**\n\n`!forum list` - 查看所有項目論壇\n`!forum create [項目]` - 創建項目論壇');
    }
    return;
  }
  
  // !menu 命令 - 指令分類目錄 (Select Menu)
  if (subCommand === 'menu') {
    if (phase9 && phase9.sendCommandMenu) {
      const phase9Data = loadPhase9Data();
      await phase9.sendCommandMenu(message, phase9Data);
    } else {
      await message.channel.send('📋 請使用 `!help` 查看所有命令');
    }
    return;
  }
  
  // !follow 命令 - Channel Follow
  if (subCommand === 'follow') {
    if (phase9) {
      const phase9Data = loadPhase9Data();
      if (args[1]?.toLowerCase() === 'list') {
        const follows = phase9Data.channelFollow?.follows || [];
        if (follows.length === 0) {
          await message.channel.send('📋 暂无 Channel Follow');
        } else {
          let list = '📋 **Channel Follow 列表**\n\n';
          for (let i = 0; i < follows.length; i++) {
            list += `${i + 1}. 來源: ${follows[i].sourceChannel} → 目標: ${follows[i].targetChannel}\n`;
          }
          await message.channel.send(list);
        }
      } else {
        await message.channel.send('📋 **Channel Follow 命令**\n\n`!follow add [#來源] [#目標]` - 添加追蹤\n`!follow list` - 查看追蹤列表');
      }
    } else {
      await message.channel.send('❌ Channel Follow 功能未啟用');
    }
    return;
  }
  
  // !phase9 命令
  if (subCommand === 'phase9') {
    if (phase9 && phase9.handlePhase9Command) {
      const phase9Data = loadPhase9Data();
      await phase9.handlePhase9Command(message, args.slice(1), phase9Data);
    } else {
      await message.channel.send(`🔟 **Phase 9: 10項新功能建議**

**1. Thread Templates** - \`!thread\`
統一團隊工作日誌格式

**2. Forum Channel** - \`!forum\`
每個項目一個討論串

**3. 指令分類目錄** - \`!menu\`
Select Menu 選擇不同功能模組

**4. 斜線指令** - (/)
提升指令輸入效率 (需管理員權限)

**5. GitHub Webhook**
commit 和 PR 更新（已存在）

**6. Google Calendar**
新會議自動提醒（已存在，可加強）

**7. 番茄工作法**
定時詢問工作進展

**8. 狀態儀表板**
實時顯示團隊工作進度

**9. Channel Follow**
重要頻道消息跨伺服器共享

**10. Cron Job 提醒**
指定時間發送任務提醒`);
    }
    return;
  }
  
  // ==================== Phase 11: Token Analysis ====================
  
  // !token 命令 - Token 使用分析
  if (subCommand === 'token') {
    try {
      const { handleTokenCommand, handleTokenImport, handleTokenReport } = require('./phase11-commands');
      
      const tokenAction = args[1]?.toLowerCase();
      
      if (tokenAction === 'import') {
        await handleTokenImport(message, client);
      } else if (tokenAction === 'report') {
        await handleTokenReport(message, client);
      } else {
        await handleTokenCommand(message, args.slice(1));
      }
    } catch (err) {
      console.error('Token command error:', err);
      await message.channel.send('❌ Token 分析功能目前無法使用: ' + err.message);
    }
    return;
  }
  
  // !cron 命令
  if (subCommand === 'cron') {
    const cronAction = args[1]?.toLowerCase();
    const cronConfig = loadCronConfig();
    
    if (cronAction === 'status') {
      const status = `⏰ **定時提醒狀態**

**心情問候**: ${cronConfig.moodGreeting?.enabled ? '✅ 啟用' : '❌ 停用'}
• 時間: ${cronConfig.moodGreeting?.time || '09:00'}
• 日子: ${cronConfig.moodGreeting?.days?.join(', ') || 'Mon-Fri'}

**每日 Standup**: ${cronConfig.standup?.enabled ? '✅ 啟用' : '❌ 停用'}
• 時間: ${cronConfig.standup?.time || '09:00'}
• 日子: ${cronConfig.standup?.days?.join(', ') || 'Mon-Fri'}

**週報催交**: ${cronConfig.weekly?.enabled ? '✅ 啟用' : '❌ 停用'}
• 時間: ${cronConfig.weekly?.time || '17:00'}
• 日子: ${cronConfig.weekly?.days?.join(', ') || 'Friday'}`;
      await message.channel.send(status);
      return;
    }
    
    if (cronAction === 'test') {
      const testType = args[2]?.toLowerCase();
      if (testType === 'standup') {
        await message.channel.send(cronConfig.standup?.message || '測試訊息');
        return;
      }
      if (testType === 'weekly') {
        await message.channel.send(cronConfig.weekly?.message || '測試訊息');
        return;
      }
      if (testType === 'moodgreeting' || testType === 'mood') {
        await message.channel.send(cronConfig.moodGreeting?.message || '🌤️ **團隊心情問候**\n\n請用 `!mood [1-5]` 匯報今日心情！');
        return;
      }
      await message.channel.send('用法: !cron test [standup|weekly|moodGreeting]');
      return;
    }
    
    // cron config moodGreeting on/off/time/channel
    if (cronAction === 'config') {
      const configType = args[2]?.toLowerCase();
      const configAction = args[3]?.toLowerCase();
      
      if (configType === 'moodgreeting' || configType === 'mood') {
        if (configAction === 'on') {
          cronConfig.moodGreeting.enabled = true;
          saveCronConfig(cronConfig);
          await message.channel.send(`✅ 心情問候已啟用 @ ${cronConfig.moodGreeting.time}`);
          return;
        }
        if (configAction === 'off') {
          cronConfig.moodGreeting.enabled = false;
          saveCronConfig(cronConfig);
          await message.channel.send('❌ 心情問候已停用');
          return;
        }
        if (configAction === 'time' && args[4]) {
          cronConfig.moodGreeting.time = args[4];
          saveCronConfig(cronConfig);
          await message.channel.send(`✅ 心情問候時間已設定為 ${args[4]}`);
          return;
        }
        if (configAction === 'channel') {
          const channel = message.mentions.channels.first();
          if (!channel) {
            await message.channel.send('用法: !cron config moodGreeting channel [#channel]');
            return;
          }
          cronConfig.moodGreeting.channel = channel.id;
          saveCronConfig(cronConfig);
          await message.channel.send(`✅ 心情問候頻道已設定為 ${channel.name}`);
          return;
        }
        await message.channel.send('📋 **心情問候配置**:\n!cron config moodGreeting on/off\n!cron config moodGreeting time [HH:MM]\n!cron config moodGreeting channel [#channel]');
        return;
      }
      
      await message.channel.send('📋 **Cron 配置**:\n!cron config moodGreeting [on/off/time/channel]\n!cron config standup [on/off/time/channel]\n!cron config weekly [on/off/time/channel]');
      return;
    }
    
    await message.channel.send(`📋 **Cron 命令**:\n\`!cron status\` - 查看狀態\n\`!cron test standup\` - 測試 standup\n\`!cron test weekly\` - 測試週報\n\`!cron test moodGreeting\` - 測試心情問候\n\`!cron config moodGreeting on/off\` - 開關心情問候`);
    return;
  }
  
  // ==================== Phase 3: Status Commands ====================
  if (subCommand === 'status') {
    const statusAction = args[1]?.toLowerCase();
    const statusDB = loadStatusDB();
    const userId = message.author.id;
    const userName = message.author.displayName;
    
    // !status - 查看所有成員狀態 (Embed 卡片)
    if (!statusAction || statusAction === 'list') {
      const members = Object.entries(statusDB.members);
      if (members.length === 0) {
        await message.channel.send('📊 暫無成員狀態記錄');
        return;
      }
      
      // 創建 Embed 卡片
      const embed = new MessageEmbed()
        .setTitle('👥 團隊狀態')
        .setColor(0x00AAFF) // 藍色主題
        .setTimestamp();
      
      // 根據成員狀態決定顏色
      let overallColor = 0x00FF00; // 預設綠色
      const hasBlocked = members.some(([, data]) => data.status === 'blocked');
      const allDone = members.every(([, data]) => data.status === 'done');
      
      if (hasBlocked) {
        overallColor = 0xFFAA00; // 黃色 (有人受阻礙)
      } else if (allDone) {
        overallColor = 0x00AA00; // 深綠色 (全部完成)
      }
      
      embed.setColor(overallColor);
      
      // 添加每個成員的狀態字段
      for (const [uid, data] of members) {
        const statusEmoji = data.status === 'done' ? '✅' : data.status === 'blocked' ? '🚫' : '⏳';
        const statusText = data.status === 'done' ? '已完成' : data.status === 'blocked' ? '受阻礙' : '進行中';
        const startTime = new Date(data.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
        const updateTime = new Date(data.updatedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
        
        // 根據狀態選擇顏色
        let fieldColor = '🟢'; // 綠色 - 進行中
        if (data.status === 'done') fieldColor = '✅'; // 完成
        if (data.status === 'blocked') fieldColor = '🟡'; // 黃色 - 受阻礙
        
        embed.addFields({
          name: `${fieldColor} ${message.guild.members.cache.get(uid)?.displayName || 'Unknown'}`,
          value: `**狀態:** ${statusText}\n**任務:** ${data.task || '無'}\n**開始:** ${startTime}\n**更新:** ${updateTime}`,
          inline: true
        });
      }
      
      // 添加圖例
      embed.addFields({
        name: '\u200B',
        value: '🟢 進行中 | 🟡 受阻礙 | ✅ 已完成'
      });
      
      await message.channel.send({ embeds: [embed] });
      return;
    }
    
    // !status set [任務]
    if (statusAction === 'set' || statusAction === 'working') {
      const task = args.slice(2).join(' ') || '工作中';
      statusDB.members[userId] = {
        status: 'working',
        task: task,
        timestamp: Date.now(),
        updatedAt: new Date().toISOString()
      };
      saveStatusDB(statusDB);
      await message.channel.send(`⏳ **狀態更新** - ${userName}\n任務: ${task}`);
      return;
    }
    
    // !status done
    if (statusAction === 'done') {
      if (statusDB.members[userId]) {
        statusDB.members[userId].status = 'done';
        statusDB.members[userId].timestamp = Date.now();
        statusDB.members[userId].updatedAt = new Date().toISOString();
        saveStatusDB(statusDB);
        await message.channel.send(`✅ **任務完成** - ${userName}\n任務: ${statusDB.members[userId].task}`);
      } else {
        await message.channel.send('❌ 你沒有設定狀態，請先使用 !status set [任務]');
      }
      return;
    }
    
    // !status blocker [原因]
    if (statusAction === 'blocker' || statusAction === 'blocked') {
      const reason = args.slice(2).join(' ') || '未知阻礙';
      if (statusDB.members[userId]) {
        statusDB.members[userId].status = 'blocked';
        statusDB.members[userId].blocker = reason;
        statusDB.members[userId].timestamp = Date.now();
        statusDB.members[userId].updatedAt = new Date().toISOString();
        saveStatusDB(statusDB);
        await message.channel.send(`🚫 **受阻礙** - ${userName}\n原因: ${reason}`);
      } else {
        await message.channel.send('❌ 你沒有設定狀態，請先使用 !status set [任務]');
      }
      return;
    }
    
    // !status clear
    if (statusAction === 'clear') {
      delete statusDB.members[userId];
      saveStatusDB(statusDB);
      await message.channel.send(`🗑️ **狀態清除** - ${userName}`);
      return;
    }
    
    // Help
    await message.channel.send(`📊 **Status 命令**:
\`!status\` - 查看所有成員狀態
\`!status set [任務]\` - 設定當前狀態
\`!status done\` - 標記為完成
\`!status blocker [原因]\` - 標記阻礙
\`!status clear\` - 清除狀態`);
    return;
  }
  
  // ==================== 專案狀態命令 ====================
  if (subCommand === 'project' || subCommand === 'proj') {
    const projectName = args.slice(1).join(' ') || null;
    
    // 載入專案數據 (使用 phase9 的 forumChannels 配置)
    const phase9Data = loadPhase9Data();
    const projects = phase9Data?.forumChannels?.projects || {};
    
    // 如果沒有指定專案，列出所有專案
    if (!projectName) {
      const projectList = Object.entries(projects).map(([key, p]) => 
        `• \`${key}\` - ${p.description}`
      ).join('\n');
      
      const embed = new MessageEmbed()
        .setTitle('🚀 專案列表')
        .setColor(0x00AAFF)
        .setDescription(projectList || '暫無專案記錄')
        .addFields({
          name: '使用方式',
          value: '`!project [專案名稱]` - 查看專案狀態\n`!project list` - 列出所有專案'
        });
      
      await message.channel.send({ embeds: [embed] });
      return;
    }
    
    // 查找專案
    const projectKey = projectName.toLowerCase().replace(/\s+/g, '-');
    const project = projects[projectKey];
    
    // 模擬專案數據 (可以擴展為從真實數據源讀取)
    const mockProjectData = {
      'ai-learning': { progress: 75, status: 'active', lastUpdate: '2026-03-22', members: ['Alice', 'Bob'], description: 'AI 學習網站專案' },
      'virtual-office': { progress: 90, status: 'active', lastUpdate: '2026-03-22', members: ['Charlie', 'David'], description: '虛擬辦公室 Discord Bot' },
      'lsc-ole-s1-2026': { progress: 40, status: 'planning', lastUpdate: '2026-03-20', members: ['Eve'], description: 'LSC OLE S1 2026' },
      'homework-duty-system': { progress: 60, status: 'active', lastUpdate: '2026-03-21', members: ['Frank', 'Grace'], description: '功課值班系統' },
      'math-week-2026': { progress: 25, status: 'planning', lastUpdate: '2026-03-19', members: ['Henry'], description: '數學周 2026' },
      'teacher-dev-day': { progress: 15, status: 'planning', lastUpdate: '2026-03-18', members: ['Ivy'], description: '教師發展日' }
    };
    
    const data = mockProjectData[projectKey] || { 
      progress: 50, 
      status: 'unknown', 
      lastUpdate: new Date().toISOString().split('T')[0],
      members: ['待定'],
      description: `專案: ${projectName}`
    };
    
    // 根據進度決定顏色
    let progressColor = 0xFF0000; // 紅色 - 落後
    if (data.progress >= 75) progressColor = 0x00FF00; // 綠色 - 順利
    else if (data.progress >= 50) progressColor = 0xFFAA00; // 黃色 - 一般
    else if (data.progress >= 25) progressColor = 0xFF6600; // 橙色 - 需關注
    
    // 狀態 emoji
    const statusEmoji = data.status === 'active' ? '🟢' : data.status === 'planning' ? '🔵' : '⚪';
    const statusText = data.status === 'active' ? '進行中' : data.status === 'planning' ? '規劃中' : '未知';
    
    // 進度條
    const progressBar = '█'.repeat(Math.floor(data.progress / 10)) + '░'.repeat(10 - Math.floor(data.progress / 10));
    
    const embed = new MessageEmbed()
      .setTitle(`${statusEmoji} ${projectName} - ${data.description}`)
      .setColor(progressColor)
      .setTimestamp()
      .addFields(
        { name: '📊 進度', value: `${progressBar} ${data.progress}%`, inline: true },
        { name: '🏷️ 狀態', value: statusText, inline: true },
        { name: '📅 更新', value: data.lastUpdate, inline: true },
        { name: '👥 成員', value: data.members.join(', ') || '待定', inline: false }
      )
      .setFooter({ text: `專案代碼: ${projectKey}` });
    
    await message.channel.send({ embeds: [embed] });
    return;
  }
  
  // ==================== Phase 3: Standup Commands ====================
  if (subCommand === 'standup') {
    const standupAction = args[1]?.toLowerCase();
    const standupDB = loadStandupDB();
    const userId = message.author.id;
    const userName = message.author.displayName;
    const today = new Date().toISOString().split('T')[0];
    
    // !standup - 獲取範本
    if (!standupAction) {
      const template = `📝 **每日 Standup 範本**

**昨日完成:**
• 

**今日計劃:**
• 

**阻礙:**
• 無

---
💡 使用 \`!standup reply\` 回覆今日 Standup`;
      await message.channel.send(template);
      return;
    }
    
    // !standup reply - 回覆 Standup
    if (standupAction === 'reply') {
      // 檢查是否已有今日 Standup
      const existing = standupDB.standups.find(s => s.date === today && s.userId === userId);
      if (existing) {
        await message.channel.send('⚠️ 你今日已提交 Standup，請先使用 !standup edit 編輯');
        return;
      }
      
      // 建立 thread 收集回覆
      const threadName = `${userName} - ${today} Standup`;
      const thread = await message.channel.threads.create({
        name: threadName,
        autoArchiveDuration: 1440
      });
      
      await thread.send(`📝 **${userName} 的 Standup**

請回覆以下問題：
1. **昨日完成:** 
2. **今日計劃:**
3. **阻礙:** (如無請寫「無」)

---
💡 在此 Thread 內回覆即可`);
      await message.channel.send(`✅ 已為你建立 Standup Thread: ${thread}`);
      return;
    }
    
    // !standup list - 查看今日 Standup
    if (standupAction === 'list') {
      const todayStandups = standupDB.standups.filter(s => s.date === today);
      if (todayStandups.length === 0) {
        await message.channel.send('📝 今日尚未有 Standup 記錄');
        return;
      }
      
      let list = `📝 **今日 Standup (${today})**\n\n`;
      for (const s of todayStandups) {
        list += `👤 <@${s.userId}>\n`;
        list += `   昨日: ${s.yesterday}\n`;
        list += `   今日: ${s.today}\n`;
        list += `   阻礙: ${s.blockers}\n\n`;
      }
      await message.channel.send(list);
      return;
    }
    
    // !standup summary - 生成摘要
    if (standupAction === 'summary') {
      const todayStandups = standupDB.standups.filter(s => s.date === today);
      if (todayStandups.length === 0) {
        await message.channel.send('📝 今日尚未有 Standup 記錄');
        return;
      }
      
      let completed = [];
      let plans = [];
      let blockers = [];
      
      for (const s of todayStandups) {
        if (s.yesterday && s.yesterday !== '• ') completed.push(`• ${s.yesterday}`);
        if (s.today && s.today !== '• ') plans.push(`• ${s.today}`);
        if (s.blockers && s.blockers !== '• ' && s.blockers !== '無') blockers.push(`• ${s.blockers}`);
      }
      
      const summary = `📊 **Standup 摘要 - ${today}**

**昨日完成:**
${completed.length ? completed.join('\n') : '• 無'}

**今日計劃:**
${plans.length ? plans.join('\n') : '• 無'}

**阻礙:**
${blockers.length ? blockers.join('\n') : '• 無'}

---
📝 共 ${todayStandups.length} 位成員提交`;
      await message.channel.send(summary);
      return;
    }
    
    await message.channel.send(`📝 **Standup 命令**:
\`!standup\` - 獲取範本
\`!standup reply\` - 回覆今日 Standup
\`!standup list\` - 查看今日 Standup
\`!standup summary\` - 生成摘要`);
    return;
  }
  
  // ==================== Phase 3/6/9: Unified Dashboard Commands ====================
  if (subCommand === 'dashboard' || subCommand === '儀表板') {
    // 處理舊版 Phase 3 命令 (向後兼容)
    const dashAction = args[1]?.toLowerCase();
    const dashConfig = loadDashboardConfig();
    
    // !dashboard set [type] [url] - 舊版外部連結設定
    if (dashAction === 'set') {
      const linkType = args[2]?.toLowerCase();
      const url = args.slice(3).join(' ');
      
      if (!linkType || !url) {
        await message.channel.send('用法: !dashboard set [sheets|notion|linear] [URL]');
        return;
      }
      
      if (linkType === 'sheets' || linkType === 'googlesheets') {
        dashConfig.links.googleSheets = url;
      } else if (linkType === 'notion') {
        dashConfig.links.notion = url;
      } else if (linkType === 'linear') {
        dashConfig.links.linear = url;
      } else {
        await message.channel.send('❌ 未知的類型，請使用 sheets、notion 或 linear');
        return;
      }
      
      saveDashboardConfig(dashConfig);
      await message.channel.send(`✅ 已設定 ${linkType} 連結: ${url}`);
      return;
    }
    
    // !dashboard pin - 舊版置頂訊息
    if (dashAction === 'pin') {
      let content = '📈 **專案進度儀表板**\n\n';
      
      if (dashConfig.links.googleSheets) {
        content += `📊 Google Sheets: <${dashConfig.links.googleSheets}>\n`;
      }
      if (dashConfig.links.notion) {
        content += `📝 Notion: <${dashConfig.links.notion}>\n`;
      }
      if (dashConfig.links.linear) {
        content += `✅ Linear: <${dashConfig.links.linear}>\n`;
      }
      
      const pinMsg = await message.channel.send(content);
      await pinMsg.pin();
      dashConfig.pinnedMessageId = pinMsg.id;
      saveDashboardConfig(dashConfig);
      await message.channel.send('✅ 已置頂儀表板訊息');
      return;
    }
    
    // !dashboard weekly - 舊版每週報告
    if (dashAction === 'weekly') {
      // 使用 unified dashboard 的每週報告
      if (!unifiedDashboard) {
        await message.channel.send('❌ 統一儀表板模組未正確載入');
        return;
      }
      const phase9Data = unifiedDashboard.loadPhase9Data();
      const phase6Data = unifiedDashboard.loadPhase6Data();
      await unifiedDashboard.handleDashboardCommand(message, ['full'], phase9Data, phase6Data, phase9Data);
      return;
    }
    
    // !dashboard links - 查看外部連結 (舊版行為)
    if (dashAction === 'links' || dashAction === 'link') {
      let links = '📈 **外部儀表板連結**\n\n';
      
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
      
      await message.channel.send(links);
      return;
    }
    
    // 使用統一儀表板 (新版本)
    if (!unifiedDashboard) {
      await message.channel.send('❌ 統一儀表板模組未正確載入');
      return;
    }
    
    const phase9Data = unifiedDashboard.loadPhase9Data();
    const phase6Data = unifiedDashboard.loadPhase6Data();
    await unifiedDashboard.handleDashboardCommand(message, args.slice(1), phase9Data, phase6Data, phase9Data);
    return;
  }
  
  // ==================== Phase 4: Keyword Subscription ====================
  if (subCommand === 'keyword' || subCommand === 'kw') {
    const keywordAction = args[1]?.toLowerCase();
    const keywordDB = loadKeywordDB();
    const userId = message.author.id;
    const userName = message.author.displayName;
    
    // !keyword add [關鍵詞]
    if (keywordAction === 'add' || keywordAction === 'subscribe') {
      const keyword = args.slice(2).join(' ').trim();
      if (!keyword) {
        await message.channel.send('用法: !keyword add [關鍵詞]\n例如: !keyword add 緊急維護');
        return;
      }
      
      if (!keywordDB.subscriptions[userId]) {
        keywordDB.subscriptions[userId] = [];
      }
      
      // 檢查是否已存在
      if (keywordDB.subscriptions[userId].includes(keyword)) {
        await message.channel.send(`⚠️ 你已經訂閱了「${keyword}」`);
        return;
      }
      
      keywordDB.subscriptions[userId].push(keyword);
      saveKeywordDB(keywordDB);
      await message.channel.send(`✅ 已訂閱關鍵詞: 「${keyword}」\n當有人提到呢個關鍵詞時，你會收到通知`);
      return;
    }
    
    // !keyword remove [關鍵詞]
    if (keywordAction === 'remove' || keywordAction === 'delete' || keywordAction === 'unsubscribe') {
      const keyword = args.slice(2).join(' ').trim();
      if (!keyword) {
        await message.channel.send('用法: !keyword remove [關鍵詞]');
        return;
      }
      
      if (!keywordDB.subscriptions[userId] || !keywordDB.subscriptions[userId].includes(keyword)) {
        await message.channel.send(`❌ 你並沒有訂閱「${keyword}」`);
        return;
      }
      
      keywordDB.subscriptions[userId] = keywordDB.subscriptions[userId].filter(k => k !== keyword);
      saveKeywordDB(keywordDB);
      await message.channel.send(`✅ 已取消訂閱: 「${keyword}」`);
      return;
    }
    
    // !keyword list - 查看已訂閱關鍵詞
    if (keywordAction === 'list' || keywordAction === 'ls') {
      const userSubs = keywordDB.subscriptions[userId] || [];
      if (userSubs.length === 0) {
        await message.channel.send(`📝 你暫時未有訂閱任何關鍵詞\n用法: !keyword add [關鍵詞]`);
        return;
      }
      
      await message.channel.send(`📝 **${userName} 的關鍵詞訂閱**\n\n${userSubs.map(k => `• 「${k}」`).join('\n')}`);
      return;
    }
    
    // !keyword formats - 查看公告格式
    if (keywordAction === 'formats' || keywordAction === 'format') {
      const formats = `🏷️ **統一公告格式**

可以用以下格式發佈公告，相關成員會自動收到通知：

• \`[決定]\` - 重要決定，相關人士會收到通知
• \`[需要回覆]\` - 需要某人回覆，標記並通知
• \`[緊急]\` - 緊急事項，通知所有人
• \`[會議]\` - 會議相關，會議成員會收到通知
• \`[審查]\` - 審查請求，相關審批者會收到通知

**使用範例**:
[決定] Phase 4 將於下週一啟用
[需要回覆] @username 請確認呢個 PR
[緊急] 系統出現問題，需要立即處理`;
      await message.channel.send(formats);
      return;
    }
    
    // !keyword clear - 清除所有訂閱
    if (keywordAction === 'clear') {
      delete keywordDB.subscriptions[userId];
      saveKeywordDB(keywordDB);
      await message.channel.send(`✅ 已清除所有關鍵詞訂閱`);
      return;
    }
    
    await message.channel.send(`🏷️ **關鍵詞訂閱命令**:
\`!keyword add [關鍵詞]\` - 訂閱關鍵詞
\`!keyword remove [關鍵詞]\` - 取消訂閱
\`!keyword list\` - 查看已訂閱
\`!keyword formats\` - 查看公告格式
\`!keyword clear\` - 清除所有訂閱`);
    return;
  }
  
  // ==================== Phase 4: Poll Commands ====================
  if (subCommand === 'poll' || subCommand === 'vote') {
    const pollAction = args[1]?.toLowerCase();
    const pollDB = loadPollDB();
    const userId = message.author.id;
    const userName = message.author.displayName;
    
    // !poll [問題] [選項1] [選項2] ...
    if (!pollAction || pollAction === 'create') {
      // 解析投票內容
      let pollText = args.slice(1).join(' ');
      
      // 檢查是否使用快速格式:問題|選項1|選項2
      if (pollText.includes('|')) {
        const parts = pollText.split('|').map(p => p.trim());
        const question = parts[0];
        const options = parts.slice(1);
        
        if (options.length < 2) {
          await message.channel.send('❌ 投票需要至少2個選項\n用法: !poll [問題]|[選項1]|[選項2]');
          return;
        }
        
        const pollId = `poll_${Date.now()}`;
        const poll = {
          id: pollId,
          question,
          options: options.map((opt, i) => ({ label: opt, votes: 0, voters: [] })),
          creator: userId,
          creatorName: userName,
          createdAt: Date.now(),
          expiresAt: Date.now() + (pollDB.defaultDuration * 1000),
          urgent: false,
          messageId: null
        };
        
        pollDB.polls.push(poll);
        savePollDB(pollDB);
        
        // 發送投票訊息
        const optionText = options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
        const pollMessage = await message.channel.send(`📊 **投票: ${question}**

${optionText}

⏰ 截止時間: ${new Date(poll.expiresAt).toLocaleString('zh-TW')}
👤 發起人: ${userName}

回覆數字投票 (1-${options.length})`);
        
        poll.messageId = pollMessage.id;
        savePollDB(pollDB);
        
        await message.channel.send(`✅ 投票已創建 (ID: ${pollId})`);
        return;
      }
      
      // 一般格式: !poll 問題 選項1 選項2
      const remainingArgs = args.slice(1);
      if (remainingArgs.length < 3) {
        await message.channel.send(`📊 **投票命令**

**一般用法**:
\`!poll [問題] [選項1] [選項2] [選項3]...\`

**快速格式** (用 | 分隔):
\`!poll 今晚開會嗎？|係|唔係\`
\`!poll 優先做邊個？|緊急|中等|唔急\`

**快速投票**:
\`!poll quick yesno\` - 係/唔係
\`!poll quick priority\` - 緊急/中等/唔急
\`!poll urgent [問題]\` - 緊急投票 (24小時)

**其他**:
\`!poll list\` - 查看進行中投票
\`!poll close [ID]\` - 結束投票`);
        return;
      }
      
      const question = remainingArgs[0];
      const options = remainingArgs.slice(1);
      
      if (options.length < 2) {
        await message.channel.send('❌ 投票需要至少2個選項');
        return;
      }
      
      const pollId = `poll_${Date.now()}`;
      const poll = {
        id: pollId,
        question,
        options: options.map((opt, i) => ({ label: opt, votes: 0, voters: [] })),
        creator: userId,
        creatorName: userName,
        createdAt: Date.now(),
        expiresAt: Date.now() + (pollDB.defaultDuration * 1000),
        urgent: false,
        messageId: null
      };
      
      pollDB.polls.push(poll);
      savePollDB(pollDB);
      
      const optionText = options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
      const pollMessage = await message.channel.send(`📊 **投票: ${question}**

${optionText}

⏰ 截止時間: ${new Date(poll.expiresAt).toLocaleString('zh-TW')}
👤 發起人: ${userName}

回覆數字投票 (1-${options.length})`);
      
      poll.messageId = pollMessage.id;
      savePollDB(pollDB);
      
      await message.channel.send(`✅ 投票已創建 (ID: ${pollId})`);
      return;
    }
    
    // !poll quick [類型]
    if (pollAction === 'quick' || pollAction === 'q') {
      const quickType = args[2]?.toLowerCase();
      const question = args.slice(3).join(' ');
      
      let options = [];
      if (quickType === 'yesno' || quickType === 'yn') {
        options = pollDB.quickOptions.yesno || ['✅ 係', '❌ 唔係'];
      } else if (quickType === 'priority' || quickType === 'p') {
        options = pollDB.quickOptions.priority || ['🔴 緊急', '🟡 中等', '🟢 唔急'];
      } else if (quickType === 'status' || quickType === 's') {
        options = pollDB.quickOptions.status || ['✅ 進行中', '⏸️ 暂停', '❌ 取消'];
      } else {
        await message.channel.send(`📊 **快速投票類型**:
\`!poll quick yesno\` - 係/唔係
\`!poll quick priority\` - 緊急/中等/唔急
\`!poll quick status\` - 進行中/暂停/取消

可以加問題: \`!poll quick yesno 今晚開會？\``);
        return;
      }
      
      const finalQuestion = question || '請表態';
      const pollId = `poll_${Date.now()}`;
      const poll = {
        id: pollId,
        question: finalQuestion,
        options: options.map((opt, i) => ({ label: opt, votes: 0, voters: [] })),
        creator: userId,
        creatorName: userName,
        createdAt: Date.now(),
        expiresAt: Date.now() + (pollDB.defaultDuration * 1000),
        urgent: false,
        quickType,
        messageId: null
      };
      
      pollDB.polls.push(poll);
      savePollDB(pollDB);
      
      const optionText = options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
      const pollMessage = await message.channel.send(`📊 **投票: ${finalQuestion}**

${optionText}

⏰ 截止時間: ${new Date(poll.expiresAt).toLocaleString('zh-TW')}
👤 發起人: ${userName}

回覆數字投票 (1-${options.length})`);
      
      poll.messageId = pollMessage.id;
      savePollDB(pollDB);
      
      await message.channel.send(`✅ 快速投票已創建 (ID: ${pollId})`);
      return;
    }
    
    // !poll urgent [問題]
    if (pollAction === 'urgent' || pollAction === 'u') {
      const pollText = args.slice(2).join(' ');
      
      // 解析格式: 問題|選項1|選項2
      let question, options;
      if (pollText.includes('|')) {
        const parts = pollText.split('|').map(p => p.trim());
        question = parts[0];
        options = parts.slice(1);
      } else {
        // 嘗試從常見問題中猜測
        question = pollText;
        options = ['✅ 同意', '❌ 不同意'];
      }
      
      if (!question) {
        await message.channel.send('用法: !poll urgent [問題]|[選項1]|[選項2]\n例如: !poll urgent 緊急維護？|同意|反對');
        return;
      }
      
      if (options.length < 2) {
        options = ['✅ 同意', '❌ 不同意'];
      }
      
      const pollId = `poll_${Date.now()}`;
      const urgentDuration = 24 * 60 * 60 * 1000; // 24小時
      
      const poll = {
        id: pollId,
        question,
        options: options.map((opt, i) => ({ label: opt, votes: 0, voters: [] })),
        creator: userId,
        creatorName: userName,
        createdAt: Date.now(),
        expiresAt: Date.now() + urgentDuration,
        urgent: true,
        messageId: null
      };
      
      pollDB.polls.push(poll);
      savePollDB(pollDB);
      
      const optionText = options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
      const pollMessage = await message.channel.send(`🚨 **緊急投票: ${question}**

${optionText}

⏰ 緊急截止: 24小時內
👤 發起人: ${userName}

回覆數字投票 (1-${options.length})`);
      
      poll.messageId = pollMessage.id;
      savePollDB(pollDB);
      
      await message.channel.send(`🚨 緊急投票已創建 (ID: ${pollId})\n請盡快回覆！`);
      return;
    }
    
    // !poll list - 查看投票
    if (pollAction === 'list' || pollAction === 'ls') {
      const activePolls = pollDB.polls.filter(p => Date.now() < p.expiresAt);
      
      if (activePolls.length === 0) {
        await message.channel.send('📊 目前沒有進行中的投票');
        return;
      }
      
      let list = '📊 **進行中投票**\n\n';
      for (const poll of activePolls) {
        const emoji = poll.urgent ? '🚨' : '📊';
        const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
        const timeLeft = Math.round((poll.expiresAt - Date.now()) / (1000 * 60));
        list += `${emoji} **${poll.question}**\n`;
        list += `   ID: \`${poll.id}\` | 投票: ${totalVotes} | 剩餘: ${timeLeft}分鐘\n`;
        list += `   選項: ${poll.options.map(o => o.label).join(' | ')}\n\n`;
      }
      
      await message.channel.send(list);
      return;
    }
    
    // !poll close [ID]
    if (pollAction === 'close' || pollAction === 'end') {
      const pollId = args[2];
      
      if (!pollId) {
        await message.channel.send('用法: !poll close [投票ID]');
        return;
      }
      
      const pollIndex = pollDB.polls.findIndex(p => p.id === pollId);
      if (pollIndex === -1) {
        await message.channel.send(`❌ 找不到投票: ${pollId}`);
        return;
      }
      
      const poll = pollDB.polls[pollIndex];
      
      // 檢查權限
      if (poll.creator !== userId) {
        await message.channel.send('❌ 只有發起人可以結束呢個投票');
        return;
      }
      
      poll.expiresAt = Date.now(); // 立即結束
      savePollDB(pollDB);
      
      // 找出最高票
      const maxVotes = Math.max(...poll.options.map(o => o.votes));
      const winners = poll.options.filter(o => o.votes === maxVotes);
      const winnerText = winners.map(w => w.label).join('、');
      
      const result = `📊 **投票結果: ${poll.question}**

${poll.options.map(o => `${o.label}: ${o.votes}票`).join('\n')}

🏆 **結果: ${winnerText}**
👤 發起人: ${poll.creatorName}
📊 總投票數: ${poll.options.reduce((sum, o) => sum + o.votes, 0)}`;

      await message.channel.send(result);
      return;
    }
    
    // !poll result [ID]
    if (pollAction === 'result' || pollAction === 'r') {
      const pollId = args[2];
      
      if (!pollId) {
        await message.channel.send('用法: !poll result [投票ID]');
        return;
      }
      
      const poll = pollDB.polls.find(p => p.id === pollId);
      if (!poll) {
        await message.channel.send(`❌ 找不到投票: ${pollId}`);
        return;
      }
      
      const maxVotes = Math.max(...poll.options.map(o => o.votes));
      const winners = poll.options.filter(o => o.votes === maxVotes);
      const winnerText = winners.map(w => w.label).join('、');
      
      const result = `📊 **投票結果: ${poll.question}**

${poll.options.map(o => {
  const percent = poll.options.reduce((s, opt) => s + opt.votes, 0) > 0 
    ? Math.round((o.votes / poll.options.reduce((s, opt) => s + opt.votes, 0)) * 100) 
    : 0;
  const bar = '█'.repeat(Math.floor(percent / 10)) + '░'.repeat(10 - Math.floor(percent / 10));
  return `${o.label}: ${o.votes}票 (${percent}%) ${bar}`;
}).join('\n')}

🏆 **領先: ${winnerText}**`;
      
      await message.channel.send(result);
      return;
    }
    
    await message.channel.send(`📊 **投票命令**:
\`!poll [問題]|[選項1]|[選項2]\` - 創建投票
\`!poll quick yesno\` - 快速投票
\`!poll urgent [問題]\` - 緊急投票
\`!poll list\` - 查看進行中投票
\`!poll close [ID]\` - 結束投票
\`!poll result [ID]\` - 查看結果`);
    return;
  }
  
  // ==================== Phase 4: Google Workspace Commands ====================
  if (subCommand === 'gcal' || subCommand === 'calendar') {
    const gcalAction = args[1]?.toLowerCase();
    const workspaceConfig = loadWorkspaceConfig();
    
    // 檢查是否已設定
    if (!workspaceConfig.google?.calendar?.enabled) {
      await message.channel.send(`📅 **Google Calendar 整合**

目前未設定 Google Calendar 整合。

**設定方法**:
1. 設定 Google Service Account
2. 使用 \`!workspace config gcal enable [calendarId]\` 啟用

**目前功能**:
\`!gcal\` - 查看今日會議
\`!gcal week\` - 查看本週會議
\`!gcal tomorrow\` - 查看明日會議

---
💡 如需設定，請聯繫管理員`);
      return;
    }
    
    // !gcal - 查看今日
    if (!gcalAction || gcalAction === 'today' || gcalAction === 'now') {
      const mockEvents = [
        { title: 'Team Standup', time: '09:00 - 09:30', attendees: ['全體'] },
        { title: 'Project Review', time: '14:00 - 15:00', attendees: ['開發組'] }
      ];
      
      let msg = '📅 **今日會議**\n\n';
      if (mockEvents.length === 0) {
        msg += '今日沒有會議安排';
      } else {
        for (const event of mockEvents) {
          msg += `🕐 ${event.time}\n`;
          msg += `📌 ${event.title}\n`;
          msg += `👥 參加者: ${event.attendees.join(', ')}\n\n`;
        }
      }
      msg += '---\n💡 使用 `!workspace config gcal enable` 連接真實 Calendar';
      await message.channel.send(msg);
      return;
    }
    
    // !gcal week
    if (gcalAction === 'week' || gcalAction === 'weekend') {
      const mockWeekEvents = [
        { day: '星期一', title: 'Team Standup', time: '09:00' },
        { day: '星期三', title: 'Sprint Planning', time: '14:00' },
        { day: '星期五', title: 'Weekend Review', time: '17:00' }
      ];
      
      let msg = '📅 **本週會議**\n\n';
      for (const event of mockWeekEvents) {
        msg += `📌 ${event.day}: ${event.title} (${event.time})\n`;
      }
      msg += '---\n💡 使用 `!workspace config gcal enable` 連接真實 Calendar';
      await message.channel.send(msg);
      return;
    }
    
    // !gcal tomorrow
    if (gcalAction === 'tomorrow' || gcalAction === 'next') {
      await message.channel.send('📅 **明日會議**\n\n目前沒有明日會議安排\n\n💡 使用 `!workspace config gcal enable` 連接真實 Calendar');
      return;
    }
    
    await message.channel.send(`📅 **Google Calendar 命令**:
\`!gcal\` - 查看今日會議
\`!gcal week\` - 查看本週會議
\`!gcal tomorrow\` - 查看明日會議`);
    return;
  }
  
  // ==================== Phase 4: Notion Commands ====================
  if (subCommand === 'notion' || subCommand === 'note') {
    const notionAction = args[1]?.toLowerCase();
    const workspaceConfig = loadWorkspaceConfig();
    const userId = message.author.id;
    const userName = message.author.displayName;
    
    // 檢查是否已設定
    if (!workspaceConfig.notion?.enabled) {
      await message.channel.send(`📝 **Notion 整合**

目前未設定 Notion 整合。

**設定方法**:
1. 取得 Notion API Key
2. 使用 \`!workspace config notion enable [databaseId]\` 啟用

**目前功能**:
\`!notion\` - 查看可用頁面
\`!notion [頁面名]\` - 查看頁面內容
\`!notion recent\` - 最近更新

---
💡 檔案統一存放於 Google Drive，Discord 只作索引和討論用途`);
    return;
  }
  
  // !notion - 查看頁面列表
    if (!notionAction || notionAction === 'list' || notionAction === 'ls') {
      const mockPages = [
        { name: '📋 項目筆記', description: '所有項目相關文件' },
        { name: '📝 會議記錄', description: '每週會議摘要' },
        { name: '📚 學習資源', description: '教程和文檔' },
        { name: '🎯 目標追蹤', description: '季度目標進度' }
      ];
      
      let msg = '📝 **Notion 頁面**\n\n';
      for (const page of mockPages) {
        msg += `${page.name}\n   ${page.description}\n\n`;
      }
      msg += '---\n💡 使用 `!notion [頁面名]` 查看詳細內容';
      await message.channel.send(msg);
      return;
    }
    
    // !notion recent
    if (notionAction === 'recent' || notionAction === 'updates') {
      await message.channel.send(`📝 **最近更新**

• 📋 項目筆記 - 2小時前更新
• 📝 會議記錄 - 昨日更新
• 📚 學習資源 - 3日前更新

---
💡 使用 \`!workspace config notion enable\` 連接真實 Notion`);
      return;
    }
    
    // !notion [頁面名] - 查看頁面
    const pageName = args.slice(1).join(' ');
    const mockContent = {
      '項目筆記': '## Phase 4 開發進度\n\n- [x] 關鍵詞訂閱\n- [x] Poll 投票功能\n- [ ] Google Calendar 整合\n- [ ] Notion 整合',
      '會議記錄': '## 2026-03-21 會議摘要\n\n- 確認 Phase 4 功能範圍\n- 分配開發任務\n- 下週目標',
      '學習資源': '## 可用學習資源\n\n- JavaScript 進階教程\n- Discord Bot 開發指南\n- API 整合文檔',
      '目標追蹤': '## Q1 2026 目標\n\n- 完成 Phase 4: 50%\n- 提升團隊效率: 30%\n- 文檔完善: 70%'
    };
    
    const content = mockContent[pageName] || `📝 **${pageName || '頁面'}**

呢個係 ${pageName || '頁面'} 嘅內容示例。

Notion 整合需要先設定 API Key。

---
💡 使用 \`!workspace config notion enable [databaseId]\` 設定`;
    
    await message.channel.send(content);
    return;
  }
  
  // ==================== Phase 4: Drive Commands ====================
  
  // ==================== Phase 4: Drive Commands ====================
  if (subCommand === 'drive' || subCommand === 'gdrive') {
    const workspaceConfig = loadWorkspaceConfig();
    
    // 檢查是否已設定
    if (!workspaceConfig.google?.drive?.enabled) {
      await message.channel.send(`📁 **Google Drive 整合**

目前未設定 Google Drive 整合。

**設定方法**:
1. 建立共用資料夾
2. 使用 \`!workspace config drive enable [folderId]\` 啟用

**功能**:
\`!drive\` - 查看資料夾連結
\`!drive upload [名稱]\` - 模擬上傳
\`!drive recent\` - 最近檔案

---
💡 檔案統一存放於 Google Drive，Discord 只作索引和討論用途`);
      return;
    }
    
    const folderLink = workspaceConfig.google.drive.folderLink || 'https://drive.google.com/drive/folders/example';
    
    await message.channel.send(`📁 **虛擬辦公室 Drive**

📂 共用資料夾: <${folderLink}>

**最近檔案**:
• 📄 Phase4-計劃.docx - 昨日
• 📊 會議記錄.docx - 2日前
• 📋 週報模板.xlsx - 3日前

---
💡 檔案統一存放於 Google Drive，Discord 只作索引和討論用途`);
    return;
  }
  
  // ==================== Phase 4: Workspace Config Commands ====================
  if (subCommand === 'workspace' || subCommand === 'ws') {
    const wsAction = args[1]?.toLowerCase();
    const wsConfig = loadWorkspaceConfig();
    
    // !workspace config
    if (wsAction === 'config' || wsAction === 'setup') {
      const configType = args[2]?.toLowerCase();
      const configAction = args[3]?.toLowerCase();
      const configValue = args.slice(4).join(' ');
      
      // !workspace config gcal enable [calendarId]
      if (configType === 'gcal' || configType === 'calendar') {
        if (configAction === 'enable') {
          wsConfig.google = wsConfig.google || {};
          wsConfig.google.calendar = wsConfig.google.calendar || {};
          wsConfig.google.calendar.enabled = true;
          wsConfig.google.calendar.calendarId = configValue || 'primary';
          saveWorkspaceConfig(wsConfig);
          await message.channel.send(`✅ Google Calendar 已啟用\n📅 Calendar ID: ${configValue || 'primary'}`);
          return;
        }
        if (configAction === 'disable') {
          if (wsConfig.google?.calendar) {
            wsConfig.google.calendar.enabled = false;
            saveWorkspaceConfig(wsConfig);
          }
          await message.channel.send('❌ Google Calendar 已停用');
          return;
        }
      }
      
      // !workspace config notion enable [databaseId]
      if (configType === 'notion') {
        if (configAction === 'enable') {
          wsConfig.notion = wsConfig.notion || {};
          wsConfig.notion.enabled = true;
          wsConfig.notion.databaseId = configValue || 'example';
          saveWorkspaceConfig(wsConfig);
          await message.channel.send(`✅ Notion 已啟用\n📝 Database ID: ${configValue || 'example'}`);
          return;
        }
        if (configAction === 'disable') {
          if (wsConfig.notion) {
            wsConfig.notion.enabled = false;
            saveWorkspaceConfig(wsConfig);
          }
          await message.channel.send('❌ Notion 已停用');
          return;
        }
      }
      
      // !workspace config drive enable [folderId]
      if (configType === 'drive' || configType === 'gdrive') {
        if (configAction === 'enable') {
          wsConfig.google = wsConfig.google || {};
          wsConfig.google.drive = wsConfig.google.drive || {};
          wsConfig.google.drive.enabled = true;
          wsConfig.google.drive.folderId = configValue || 'example';
          wsConfig.google.drive.folderLink = `https://drive.google.com/drive/folders/${configValue || 'example'}`;
          saveWorkspaceConfig(wsConfig);
          await message.channel.send(`✅ Google Drive 已啟用\n📁 資料夾: ${wsConfig.google.drive.folderLink}`);
          return;
        }
        if (configAction === 'disable') {
          if (wsConfig.google?.drive) {
            wsConfig.google.drive.enabled = false;
            saveWorkspaceConfig(wsConfig);
          }
          await message.channel.send('❌ Google Drive 已停用');
          return;
        }
      }
      
      // !workspace config status
      if (configAction === 'status' || configAction === 'view') {
        let status = '⚙️ **工作區整合狀態**\n\n';
        
        status += `📅 Google Calendar: ${wsConfig.google?.calendar?.enabled ? '✅ 已啟用' : '❌ 未啟用'}\n`;
        if (wsConfig.google?.calendar?.enabled) {
          status += `   Calendar ID: ${wsConfig.google.calendar.calendarId}\n`;
        }
        
        status += `\n📝 Notion: ${wsConfig.notion?.enabled ? '✅ 已啟用' : '❌ 未啟用'}\n`;
        if (wsConfig.notion?.enabled) {
          status += `   Database ID: ${wsConfig.notion.databaseId}\n`;
        }
        
        status += `\n📁 Google Drive: ${wsConfig.google?.drive?.enabled ? '✅ 已啟用' : '❌ 未啟用'}\n`;
        if (wsConfig.google?.drive?.enabled) {
          status += `   資料夾: ${wsConfig.google.drive.folderLink}\n`;
        }
        
        await message.channel.send(status);
        return;
      }
      
      await message.channel.send(`⚙️ **工作區整合設定**

**Google Calendar**:
\`!workspace config gcal enable [calendarId]\`
\`!workspace config gcal disable\`

**Notion**:
\`!workspace config notion enable [databaseId]\`
\`!workspace config notion disable\`

**Google Drive**:
\`!workspace config drive enable [folderId]\`
\`!workspace config drive disable\`

**查看狀態**:
\`!workspace config status\``);
      return;
    }
    
    // !workspace status
    if (wsAction === 'status' || wsAction === 'view') {
      let status = '⚙️ **工作區整合狀態**\n\n';
      
      status += `📅 Google Calendar: ${wsConfig.google?.calendar?.enabled ? '✅ 已啟用' : '❌ 未啟用'}\n`;
      status += `📝 Notion: ${wsConfig.notion?.enabled ? '✅ 已啟用' : '❌ 未啟用'}\n`;
      status += `📁 Google Drive: ${wsConfig.google?.drive?.enabled ? '✅ 已啟用' : '❌ 未啟用'}\n`;
      
      await message.channel.send(status);
      return;
    }
    
    await message.channel.send(`⚙️ **工作區命令**:
\`!workspace config\` - 設定整合
\`!workspace status\` - 查看狀態

**子命令**:
\`!gcal\` - 查看日曆
\`!notion\` - 查看 Notion
\`!drive\` - 查看 Drive`);
    return;
  }

  // ==================== Phase 5: AI Commands ====================
  if (subCommand === 'ai' || subCommand === 'analyze' || subCommand === 'predict') {
    if (!phase5) {
      await message.channel.send('❌ Phase 5 AI 功能模組未正確載入');
      return;
    }

    const aiAction = args[0]?.toLowerCase();

    // !ai analyze [項目名] - AI 項目分析
    if (aiAction === 'analyze' || aiAction === 'analysis' || aiAction === '分析') {
      const projectName = args.slice(1).join(' ') || null;
      const analysis = phase5.analyzeProjectProgress(projectName);
      const embed = phase5.formatAnalysisForDiscord(analysis);

      await message.channel.send({ embeds: [embed] });
      return;
    }

    // !ai predict [項目名] - 項目進度預測
    if (aiAction === 'predict' || aiAction === 'prediction' || aiAction === '預測') {
      const projectName = args.slice(1).join(' ') || null;
      const predictions = phase5.predictProjectCompletion(projectName);
      const embed = phase5.formatPredictionsForDiscord(predictions);

      await message.channel.send({ embeds: [embed] });
      return;
    }

    // !ai calendar [天數] - 查看日曆
    if (aiAction === 'calendar' || aiAction === 'cal' || aiAction === '日曆') {
      const days = parseInt(args[1]) || 1;
      const events = await phase5.getCalendarEvents(days);
      const embed = phase5.formatCalendarForDiscord(events);

      await message.channel.send({ embeds: [embed] });
      return;
    }

    // !ai status - 查看 AI 狀態
    if (aiAction === 'status' || aiAction === '狀態') {
      const phase5Data = phase5.loadPhase5Data();
      const projectCount = Object.keys(phase5Data.projectProgress || {}).length;
      const lastAnalysis = phase5Data.lastAnalysis?.timestamp || '尚未分析';

      await message.channel.send(`🤖 **Phase 5 AI 助手狀態**

📊 追蹤項目: ${projectCount} 個
📈 最後分析: ${lastAnalysis}

**可用命令**:
\`!ai analyze\` - 分析項目進度
\`!ai predict\` - 預測完成時間
\`!ai calendar\` - 查看今日會議
\`!ai status\` - 查看 AI 狀態

💡 使用 \`!ai analyze [項目名]\` 分析特定項目`);
      return;
    }

    // 預設：顯示 AI 幫助
    await message.channel.send(`🤖 **Phase 5 AI 助手**

**功能**:
📊 AI 任務助手 - 自動分析項目進度，給出優化建議
📅 智能日曆整合 - 顯示今日/明日會議
🔮 項目進度預測 - AI 預測項目完成時間

**命令**:
\`!ai analyze\` - 分析所有項目進度
\`!ai analyze [項目名]\` - 分析特定項目
\`!ai predict\` - 預測項目完成時間
\`!ai calendar\` - 查看今日會議
\`!ai calendar tomorrow\` - 查看明日會議
\`!ai status\` - 查看 AI 狀態

**Phase 6: 更多 AI 功能**:
\`!board\` - 協作白板
\`!points\` - 查看積分
\`!badges\` - 查看徽章
\`!leaderboard\` - 排行榜
\`!task complete [任務]\` - 完成任務
\`!mood [1-5]\` - 匯報心情
\`!remind [內容]\` - 設置提醒
\`!dashboard\` - 數據儀表板`);
    return;
  }

  // ==================== Phase 6: Whiteboard, Gamification, Mood, Reminders, Dashboard ====================
  
  // !board - 協作白板
  if (subCommand === 'board' || subCommand === '白板') {
    if (!phase6) {
      await message.channel.send('❌ Phase 6 功能模組未正確載入');
      return;
    }
    const data = phase6.loadPhase6Data();
    await phase6.handleWhiteboardCommand(message, args.slice(1), data);
    return;
  }

  // !points - 積分
  if (subCommand === 'points' || subCommand === '積分') {
    if (!phase6) {
      await message.channel.send('❌ Phase 6 功能模組未正確載入');
      return;
    }
    const data = phase6.loadPhase6Data();
    await phase6.handleGamificationCommand(message, args.slice(1), data, 'points');
    return;
  }

  // !badges - 徽章
  if (subCommand === 'badges' || subCommand === '徽章') {
    if (!phase6) {
      await message.channel.send('❌ Phase 6 功能模組未正確載入');
      return;
    }
    const data = phase6.loadPhase6Data();
    await phase6.handleGamificationCommand(message, args.slice(1), data, 'badges');
    return;
  }

  // !leaderboard - 排行榜
  if (subCommand === 'leaderboard' || subCommand === 'ranks' || subCommand === '排行') {
    if (!phase6) {
      await message.channel.send('❌ Phase 6 功能模組未正確載入');
      return;
    }
    const data = phase6.loadPhase6Data();
    await phase6.handleGamificationCommand(message, args.slice(1), data, 'leaderboard');
    return;
  }

  // !task - 任務完成
  if (subCommand === 'task' || subCommand === '任務') {
    if (!phase6) {
      await message.channel.send('❌ Phase 6 功能模組未正確載入');
      return;
    }
    const data = phase6.loadPhase6Data();
    await phase6.handleGamificationCommand(message, args.slice(1), data, 'task');
    return;
  }

  // !mood - 心情
  if (subCommand === 'mood' || subCommand === '心情') {
    // !mood weather - 團隊天氣圖 (心情 + 天氣)
    if (args[1]?.toLowerCase() === 'weather' || args[1]?.toLowerCase() === '天氣') {
      if (!teamWeather) {
        await message.channel.send('❌ 天氣功能模組未正確載入');
        return;
      }
      let phase6Data = null;
      if (phase6) {
        try {
          phase6Data = phase6.loadPhase6Data();
        } catch (e) {}
      }
      await teamWeather.handleWeatherCommand(message, ['team'], phase6Data);
      return;
    }
    
    if (!phase6) {
      await message.channel.send('❌ Phase 6 功能模組未正確載入');
      return;
    }
    const data = phase6.loadPhase6Data();
    await phase6.handleMoodCommand(message, args.slice(1), data);
    return;
  }

  // !remind - 提醒
  if (subCommand === 'remind' || subCommand === '提醒') {
    if (!phase6) {
      await message.channel.send('❌ Phase 6 功能模組未正確載入');
      return;
    }
    const data = phase6.loadPhase6Data();
    await phase6.handleReminderCommand(message, args.slice(1), data);
    return;
  }

  // !reminders - 提醒列表
  if (subCommand === 'reminders') {
    if (!phase6) {
      await message.channel.send('❌ Phase 6 功能模組未正確載入');
      return;
    }
    const data = phase6.loadPhase6Data();
    await phase6.handleReminderCommand(message, ['list'], data);
    return;
  }

  // ==================== Phase 5: Shortcut Commands ====================
  // !analyze - 快速分析
  if (command === 'analyze' || command === '分析') {
    if (!phase5) {
      await message.channel.send('❌ Phase 5 AI 功能模組未正確載入');
      return;
    }

    const projectName = args.join(' ') || null;
    const analysis = phase5.analyzeProjectProgress(projectName);
    const embed = phase5.formatAnalysisForDiscord(analysis);

    await message.channel.send({ embeds: [embed] });
    return;
  }

  // !predict - 快速預測
  if (command === 'predict' || command === '預測') {
    if (!phase5) {
      await message.channel.send('❌ Phase 5 AI 功能模組未正確載入');
      return;
    }

    const projectName = args.join(' ') || null;
    const predictions = phase5.predictProjectCompletion(projectName);
    const embed = phase5.formatPredictionsForDiscord(predictions);

    await message.channel.send({ embeds: [embed] });
    return;
  }

  // ==================== Phase 5: Calendar Integration (增強版 !gcal) ====================
  // 使用 Phase 5 AI Calendar 功能
  if (command === 'gcal' || command === 'calendar' || command === '日曆') {
    if (!phase5) {
      // 使用原有的 mock 數據
      const gcalAction = args[0]?.toLowerCase();
      
      if (!gcalAction || gcalAction === 'today' || gcalAction === 'now') {
        await message.channel.send('📅 **今日會議**\n\n今日沒有會議安排\n\n💡 使用 `!ai calendar` 獲取更詳細資訊');
        return;
      }
      
      if (gcalAction === 'tomorrow' || gcalAction === 'next') {
        await message.channel.send('📅 **明日會議**\n\n目前沒有明日會議安排');
        return;
      }
      
      await message.channel.send(`📅 **日曆命令**:\n\`!gcal\` - 今日\n\`!gcal tomorrow\` - 明日`);
      return;
    }

    // 使用 Phase 5 AI Calendar
    const gcalAction = args[0]?.toLowerCase();
    const days = gcalAction === 'tomorrow' || gcalAction === 'next' ? 2 : 1;
    
    const events = await phase5.getCalendarEvents(days);
    const embed = phase5.formatCalendarForDiscord(events);

    await message.channel.send({ embeds: [embed] });
    return;
  }

  // ==================== Phase 7: 10項新功能 ====================
  // !phase7 - Webhooks, 開工儀式, Voice通知, Ondi狀態, 每週主題, AI Summaries, Calendar推播, Sync, Poll, Analytics
  if (subCommand === 'phase7' || subCommand === 'p7') {
    if (!phase7) {
      await message.channel.send('❌ Phase 7 功能模組未正確載入');
      return;
    }

    const data = phase7.initPhase7Data();
    await phase7.handlePhase7Command(message, args.slice(1), data);
    
    // 追蹤命令使用
    phase7.trackCommand('phase7', message.author.id);
    return;
  }

  // !stats - 快速查看 Analytics (捷徑命令)
  if (subCommand === 'stats' || subCommand === 'analytics' || subCommand === '統計') {
    if (!phase7) {
      await message.channel.send('❌ Phase 7 功能模組未正確載入');
      return;
    }
    const analytics = phase7.initAnalyticsDB();
    await message.channel.send(phase7.getAnalyticsReport(analytics));
    phase7.trackCommand('stats', message.author.id);
    return;
  }

  // !theme - 每週主題 (捷徑命令)
  if (subCommand === 'theme' || subCommand === '主題') {
    if (!phase7) {
      await message.channel.send('❌ Phase 7 功能模組未正確載入');
      return;
    }
    const data = phase7.initPhase7Data();
    const currentTheme = phase7.getWeeklyTheme();
    const themeData = data.weeklyThemes[currentTheme];
    await message.channel.send(`📅 **今日主題**: ${themeData?.name || '普通工作日'}\n${themeData?.description || ''}`);
    phase7.trackCommand('theme', message.author.id);
    return;
  }

  // ==================== Phase 8: 6項新功能 ====================
  // !phase8 - Notion/Airtable同步, Jenkins通知, 截止提醒, 安靜時段, 每月清理, Thread封存
  if (subCommand === 'phase8' || subCommand === 'p8') {
    if (!phase8) {
      await message.channel.send('❌ Phase 8 功能模組未正確載入');
      return;
    }

    const data = phase8.initPhase8Data();
    await phase8.handlePhase8Command(message, args.slice(1), data);
    return;
  }

  // !deadline - 快速截止提醒 (捷徑命令)
  if (subCommand === 'deadline' || subCommand === '截止') {
    if (!phase8) {
      await message.channel.send('❌ Phase 8 功能模組未正確載入');
      return;
    }

    const data = phase8.initPhase8Data();
    // 處理 deadline 快速命令
    const deadlineAction = args[1]?.toLowerCase();
    if (deadlineAction === 'list' || !deadlineAction) {
      // 顯示任務列表
      if (data.tasks.length === 0) {
        await message.channel.send('📝 暫無任務\n用法: !phase8 deadline add [任務] [@user] [+1d]');
        return;
      }
      
      let list = '📝 **任務列表**\n\n';
      const now = Date.now();
      
      for (const task of data.tasks) {
        if (task.completed) continue;
        
        const deadline = new Date(task.deadline);
        const hoursLeft = (deadline.getTime() - now) / (1000 * 60 * 60);
        const emoji = hoursLeft < 24 ? '🔴' : hoursLeft < 72 ? '🟡' : '🟢';
        
        list += `${emoji} **${task.title}**\n`;
        list += `   ID: \`${task.id}\`\n`;
        list += `   👤 <@${task.assignee}>\n`;
        list += `   ⏰ ${deadline.toLocaleString('zh-TW')} (${Math.round(hoursLeft)}小時)\n\n`;
      }
      
      await message.channel.send(list);
      return;
    }
    
    await phase8.handlePhase8Command(message, ['deadline', ...args.slice(1)], data);
    return;
  }

  // !quiet - 快速安靜時段 (捷徑命令)
  if (subCommand === 'quiet' || subCommand === '安靜') {
    if (!phase8) {
      await message.channel.send('❌ Phase 8 功能模組未正確載入');
      return;
    }

    const data = phase8.initPhase8Data();
    const quietAction = args[1]?.toLowerCase();
    
    if (quietAction === 'status' || quietAction === 'on' || quietAction === 'off' || !quietAction) {
      const status = `🌙 **安靜時段狀態**

• 狀態: ${data.config.quietHours.enabled ? '✅ 啟用' : '❌ 停用'}
• 時間: ${data.config.quietHours.start} - ${data.config.quietHours.end}
• 時區: ${data.config.quietHours.timezone}`;

      if (quietAction === 'on') {
        data.config.quietHours.enabled = true;
        phase8.savePhase8Data(data);
        await message.channel.send('✅ 安靜時段已啟用');
        return;
      }
      
      if (quietAction === 'off') {
        data.config.quietHours.enabled = false;
        phase8.savePhase8Data(data);
        await message.channel.send('❌ 安靜時段已停用');
        return;
      }
      
      await message.channel.send(status);
      return;
    }
    
    await phase8.handlePhase8Command(message, ['quiet', ...args.slice(1)], data);
    return;
  }

  // ==================== Airtable 同步 ====================
  // !airtable - 任務同步到 Airtable (捷徑命令)
  if (subCommand === 'airtable' || subCommand === 'at') {
    if (!phase8) {
      await message.channel.send('❌ Phase 8 功能模組未正確載入');
      return;
    }

    const data = phase8.initPhase8Data();
    const atAction = args[1]?.toLowerCase();
    
    // 快速狀態查看
    if (!atAction || atAction === 'status') {
      const config = data.config.airtableSync;
      const statusMsg = `📊 **Airtable 同步狀態**

• 狀態: ${config.enabled ? '✅ 啟用' : '❌ 停用'}
• API Key: ${config.apiKey ? '✅ 已設定' : '❌ 未設定'}
• Base ID: ${config.baseId || '未設定'}
• 通知頻道: ${config.channels.length} 個

**命令**:
\`!airtable enable [apiKey] [baseId]\` - 啟用同步
\`!airtable disable\` - 停用同步
\`!airtable channel [#channel]\` - 設定通知頻道`;
      await message.channel.send(statusMsg);
      return;
    }
    
    await phase8.handlePhase8Command(message, ['airtable', ...args.slice(1)], data);
    return;
  }

  // ==================== Jenkins CI 通知 ====================
  // !jenkins - 建置狀態通知 (捷徑命令)
  if (subCommand === 'jenkins' || subCommand === 'ci' || subCommand === 'build') {
    if (!phase8) {
      await message.channel.send('❌ Phase 8 功能模組未正確載入');
      return;
    }

    const data = phase8.initPhase8Data();
    const jkAction = args[1]?.toLowerCase();
    
    // 快速狀態查看
    if (!jkAction || jkAction === 'status') {
      const config = data.config.jenkins;
      const statusMsg = `🔧 **Jenkins CI 狀態**

• 狀態: ${config.enabled ? '✅ 啟用' : '❌ 停用'}
• URL: ${config.url || '未設定'}
• 監控 Jobs: ${config.jobs.length} 個
${config.jobs.length > 0 ? `  - ${config.jobs.join(', ')}` : ''}
• 通知頻道: ${config.channels.length} 個

**命令**:
\`!jenkins enable [url] [user] [token]\` - 啟用監控
\`!jenkins disable\` - 停用監控
\`!jenkins addjob [jobName]\` - 添加監控 Job
\`!jenkins channel [#channel]\` - 設定通知頻道`;
      await message.channel.send(statusMsg);
      return;
    }
    
    await phase8.handlePhase8Command(message, ['jenkins', ...args.slice(1)], data);
    return;
  }

  // !archive - 快速封存 (捷徑命令)
  if (subCommand === 'archive' || subCommand === '封存') {
    if (!phase8) {
      await message.channel.send('❌ Phase 8 功能模組未正確載入');
      return;
    }

    const data = phase8.initPhase8Data();
    const archiveAction = args[1]?.toLowerCase();
    
    if (archiveAction === 'list' || archiveAction === 'history') {
      if (data.archives.length === 0) {
        await message.channel.send('📦 暫無封存記錄');
        return;
      }
      
      let list = '📦 **封存記錄**\n\n';
      for (const archive of data.archives.slice(-10).reverse()) {
        list += `• ${archive.threadName}\n`;
        list += `   📅 ${new Date(archive.archivedAt).toLocaleString('zh-TW')}\n\n`;
      }
      
      await message.channel.send(list);
      return;
    }
    
    await phase8.handlePhase8Command(message, ['archive', ...args.slice(1)], data);
    return;
  }

  // ==================== Pomodoro: 每日任務衝刺計時器 ====================
  if (subCommand === 'pomodoro' || subCommand === '番茄' || subCommand === 'tomato' || command === '🍅') {
    if (!pomodoro) {
      await message.channel.send('❌ Pomodoro 功能模組未正確載入');
      return;
    }

    const pomodoroData = pomodoro.loadData();
    await pomodoro.handlePomodoroCommand(message, args.slice(1), pomodoroData);
    return;
  }

  // 捷徑: !sprint - 快速開始衝刺
  if (subCommand === 'sprint' || subCommand === '衝刺') {
    if (!pomodoro) {
      await message.channel.send('❌ Pomodoro 功能模組未正確載入');
      return;
    }

    const task = args.slice(1).join(' ') || '專注工作中';
    const pomodoroData = pomodoro.loadData();
    await pomodoro.handlePomodoroCommand(message, ['start', task], pomodoroData);
    return;
  }

  // ==================== Team Weather: 心情天氣預報 ====================
  if (subCommand === 'weather' || subCommand === '天氣' || subCommand === '🌤️') {
    if (!teamWeather) {
      await message.channel.send('❌ 天氣功能模組未正確載入');
      return;
    }

    // 嘗試獲取 Phase 6 的 mood 數據
    let phase6Data = null;
    if (phase6) {
      try {
        phase6Data = phase6.loadPhase6Data();
      } catch (e) {
        // ignore
      }
    }

    await teamWeather.handleWeatherCommand(message, args.slice(1), phase6Data);
    return;
  }

  // 捷徑: !moodweather - 快速查看團隊天氣圖
  if (subCommand === 'moodweather' || subCommand === '心情天氣') {
    if (!teamWeather) {
      await message.channel.send('❌ 天氣功能模組未正確載入');
      return;
    }

    let phase6Data = null;
    if (phase6) {
      try {
        phase6Data = phase6.loadPhase6Data();
      } catch (e) {
        // ignore
      }
    }

    await teamWeather.handleWeatherCommand(message, ['team'], phase6Data);
    return;
  }
}

// 主函数
async function main() {
  const config = loadConfig();
  const cronConfig = loadCronConfig();
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    console.error('錯誤: 請設置 DISCORD_BOT_TOKEN 環境變量');
    console.log('可從 https://discord.com/developers/applications 获取 Token');
    process.exit(1);
  }

  // 创建 Discord Client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  // 就绪事件
  client.once('ready', async () => {
    console.log(`🤖 Bot 已登入: ${client.user.tag}`);
    
    const guild = client.guilds.cache.first();
    if (!guild) {
      console.error('無法找到伺服器');
      process.exit(1);
    }

    console.log(`📁 伺服器: ${guild.name}`);
    
    const channelMapping = getChannelMapping(config);
    
    // 初始状态
    const status = buildVoiceStatus(guild, channelMapping);
    saveVoiceStatus(status);
    
    console.log('\n📊 語音頻道狀態:');
    console.log(`  設計組: ${status.channels.design.count}人在崗`);
    console.log(`  開發組: ${status.channels.dev.count}人在崗`);
    console.log(`  客服組: ${status.channels.support.count}人在崗`);
    console.log(`  總計: ${status.total}人在崗\n`);
    
    console.log('⏰ Cron Bot 已啟用:');
    console.log(`  心情問候: ${cronConfig.moodGreeting?.enabled ? '✅' : '❌'} @ ${cronConfig.moodGreeting?.time || '09:00'}`);
    console.log(`  每日 Standup: ${cronConfig.standup?.enabled ? '✅' : '❌'} @ ${cronConfig.standup?.time || '09:00'}`);
    console.log(`  週報催交: ${cronConfig.weekly?.enabled ? '✅' : '❌'} @ ${cronConfig.weekly?.time || '17:00'}\n`);
    
    // Phase 8: 6項新功能
    if (phase8) {
      const phase8Data = phase8.initPhase8Data();
      console.log('📦 Phase 8 已載入 (6項新功能):');
      console.log(`  任務同步: ${phase8Data.config.notionSync.enabled ? '✅ Notion' : '❌'} | ${phase8Data.config.airtableSync.enabled ? '✅ Airtable' : '❌'}`);
      console.log(`  CI 監控: ${phase8Data.config.jenkins.enabled ? '✅ Jenkins' : '❌'} | ${phase8Data.config.ciMonitor.enabled ? '✅ CI' : '❌'}`);
      console.log(`  截止提醒: ${phase8Data.config.deadlineReminder.enabled ? '✅ 啟用' : '❌'} (${phase8Data.tasks.length} 個任務)`);
      console.log(`  安靜時段: ${phase8Data.config.quietHours.enabled ? '✅ 啟用' : '❌'} (${phase8Data.config.quietHours.start} - ${phase8Data.config.quietHours.end})`);
      console.log(`  每月清理: ${phase8Data.config.monthlyCleanup.enabled ? '✅ 啟用' : '❌'} (閒置${phase8Data.config.monthlyCleanup.inactiveDays}天)`);
      console.log(`  Thread封存: ${phase8Data.config.threadArchive.enabled ? '✅ 啟用' : '❌'}\n`);
    } else {
      console.log('📦 Phase 8: ❌ 模組未載入\n');
    }
    
    // Phase 9: 10項新功能建議
    if (phase9) {
      const phase9Data = phase9.loadData();
      console.log('🔟 Phase 9 已載入 (10項新功能):');
      console.log(`  Thread Templates: ${Object.keys(phase9Data.threadTemplates || {}).length} 個範本`);
      console.log(`  Forum Channels: ${Object.keys(phase9Data.forumChannels?.projects || {}).length} 個項目`);
      console.log(`  Command Menu: ${phase9Data.commandMenus?.enabled ? '✅' : '❌'}`);
      console.log(`  Slash Commands: ${phase9Data.slashCommands?.enabled ? '✅' : '❌'}`);
      console.log(`  Pomodoro Check-in: ${phase9Data.pomodoroCheckIn?.enabled ? '✅' : '❌'}`);
      console.log(`  Dashboard: ${phase9Data.dashboard?.enabled ? '✅' : '❌'}`);
      console.log(`  Channel Follow: ${phase9Data.channelFollow?.enabled ? '✅' : '❌'}`);
      console.log(`  Cron Reminders: ${phase9Data.cronEnhanced?.reminders?.length || 0} 個\n`);
      
      // 啟動 Phase 9 定時任務
      if (phase9.startPomodoroCheckIn) {
        phase9.startPomodoroCheckIn(client, { ...phase9Data, pomodoroData: pomodoro?.loadData() });
      }
      if (phase9.startDashboardAutoRefresh) {
        phase9.startDashboardAutoRefresh(client, phase9Data);
      }
    } else {
      console.log('🔟 Phase 9: ❌ 模組未載入\n');
    }
    
    // Pomodoro: 每日任務衝刺計時器
    if (pomodoro) {
      const pomodoroData = pomodoro.loadData();
      const activeSessions = Object.keys(pomodoroData.activeSessions).length;
      console.log('🍅 Pomodoro 已載入:');
      console.log(`  工作時間: ${pomodoroData.config.workDuration / 60000} 分鐘`);
      console.log(`  短休息: ${pomodoroData.config.shortBreak / 60000} 分鐘`);
      console.log(`  長休息: ${pomodoroData.config.longBreak / 60000} 分鐘`);
      console.log(`  進行中: ${activeSessions} 個\n`);
    } else {
      console.log('🍅 Pomodoro: ❌ 模組未載入\n');
    }
    
    // Team Weather: 心情天氣預報
    if (teamWeather) {
      const weatherData = teamWeather.loadData();
      console.log('🌤️ Team Weather 已載入:');
      console.log(`  位置: ${weatherData.location}`);
      console.log(`  緩存: ${weatherData.lastFetch ? '✅ 有' : '❌ 無'}\n`);
    } else {
      console.log('🌤️ Team Weather: ❌ 模組未載入\n');
    }
    
    // Phase 9: 註冊 Slash Commands
    if (phase9) {
      try {
        await phase9.registerSlashCommands(client, phase9.loadData());
        console.log('⚡ Slash Commands 已註冊\n');
      } catch (e) {
        console.log('⚡ Slash Commands 註冊失敗:', e.message, '\n');
      }
    }
  });

  // 语音频道状态更新事件
  client.on('voiceStateUpdate', (oldState, newState) => {
    const channelMapping = getChannelMapping(config);
    const guild = newState.guild;
    
    // 更新状态
    const status = buildVoiceStatus(guild, channelMapping);
    saveVoiceStatus(status);
    
    // 记录变化
    const oldChannel = oldState.channelId ? oldState.channel?.name : null;
    const newChannel = newState.channelId ? newState.channel?.name : null;
    
    if (oldChannel !== newChannel) {
      const memberName = newState.member?.displayName || 'Unknown';
      if (newChannel) {
        console.log(`✅ ${memberName} 加入 ${newChannel}`);
        // Phase 7: Voice 頻道視覺化 - 加入通知
        if (phase7) {
          phase7.handleVoiceJoin(newState.member, newState.channel, phase7.initPhase7Data());
          phase7.recordOndiStatus(newState.member, 'online', phase7.initPhase7Data());
        }
      } else if (oldChannel) {
        console.log(`❌ ${memberName} 離開 ${oldChannel}`);
        // Phase 7: Voice 頻道視覺化 - 離開通知
        if (phase7) {
          phase7.handleVoiceLeave(newState.member, oldState.channel, phase7.initPhase7Data());
          phase7.recordOndiStatus(newState.member, 'offline', phase7.initPhase7Data());
        }
      }
      
      console.log('\n📊 當前在崗狀態:');
      console.log(`  設計組: ${status.channels.design.count}人在崗`);
      console.log(`  開發組: ${status.channels.dev.count}人在崗`);
      console.log(`  客服組: ${status.channels.support.count}人在崗`);
    }
  });

  // 消息事件 - 处理命令
  client.on('messageCreate', async (message) => {
    // 忽略機器人訊息
    if (message.author.bot) return;
    
    // Phase 7: Analytics - 追蹤訊息
    if (phase7) {
      phase7.trackMessage(message.author.id, message.channel.name);
    }
    
    // 檢查是否以 ! 開頭
    if (message.content.startsWith('!')) {
      await handleCommand(client, message, message.content);
      return;
    }
    
    // Phase 7: 開工儀式 - 處理問候回覆 (用戶回覆「今日點呀？」)
    if (phase7) {
      const phase7Data = phase7.initPhase7Data();
      
      // 檢查是否在問候後的回覆時間範圍內 (5分鐘內)
      const recentGreeting = phase7Data.greeting.responses[message.author.id];
      if (recentGreeting && (Date.now() - recentGreeting.timestamp <= 5 * 60 * 1000)) {
        // 在5分鐘內回覆，視為對問候的回應
        await phase7.handleGreetingResponse(message, phase7Data);
        phase7.savePhase7Data(phase7Data);
      }
      
      // Phase 7: 「喺度」狀態 - 處理「🚪 我走先」離開訊息
      await phase7.handleLeavingMessage(message, phase7Data);
      
      // Phase 7: AI Summaries - 記錄對話用於總結
      phase7.recordConversation(message, phase7Data);
      phase7.savePhase7Data(phase7Data);
    }
    
    // Phase 4: 關鍵詞監控和通知
    await handleKeywordNotification(client, message);
  });
  
  // Phase 4: 關鍵詞通知處理
  async function handleKeywordNotification(client, message) {
    const keywordDB = loadKeywordDB();
    const content = message.content;
    const guild = message.guild;
    
    // 檢測統一公告格式
    const formats = keywordDB.announcementFormats;
    let mentionedUsers = new Set();
    let announcementType = null;
    
    // 檢測 [決定]
    if (content.includes('[決定]')) {
      announcementType = '決定';
      // 嘗試提取提及的用戶
      const userMentions = content.match(/<@!?(\d+)>/g);
      if (userMentions) {
        userMentions.forEach(mention => {
          const userId = mention.replace(/<@!?|>/g, '');
          mentionedUsers.add(userId);
        });
      }
    }
    
    // 檢測 [需要回覆]
    if (content.includes('[需要回覆]')) {
      announcementType = '需要回覆';
      const userMentions = content.match(/<@!?(\d+)>/g);
      if (userMentions) {
        userMentions.forEach(mention => {
          const userId = mention.replace(/<@!?|>/g, '');
          mentionedUsers.add(userId);
        });
      }
    }
    
    // 檢測 [緊急]
    if (content.includes('[緊急]')) {
      announcementType = '緊急';
    }
    
    // 遍歷所有訂閱，檢查關鍵詞
    for (const [userId, keywords] of Object.entries(keywordDB.subscriptions)) {
      if (!keywords || keywords.length === 0) continue;
      
      for (const keyword of keywords) {
        if (content.toLowerCase().includes(keyword.toLowerCase())) {
          // 找到匹配的關鍵詞，發送通知
          try {
            const user = await guild.members.fetch(userId);
            if (user) {
              // 避免通知發送者自己
              if (userId === message.author.id) continue;
              
              const notification = `🏷️ **關鍵詞提醒**

你訂閱的關鍵詞 「${keyword}」 出現在呢度：

> ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}

📝 來源: ${message.channel}
👤 發送者: ${message.author.displayName}`;

              await user.send(notification);
              console.log(`📢 已通知用戶 ${user.displayName} 關於關鍵詞: ${keyword}`);
            }
          } catch (e) {
            // 可能用戶未開啟 DM
            console.log(`⚠️ 無法通知用戶 ${userId}: ${e.message}`);
          }
        }
      }
    }
    
    // 處理公告格式提及的用戶
    if (announcementType && mentionedUsers.size > 0) {
      for (const userId of mentionedUsers) {
        try {
          const user = await guild.members.fetch(userId);
          if (user && userId !== message.author.id) {
            const announcementNotification = `📢 **${announcementType}通知**

${message.content.substring(0, 300)}

📝 來源: ${message.channel}
👤 發送者: ${message.author.displayName}`;

            await user.send(announcementNotification);
          }
        } catch (e) {
          console.log(`⚠️ 無法通知用戶 ${userId}: ${e.message}`);
        }
      }
    }
    
    // Phase 4: 投票回覆處理
    await handlePollVote(client, message);
  }
  
  // Phase 4: 處理投票回覆
  async function handlePollVote(client, message) {
    const pollDB = loadPollDB();
    const userId = message.author.id;
    const content = message.content.trim();
    
    // 檢查是否為數字回覆
    const voteNum = parseInt(content);
    if (isNaN(voteNum) || voteNum < 1) return;
    
    // 查找進行的投票
    const activePolls = pollDB.polls.filter(p => 
      Date.now() < p.expiresAt && p.messageId === message.channel.lastMessageId
    );
    
    if (activePolls.length === 0) return;
    
    const poll = activePolls[0];
    
    // 檢查是否已經投票
    const alreadyVoted = poll.options.some(opt => opt.voters.includes(userId));
    if (alreadyVoted) {
      await message.channel.send(`${message.author} 你已經投過票了！`);
      return;
    }
    
    // 檢查選項是否有效
    if (voteNum > poll.options.length) {
      await message.channel.send(`❌ 無效選項，請回覆 1-${poll.options.length}`);
      return;
    }
    
    // 記錄投票
    poll.options[voteNum - 1].votes++;
    poll.options[voteNum - 1].voters.push(userId);
    savePollDB(pollDB);
    
    // 顯示投票結果
    const optionText = poll.options.map((opt, i) => {
      const emoji = i === voteNum - 1 ? '🆙' : '  ';
      return `${emoji} ${i + 1}. ${opt.label}: ${opt.votes}票`;
    }).join('\n');
    
    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
    await message.channel.send(`📊 **${poll.question}**

${optionText}

📊 總投票數: ${totalVotes}

💡 回覆數字更改投票`);
  }
  
  // ==================== Phase 9: Interaction Events ====================
  
  // Interaction 事件 - Select Menu 和 Slash Commands
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isSelectMenu() && !interaction.isCommand()) return;
    
    // 載入 Phase 9 數據
    const phase9Data = loadPhase9Data();
    
    // 處理 Select Menu
    if (interaction.isSelectMenu() && interaction.customId === 'command_menu') {
      if (phase9 && phase9.handleCommandMenuSelect) {
        await phase9.handleCommandMenuSelect(interaction, phase9Data);
      }
      return;
    }
    
    // 處理 Slash Commands
    if (interaction.isCommand()) {
      if (phase9 && phase9.handleSlashCommand) {
        await phase9.handleSlashCommand(interaction, client, phase9Data);
      }
      return;
    }
  });
  
  // Reaction 事件 - Status 進度追蹤
  client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    
    const message = reaction.message;
    const emoji = reaction.emoji.name;
    
    // 檢查是否為 Status 相關訊息
    if (message.embeds.length > 0 && message.embeds[0].title?.includes('狀態')) {
      const statusDB = loadStatusDB();
      const userId = user.id;
      
      // 根據反應更新狀態
      if (emoji === '✅') {
        if (statusDB.members[userId]) {
          statusDB.members[userId].status = 'done';
          statusDB.members[userId].updatedAt = new Date().toISOString();
          saveStatusDB(statusDB);
          await message.channel.send(`✅ <@${user}> 標記任務為完成`);
        }
      } else if (emoji === '⏳') {
        if (statusDB.members[userId]) {
          statusDB.members[userId].status = 'working';
          statusDB.members[userId].updatedAt = new Date().toISOString();
          saveStatusDB(statusDB);
          await message.channel.send(`⏳ <@${user}> 標記任務為進行中`);
        }
      } else if (emoji === '🚫') {
        if (statusDB.members[userId]) {
          statusDB.members[userId].status = 'blocked';
          statusDB.members[userId].updatedAt = new Date().toISOString();
          saveStatusDB(statusDB);
          await message.channel.send(`🚫 <@${user}> 標記任務為受阻礙`);
        }
      }
    }
    
    // Phase 7: 開工儀式 - 處理心情 emoji 回覆
    const moodEmojis = ['😴', '😐', '🙂', '😊', '🤩'];
    if (moodEmojis.includes(emoji) && phase7) {
      const phase7Data = phase7.initPhase7Data();
      await phase7.handleGreetingReaction(reaction, user, phase7Data);
    }
  });

  // Cron 定时检查 (每分钟)
  const cronInterval = setInterval(() => {
    checkCronJobs(client, cronConfig);
    // Phase 7: 自定義開工儀式 - 每日早上問候
    if (phase7) {
      const phase7Data = phase7.initPhase7Data();
      phase7.sendMorningGreeting(client, phase7Data);
      phase7.sendWeeklyThemeReminder(client, phase7Data);
    }
    // Phase 8: 定時檢查 (Notion/Airtable同步, Jenkins, 截止提醒, Thread封存)
    if (phase8) {
      phase8.runPeriodicChecks(client).catch(e => {
        console.error('[Phase8] 定時檢查失敗:', e.message);
      });
    }
    // Phase 9: 增強 Cron 檢查
    if (phase9) {
      const phase9Data = phase9.loadData();
      phase9.checkEnhancedCron(client, phase9Data);
    }
  }, 60 * 1000);

  // 自动清理功能 (每日定时执行)
  const cleanupInterval = setInterval(async () => {
    try {
      await runCleanup(client, config);
    } catch (e) {
      console.error('清理錯誤:', e.message);
    }
  }, 24 * 60 * 60 * 1000); // 每24小时

  // Phase 8: 每月清理任務 (每月1號執行)
  const monthlyCleanupInterval = setInterval(async () => {
    if (phase8) {
      const now = new Date();
      if (now.getDate() === 1) { // 每月1號
        console.log('[Phase8] 執行每月清理...');
        try {
          await phase8.runMonthlyCleanup(client);
          console.log('[Phase8] 每月清理完成');
        } catch (e) {
          console.error('[Phase8] 每月清理失敗:', e.message);
        }
      }
    }
  }, 24 * 60 * 60 * 1000); // 每天檢查

  // 登录
  await client.login(token);
}

// 自动清理功能
async function runCleanup(client, config) {
  console.log('\n🧹 開始自動清理...');
  
  const guild = client.guilds.cache.first();
  if (!guild) return;

  const archiveCategoryName = config.discord?.archiveCategory || '歸檔';
  const forumChannels = config.discord?.forumChannels || [];

  // 查找归档分类
  let archiveCategory = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name === archiveCategoryName
  );

  // 如果不存在则创建
  if (!archiveCategory) {
    archiveCategory = await guild.channels.create({
      name: archiveCategoryName,
      type: ChannelType.GuildCategory
    });
    console.log(`📁 创建归档分类: ${archiveCategoryName}`);
  }

  // 检查 Forum 频道的 threads
  for (const forumId of forumChannels) {
    const forum = guild.channels.cache.get(forumId);
    if (!forum || forum.type !== ChannelType.GuildForum) continue;

    const threads = forum.threads.cache;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    for (const thread of threads.values()) {
      // 检查是否有 "已完成" 标签
      const hasDoneTag = thread.appliedTags.some(tag => 
        tag.name.toLowerCase().includes('完成')
      );

      if (hasDoneTag && thread.parentId === forumId) {
        // 移动到归档分类
        await thread.setParent(archiveCategory.id);
        console.log(`📦 歸檔完成: ${thread.name}`);
      }

      // 检查落后进度 (超过24小时无活动)
      const lastMessage = thread.lastMessage;
      if (lastMessage && (now - lastMessage.createdAt) > oneDay * 2) {
        // 添加落后提醒
        const reminder = '⚠️ **落後進度提醒**\n此討論串已超過48小時無活動，請儘快更新進度或標記為已完成。';
        
        // 检查是否已有提醒
        const messages = await thread.messages.fetch({ limit: 10 });
        const hasReminder = messages.some(m => m.content.includes('落後進度提醒'));
        
        if (!hasReminder) {
          await thread.send(reminder);
          console.log(`⚠️ 添加落後提醒: ${thread.name}`);
        }
      }
    }
  }

  console.log('🧹 清理完成\n');
}

// 导出以便独立运行
module.exports = { main };

if (require.main === module) {
  main().catch(console.error);
}