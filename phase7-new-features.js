/**
 * Phase 7: 10項新功能
 * 1. Webhooks 自動化 - RSS feed、GitHub stars、PyPI 版本推送到頻道
 * 2. 自定義開工儀式 - 每日早上 Bot 問「今日點呀？」
 * 3. Voice 頻道視覺化 - 加入 Voice 時自動通知
 * 4. 「喺度」狀態 - 離開時記錄
 * 5. 每週主題頻道 - 週一/三/五不同主題
 * 6. AI summaries - 長對話總結
 * 7. Google Calendar 推播 - 會議開始時通知
 * 8. Notion/Linear 同步 - 狀態更新同步
 * 9. Poll + Slash Commands - 投票、查詢
 * 10. Analytics - 使用統計
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// 路徑配置
const PHASE7_DATA_PATH = path.join(__dirname, 'phase7-data.json');
const ANALYTICS_DB_PATH = path.join(__dirname, 'analytics-db.json');

// 初始化 Phase 7 數據
function initPhase7Data() {
  const defaultData = {
    // Webhooks 配置
    webhooks: {
      rss: [],           // RSS feed URLs
      github: [],        // GitHub repos to watch
      pypi: [],          // PyPI packages to watch
      lastCheck: {}
    },
    // 開工儀式配置
    greeting: {
      enabled: true,
      time: '09:00',     // 每日早上問候時間
      channels: [],       // 問候頻道
      responses: {}       // 用戶回覆記錄
    },
    // Voice 頻道配置
    voiceNotifications: {
      enabled: true,
      joinChannel: null, // 加入通知頻道
      leaveChannel: null // 離開通知頻道
    },
    // 「喺度」狀態
    ondiStatus: {
      enabled: true,
      channel: null,      // 狀態記錄頻道
      history: []        // 歷史記錄
    },
    // 每週主題頻道
    weeklyThemes: {
      monday: { name: '創意發想', description: 'Brainstorming & 新點子' },
      wednesday: { name: '進度衝刺', description: 'Execution & 實作' },
      friday: { name: '回顧總結', description: 'Review & 學習' },
      currentTheme: null,
      themeChannel: null
    },
    // AI Summaries 配置
    aiSummaries: {
      enabled: true,
      threshold: 50,      // 超過多少條訊息開始總結
      summaryChannel: null,
      conversationHistory: []
    },
    // Google Calendar 推播
    gcalPush: {
      enabled: true,
      notifyMinutes: 5,   // 會議開始前多少分鐘通知
      calendarId: null,
      lastNotify: {}
    },
    // Notion/Linear 同步
    sync: {
      notion: { enabled: false, apiKey: null, databaseId: null },
      linear: { enabled: false, apiKey: null, teamId: null },
      statusMapping: {}
    },
    // Poll 增強
    polls: {
      slashEnabled: true,
      autoClose: true
    },
    // Analytics 配置
    analytics: {
      enabled: true,
      trackCommands: true,
      trackVoiceTime: true,
      trackMessages: true,
      stats: {
        commands: {},
        voiceTime: {},
        messages: {},
        daily: {}
      }
    }
  };

  try {
    if (fs.existsSync(PHASE7_DATA_PATH)) {
      const existing = JSON.parse(fs.readFileSync(PHASE7_DATA_PATH, 'utf8'));
      // 合併默認值和現有數據
      return { ...defaultData, ...existing };
    }
  } catch (e) {
    console.log('[Phase7] 初始化數據失敗:', e.message);
  }
  return defaultData;
}

// 保存 Phase 7 數據
function savePhase7Data(data) {
  fs.writeFileSync(PHASE7_DATA_PATH, JSON.stringify(data, null, 2));
}

// 初始化 Analytics 數據
function initAnalyticsDB() {
  try {
    if (fs.existsSync(ANALYTICS_DB_PATH)) {
      return JSON.parse(fs.readFileSync(ANALYTICS_DB_PATH, 'utf8'));
    }
  } catch (e) {
    console.log('[Analytics] 初始化失敗:', e.message);
  }
  return {
    commands: {},
    voiceTime: {},
    messages: {},
    daily: {},
    users: {}
  };
}

// 保存 Analytics 數據
function saveAnalyticsDB(data) {
  fs.writeFileSync(ANALYTICS_DB_PATH, JSON.stringify(data, null, 2));
}

// ============ 功能 1: Webhooks 自動化 ============

// 獲取 RSS feed 更新
async function checkRSSFeeds(client, data) {
  const results = [];
  
  for (const feed of data.webhooks.rss) {
    try {
      const items = await fetchRSS(feed.url);
      const lastCheck = data.webhooks.lastCheck[feed.url] || 0;
      const newItems = items.filter(item => item.pubDate > lastCheck);
      
      if (newItems.length > 0) {
        results.push({
          feed: feed.name,
          items: newItems.slice(0, 5), // 最多5條
          channel: feed.channel
        });
        // 更新最後檢查時間
        data.webhooks.lastCheck[feed.url] = Date.now();
      }
    } catch (e) {
      console.log(`[RSS] ${feed.name} 檢查失敗:`, e.message);
    }
  }
  
  return results;
}

// 獲取 GitHub Stars 更新
async function checkGitHubStars(client, data) {
  const results = [];
  
  for (const repo of data.webhooks.github) {
    try {
      const stars = await fetchGitHubStars(repo.owner, repo.repo);
      const lastStars = repo.lastStars || 0;
      
      if (stars !== lastStars) {
        results.push({
          repo: `${repo.owner}/${repo.repo}`,
          stars: stars,
          change: stars - lastStars,
          channel: repo.channel
        });
        repo.lastStars = stars;
      }
    } catch (e) {
      console.log(`[GitHub] ${repo.owner}/${repo.repo} 檢查失敗:`, e.message);
    }
  }
  
  return results;
}

// 獲取 PyPI 版本更新
async function checkPyPI(client, data) {
  const results = [];
  
  for (const pkg of data.webhooks.pypi) {
    try {
      const version = await fetchPyPIVersion(pkg.name);
      
      if (version !== pkg.lastVersion) {
        results.push({
          package: pkg.name,
          version: version,
          channel: pkg.channel
        });
        pkg.lastVersion = version;
      }
    } catch (e) {
      console.log(`[PyPI] ${pkg.name} 檢查失敗:`, e.message);
    }
  }
  
  return results;
}

// HTTP 請求 helper
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// 解析 RSS
async function fetchRSS(url) {
  const xml = await httpGet(url);
  const items = [];
  const itemRegex = /<item[^>]*>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<pubDate>(.*?)<\/pubDate>/g;
  
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    items.push({
      title: match[1],
      link: match[2],
      pubDate: new Date(match[3]).getTime()
    });
  }
  
  return items;
}

// 獲取 GitHub stars
async function fetchGitHubStars(owner, repo) {
  try {
    const data = await httpGet(`https://api.github.com/repos/${owner}/${repo}`);
    const json = JSON.parse(data);
    return json.stargazers_count || 0;
  } catch (e) {
    return 0;
  }
}

// 獲取 PyPI 版本
async function fetchPyPIVersion(name) {
  try {
    const data = await httpGet(`https://pypi.org/pypi/${name}/json`);
    const json = JSON.parse(data);
    return json.info.version;
  } catch (e) {
    return null;
  }
}

// ============ 功能 2: 自定義開工儀式 ============

// 發送每日問候
async function sendMorningGreeting(client, data) {
  if (!data.greeting.enabled) return;
  
  const now = new Date();
  const [hour, minute] = data.greeting.time.split(':').map(Number);
  
  // 追蹤今日是否已發送過
  const todayKey = new Date().toISOString().split('T')[0];
  if (data.greeting.lastSent === todayKey) return; // 今日已發送
  
  if (now.getHours() === hour && now.getMinutes() === minute) {
    for (const channelId of data.greeting.channels) {
      try {
        const channel = await client.channels.fetch(channelId);
        if (channel) {
          const greetingMessages = [
            '🌅 **早上好！今日點呀？**',
            '☀️ **早晨！今日有咩可以做？**',
            '🌞 **新一日開始！有咩大計？**',
            '💪 **開工啦！今日點樣？**'
          ];
          const randomMsg = greetingMessages[Math.floor(Math.random() * greetingMessages.length)];
          const sentMsg = await channel.send(randomMsg);
          
          // 添加 emoji 反應讓用戶回覆心情
          await sentMsg.react('😴'); // 幾攰
          await sentMsg.react('😐'); // 一般
          await sentMsg.react('🙂'); // 正常
          await sentMsg.react('😊'); // 幾正
          await sentMsg.react('🤩'); // 勁開心
          
          // 標記今日已發送
          data.greeting.lastSent = todayKey;
          savePhase7Data(data);
          
          console.log('[Greeting] 已發送每日問候');
        }
      } catch (e) {
        console.log('[Greeting] 發送失敗:', e.message);
      }
    }
  }
}

// 處理 emoji 回覆 (心情)
async function handleGreetingReaction(reaction, user, data) {
  if (user.bot) return;
  
  const moodEmojis = {
    '😴': '幾攰',
    '😐': '一般',
    '🙂': '正常',
    '😊': '幾正',
    '🤩': '勁開心'
  };
  
  const mood = moodEmojis[reaction.emoji.name];
  if (!mood) return;
  
  // 記錄心情
  data.greeting.responses[user.id] = {
    mood: mood,
    timestamp: Date.now(),
    date: new Date().toISOString().split('T')[0]
  };
  savePhase7Data(data);
  
  // 回覆用戶
  try {
    const replyMsg = await reaction.message.channel.send(`**${user.displayName}** 今日心情: ${mood} ${reaction.emoji.name} 💪`);
    setTimeout(() => replyMsg.delete().catch(() => {}), 5000); // 5秒後刪除
  } catch (e) {
    console.log('[Greeting] 回覆失敗:', e.message);
  }
}

// 處理「🚪 我走先」離開訊息
async function handleLeavingMessage(message, data) {
  const content = message.content;
  
  // 檢查是否為離開訊息
  if (content.includes('🚪') && (content.includes('我走先') || content.includes('走先') || content.includes('Bye') || content.includes('bye'))) {
    const user = message.author;
    
    // 記錄離開
    const record = {
      user: user.displayName,
      userId: user.id,
      status: 'left',
      timestamp: Date.now(),
      time: new Date().toLocaleTimeString('zh-HK'),
      message: content
    };
    
    data.ondiStatus.history.unshift(record);
    if (data.ondiStatus.history.length > 100) {
      data.ondiStatus.history.pop();
    }
    savePhase7Data(data);
    
    // 回覆
    await message.reply(`👋 **${user.displayName}} 有慢！晏啲見！**`);
    
    return true; // 已處理
  }
  
  return false;
}

// 處理問候回覆
async function handleGreetingResponse(message, data) {
  const userId = message.author.id;
  const response = message.content;
  
  // 記錄回覆
  data.greeting.responses[userId] = {
    response: response,
    timestamp: Date.now(),
    date: new Date().toISOString().split('T')[0]
  };
  
  // 更新 analytics
  const analytics = initAnalyticsDB();
  if (!analytics.daily[new Date().toISOString().split('T')[0]]) {
    analytics.daily[new Date().toISOString().split('T')[0]] = { greetings: 0, messages: 0 };
  }
  analytics.daily[new Date().toISOString().split('T')[0]].greetings = 
    (analytics.daily[new Date().toISOString().split('T')[0]].greetings || 0) + 1;
  saveAnalyticsDB(analytics);
  
  await message.reply('收到！祝你有一個 productive 嘅一日！💪');
}

// ============ 功能 3: Voice 頻道視覺化 ============

// 處理 Voice 頻道加入
async function handleVoiceJoin(member, channel, data) {
  if (!data.voiceNotifications.enabled) return;
  
  const joinChannel = await client.channels.fetch(data.voiceNotifications.joinChannel);
  if (joinChannel) {
    await joinChannel.send(`🎙️ **${member.displayName}** 加入咗語音頻道 **${channel.name}**`);
  }
}

// 處理 Voice 頻道離開
async function handleVoiceLeave(member, channel, data) {
  if (!data.voiceNotifications.enabled) return;
  
  const leaveChannel = await client.channels.fetch(data.voiceNotifications.leaveChannel);
  if (leaveChannel) {
    await leaveChannel.send(`👋 **${member.displayName}** 離開咗語音頻道 **${channel.name}**`);
  }
}

// ============ 功能 4: 「喺度」狀態 ============

// 記錄「喺度」狀態
async function recordOndiStatus(member, status, data) {
  if (!data.ondiStatus.enabled) return;
  
  const record = {
    user: member.displayName,
    userId: member.id,
    status: status, // 'online' | 'offline'
    timestamp: Date.now(),
    time: new Date().toLocaleTimeString('zh-HK')
  };
  
  data.ondiStatus.history.unshift(record);
  // 保持最多 100 條記錄
  if (data.ondiStatus.history.length > 100) {
    data.ondiStatus.history.pop();
  }
  
  // 發送到記錄頻道
  const channel = await client.channels.fetch(data.ondiStatus.channel);
  if (channel) {
    const statusText = status === 'online' ? '✅ 上線' : '❌ 離線';
    await channel.send(`**${member.displayName}** ${statusText} - ${record.time}`);
  }
}

// ============ 功能 5: 每週主題頻道 ============

// 更新每週主題
function getWeeklyTheme() {
  const day = new Date().getDay();
  const themes = {
    1: 'monday',    // Monday
    3: 'wednesday', // Wednesday
    5: 'friday'    // Friday
  };
  
  return themes[day] || null;
}

// 發送每週主題提醒
async function sendWeeklyThemeReminder(client, data) {
  const theme = getWeeklyTheme();
  if (!theme) return;
  
  const themeData = data.weeklyThemes[theme];
  const channel = await client.channels.fetch(data.weeklyThemes.themeChannel);
  
  if (channel && themeData) {
    await channel.send(`📅 **今日主題：${themeData.name}**\n${themeData.description}`);
  }
}

// ============ 功能 6: AI Summaries ============

// 記錄對話
function recordConversation(message, data) {
  if (!data.aiSummaries.enabled) return;
  
  const history = data.aiSummaries.conversationHistory;
  history.push({
    author: message.author.displayName,
    content: message.content,
    timestamp: Date.now(),
    channel: message.channel.name
  });
  
  // 超過閾值，生成總結
  if (history.length >= data.aiSummaries.threshold) {
    generateSummary(client, data, message.channel);
    // 清空歷史
    data.aiSummaries.conversationHistory = [];
  }
}

// 生成 AI 總結
async function generateSummary(client, data, channel) {
  if (!data.aiSummaries.summaryChannel) return;
  
  const history = data.aiSummaries.conversationHistory;
  const summaryChannel = await client.channels.fetch(data.aiSummaries.summaryChannel);
  
  if (summaryChannel) {
    // 簡單的總結邏輯 - 實際可以使用 AI API
    const messagesByAuthor = {};
    history.forEach(msg => {
      if (!messagesByAuthor[msg.author]) messagesByAuthor[msg.author] = [];
      messagesByAuthor[msg.author].push(msg.content);
    });
    
    const summary = Object.entries(messagesByAuthor)
      .map(([author, msgs]) => `• ${author}: ${msgs.length} 條訊息`)
      .join('\n');
    
    await summaryChannel.send(`📝 **對話總結 (${history.length} 條訊息)**\n${summary}`);
  }
}

// ============ 功能 7: Google Calendar 推播 ============

// 檢查即將開始的會議
async function checkUpcomingMeetings(client, data) {
  if (!data.gcalPush.enabled || !data.gcalPush.calendarId) return;
  
  // 這需要 Google Calendar API，暫時預留
  // 實際實現需要 OAuth2 認證
}

// 發送會議提醒
async function sendMeetingReminder(client, meeting, data) {
  const channel = await client.channels.fetch(data.gcalPush.notifyChannel);
  if (channel) {
    await channel.send(`⏰ **會議提醒**\n**${meeting.title}** 將於 ${data.gcalPush.notifyMinutes} 分鐘後開始`);
  }
}

// ============ 功能 8: Notion/Linear 同步 ============

// 同步狀態到 Notion
async function syncToNotion(status, data) {
  if (!data.sync.notion.enabled) return;
  
  // 需要 Notion API 實現
  // 預留接口
}

// 同步狀態到 Linear
async function syncToLinear(status, data) {
  if (!data.sync.linear.enabled) return;
  
  // 需要 Linear API 實現
  // 預留接口
}

// ============ 功能 9: Poll + Slash Commands ============

// 處理 Poll 命令
async function handlePollCommand(message, args, data) {
  // 現有 Poll 功能已經在 Phase 4 實現
  // 這裡可以添加 Slash command 支援
  
  if (args[0] === 'slash') {
    await message.channel.send('⚠️ Slash Commands 需要伺服器支援Slash Commands。請使用 `/poll` 作為 Slash Command。');
  }
}

// ============ 功能 10: Analytics ============

// 記錄命令使用
function trackCommand(command, userId) {
  const analytics = initAnalyticsDB();
  
  // 命令統計
  if (!analytics.commands[command]) analytics.commands[command] = 0;
  analytics.commands[command]++;
  
  // 用戶統計
  if (!analytics.users[userId]) analytics.users[userId] = { commands: 0, messages: 0, voiceTime: 0 };
  analytics.users[userId].commands++;
  
  // 每日統計
  const today = new Date().toISOString().split('T')[0];
  if (!analytics.daily[today]) analytics.daily[today] = { commands: 0, messages: 0, voiceTime: 0 };
  analytics.daily[today].commands++;
  
  saveAnalyticsDB(analytics);
}

// 記錄訊息
function trackMessage(userId, channelName) {
  const analytics = initAnalyticsDB();
  
  if (!analytics.messages[channelName]) analytics.messages[channelName] = 0;
  analytics.messages[channelName]++;
  
  if (!analytics.users[userId]) analytics.users[userId] = { commands: 0, messages: 0, voiceTime: 0 };
  analytics.users[userId].messages++;
  
  const today = new Date().toISOString().split('T')[0];
  if (!analytics.daily[today]) analytics.daily[today] = { commands: 0, messages: 0, voiceTime: 0 };
  analytics.daily[today].messages++;
  
  saveAnalyticsDB(analytics);
}

// 記錄語音時間
function trackVoiceTime(userId, durationMinutes) {
  const analytics = initAnalyticsDB();
  
  if (!analytics.voiceTime[userId]) analytics.voiceTime[userId] = 0;
  analytics.voiceTime[userId] += durationMinutes;
  
  if (!analytics.users[userId]) analytics.users[userId] = { commands: 0, messages: 0, voiceTime: 0 };
  analytics.users[userId].voiceTime += durationMinutes;
  
  const today = new Date().toISOString().split('T')[0];
  if (!analytics.daily[today]) analytics.daily[today] = { commands: 0, messages: 0, voiceTime: 0 };
  analytics.daily[today].voiceTime += durationMinutes;
  
  saveAnalyticsDB(analytics);
}

// 獲取 Analytics 報告
function getAnalyticsReport(analytics) {
  const totalCommands = Object.values(analytics.commands).reduce((a, b) => a + b, 0);
  const totalMessages = Object.values(analytics.messages).reduce((a, b) => a + b, 0);
  const totalVoiceTime = Object.values(analytics.voiceTime).reduce((a, b) => a + b, 0);
  
  // Top commands
  const topCommands = Object.entries(analytics.commands)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cmd, count]) => `• ${cmd}: ${count} 次`)
    .join('\n');
  
  // Top channels
  const topChannels = Object.entries(analytics.messages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ch, count]) => `• ${ch}: ${count} 條`)
    .join('\n');
  
  return `📊 **使用統計**
  
**命令使用 (共 ${totalCommands} 次)**
${topCommands}

**頻道訊息 (共 ${totalMessages} 條)**
${topChannels}

**語音時間**
總計: ${Math.round(totalVoiceTime / 60)} 小時`;
}

// ============ 命令處理 ============

// 處理 Phase 7 命令
async function handlePhase7Command(message, args, data) {
  const subCommand = args[0]?.toLowerCase();
  
  switch (subCommand) {
    // Webhooks
    case 'webhook':
      await handleWebhookCommand(message, args.slice(1), data);
      break;
    
    // Greeting
    case 'greeting':
      await handleGreetingCommand(message, args.slice(1), data);
      break;
    
    // Voice
    case 'voice':
      await handleVoiceCommand(message, args.slice(1), data);
      break;
    
    // Ondi Status
    case 'ondi':
      await handleOndiCommand(message, args.slice(1), data);
      break;
    
    // Theme
    case 'theme':
      await handleThemeCommand(message, args.slice(1), data);
      break;
    
    // AI Summary
    case 'summary':
      await handleSummaryCommand(message, args.slice(1), data);
      break;
    
    // Calendar
    case 'calendar':
      await handleCalendarCommand(message, args.slice(1), data);
      break;
    
    // Sync
    case 'sync':
      await handleSyncCommand(message, args.slice(1), data);
      break;
    
    // Analytics
    case 'analytics':
    case 'stats':
      const analytics = initAnalyticsDB();
      await message.channel.send(getAnalyticsReport(analytics));
      break;
    
    default:
      await message.channel.send(`📚 **Phase 7 命令幫助**

**Webhook 命令**:
\`!phase7 webhook add rss [url] [name]\` - 添加 RSS 訂閱
\`!phase7 webhook add github [owner/repo]\` - 添加 GitHub 監控
\`!phase7 webhook add pypi [package]\` - 添加 PyPI 監控
\`!phase7 webhook list\` - 查看所有 Webhook

**開工儀式**:
\`!phase7 greeting set [#channel]\` - 設定問候頻道
\`!phase7 greeting time [HH:MM]\` - 設定問候時間

**Voice 通知**:
\`!phase7 voice join [#channel]\` - 設定加入通知
\`!phase7 voice leave [#channel]\` - 設定離開通知

**「喺度」狀態**:
\`!phase7 ondi set [#channel]\` - 設定狀態頻道
\`!phase7 ondi history\` - 查看歷史記錄

**每週主題**:
\`!phase7 theme set [#channel]\` - 設定主題頻道

**Analytics**:
\`!phase7 stats\` - 查看使用統計
\`!phase7 stats reset\` - 重置統計`);
  }
}

// Webhook 命令處理
async function handleWebhookCommand(message, args, action) {
  const data = initPhase7Data();
  
  if (action[0] === 'add') {
    const type = action[1];
    const value = action[2];
    
    if (type === 'rss') {
      const name = action[3] || 'RSS Feed';
      data.webhooks.rss.push({ url: value, name: name, channel: message.channel.id });
      await message.channel.send(`✅ 已添加 RSS: ${name}`);
    } else if (type === 'github') {
      const [owner, repo] = value.split('/');
      data.webhooks.github.push({ owner, repo, channel: message.channel.id });
      await message.channel.send(`✅ 已添加 GitHub: ${value}`);
    } else if (type === 'pypi') {
      data.webhooks.pypi.push({ name: value, channel: message.channel.id });
      await message.channel.send(`✅ 已添加 PyPI: ${value}`);
    }
  } else if (action[0] === 'list') {
    const list = [
      `**RSS Feeds (${data.webhooks.rss.length})**`,
      ...data.webhooks.rss.map(r => `• ${r.name}: ${r.url}`),
      `\n**GitHub Repos (${data.webhooks.github.length})**`,
      ...data.webhooks.github.map(r => `• ${r.owner}/${r.repo}`),
      `\n**PyPI Packages (${data.webhooks.pypi.length})`,
      ...data.webhooks.pypi.map(p => `• ${p.name}`)
    ].join('\n');
    await message.channel.send(list);
  }
  
  savePhase7Data(data);
}

// Greeting 命令處理
async function handleGreetingCommand(message, args, data) {
  if (args[0] === 'set') {
    const channel = message.mentions.channels.first();
    if (channel) {
      data.greeting.channels.push(channel.id);
      await message.channel.send(`✅ 已設定問候頻道: ${channel.name}`);
      savePhase7Data(data);
    }
  } else if (args[0] === 'time') {
    const time = args[1];
    if (time && time.match(/^\d{2}:\d{2}$/)) {
      data.greeting.time = time;
      await message.channel.send(`✅ 已設定問候時間: ${time}`);
      savePhase7Data(data);
    }
  }
}

// Voice 命令處理
async function handleVoiceCommand(message, args, data) {
  const channel = message.mentions.channels.first();
  
  if (args[0] === 'join' && channel) {
    data.voiceNotifications.joinChannel = channel.id;
    await message.channel.send(`✅ 已設定加入通知頻道: ${channel.name}`);
    savePhase7Data(data);
  } else if (args[0] === 'leave' && channel) {
    data.voiceNotifications.leaveChannel = channel.id;
    await message.channel.send(`✅ 已設定離開通知頻道: ${channel.name}`);
    savePhase7Data(data);
  }
}

// Ondi 命令處理
async function handleOndiCommand(message, args, data) {
  const channel = message.mentions.channels.first();
  
  if (args[0] === 'set' && channel) {
    data.ondiStatus.channel = channel.id;
    await message.channel.send(`✅ 已設定「喺度」狀態頻道: ${channel.name}`);
    savePhase7Data(data);
  } else if (args[0] === 'history') {
    const history = data.ondiStatus.history.slice(0, 10);
    const list = history.map(h => `**${h.user}**: ${h.status === 'online' ? '✅' : '❌'} - ${h.time}`).join('\n');
    await message.channel.send(`📋 **最近「喺度」記錄**\n${list || '暂无記錄'}`);
  }
}

// Theme 命令處理
async function handleThemeCommand(message, args, data) {
  const channel = message.mentions.channels.first();
  
  if (args[0] === 'set' && channel) {
    data.weeklyThemes.themeChannel = channel.id;
    await message.channel.send(`✅ 已設定每週主題頻道: ${channel.name}`);
    savePhase7Data(data);
  } else {
    const currentTheme = getWeeklyTheme();
    const themeData = data.weeklyThemes[currentTheme];
    await message.channel.send(`📅 **今日主題**: ${themeData?.name || '普通工作日'}\n${themeData?.description || ''}`);
  }
}

// Summary 命令處理
async function handleSummaryCommand(message, args, data) {
  if (args[0] === 'channel') {
    const channel = message.mentions.channels.first();
    if (channel) {
      data.aiSummaries.summaryChannel = channel.id;
      await message.channel.send(`✅ 已設定總結頻道: ${channel.name}`);
      savePhase7Data(data);
    }
  } else if (args[0] === 'threshold') {
    const threshold = parseInt(args[1]);
    if (threshold > 0) {
      data.aiSummaries.threshold = threshold;
      await message.channel.send(`✅ 已設定總結閾值: ${threshold} 條訊息`);
      savePhase7Data(data);
    }
  }
}

// Calendar 命令處理
async function handleCalendarCommand(message, args, data) {
  if (args[0] === 'set') {
    const channel = message.mentions.channels.first();
    if (channel) {
      data.gcalPush.notifyChannel = channel.id;
      await message.channel.send(`✅ 已設定會議通知頻道: ${channel.name}`);
      savePhase7Data(data);
    }
  } else if (args[0] === 'minutes') {
    const minutes = parseInt(args[1]);
    if (minutes > 0) {
      data.gcalPush.notifyMinutes = minutes;
      await message.channel.send(`✅ 已設定會議提前通知: ${minutes} 分鐘`);
      savePhase7Data(data);
    }
  }
}

// Sync 命令處理
async function handleSyncCommand(message, args, data) {
  if (args[0] === 'notion') {
    data.sync.notion.enabled = true;
    // 需要 API key 和 databaseId
    await message.channel.send('✅ Notion 同步已啟用 (需要設定 API Key)');
    savePhase7Data(data);
  } else if (args[0] === 'linear') {
    data.sync.linear.enabled = true;
    await message.channel.send('✅ Linear 同步已啟用 (需要設定 API Key)');
    savePhase7Data(data);
  }
}

// ============ 模組導出 ============

module.exports = {
  initPhase7Data,
  savePhase7Data,
  initAnalyticsDB,
  saveAnalyticsDB,
  // 功能
  checkRSSFeeds,
  checkGitHubStars,
  checkPyPI,
  sendMorningGreeting,
  handleGreetingResponse,
  handleGreetingReaction,
  handleLeavingMessage,
  getWeeklyTheme,
  sendWeeklyThemeReminder,
  recordConversation,
  trackCommand,
  trackMessage,
  trackVoiceTime,
  getAnalyticsReport,
  // 命令處理
  handlePhase7Command
};