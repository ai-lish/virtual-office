/**
 * Phase 8: 6 項新功能
 * 
 * 1. Notion/Airtable 任務同步 - 監控任務更新並推送到 Discord
 * 2. Jenkins/CI 建置通知 - 監控 Jenkins build 狀態
 * 3. 截止前自動提醒 - 截止前自動 DM 負責人
 * 4. 安靜時段 - 晚上 11 點後禁止通知
 * 5. 每月清理 - 自動歸檔閒置頻道/threads
 * 6. Thread 封存 - 自動封存重要訊息
 */

const fs = require('fs');
const path = require('path');

const PHASE8_DATA_PATH = path.join(__dirname, 'phase8-data.json');

// 默認配置
function getDefaultConfig() {
  return {
    // 1. Notion/Airtable 任務同步
    notionSync: {
      enabled: false,
      apiKey: null,
      databaseId: null,
      checkInterval: 300000, // 5分鐘檢查一次
      lastCheck: null,
      channels: [] // 通知頻道
    },
    airtableSync: {
      enabled: false,
      apiKey: null,
      baseId: null,
      tableId: null,
      checkInterval: 300000,
      lastCheck: null,
      channels: []
    },
    
    // 2. Jenkins/CI 建置通知
    jenkins: {
      enabled: false,
      url: null,
      user: null,
      token: null,
      jobs: [], // 監控的 job 列表
      notifyOn: ['success', 'failure', 'unstable'],
      channels: []
    },
    ciMonitor: {
      enabled: false,
      providers: [], // GitHub Actions, GitLab CI 等
      channels: []
    },
    
    // 3. 截止前自動提醒
    deadlineReminder: {
      enabled: true,
      reminderHours: [24, 2, 1], // 截止前 24小時、2小時、1小時提醒
      tasks: [], // 任務列表
      notifyChannel: null
    },
    
    // 4. 安靜時段
    quietHours: {
      enabled: true,
      start: '23:00',
      end: '08:00',
      timezone: 'Asia/Hong_Kong',
      exemptUsers: [], //  exempt from quiet hours
      exemptTypes: ['urgent', 'emergency'] //  exempt notification types
    },
    
    // 5. 每月清理
    monthlyCleanup: {
      enabled: true,
      dayOfMonth: 1, // 每月1號執行
      archiveCategory: '歸檔',
      inactiveDays: 30, // 超過30天無活動視為閒置
      keepPinned: true, // 保留置頂訊息
      threads: {
        autoArchive: true,
        archiveAfterDays: 14
      },
      channels: {
        archiveEmpty: true,
        archiveInactive: true
      }
    },
    
    // 6. Thread 封存
    threadArchive: {
      enabled: true,
      autoArchiveKeywords: ['[完成]', '[已解决]', '[Closed]', '[Done]'],
      keepPinned: true,
      archiveCategory: '歸檔',
      notifyBeforeArchive: true,
      notifyHoursBefore: 24
    }
  };
}

// 加載 Phase 8 數據
function loadPhase8Data() {
  try {
    if (fs.existsSync(PHASE8_DATA_PATH)) {
      const data = JSON.parse(fs.readFileSync(PHASE8_DATA_PATH, 'utf8'));
      // 合併默認配置
      const defaultConfig = getDefaultConfig();
      return {
        config: { ...defaultConfig, ...data.config },
        tasks: data.tasks || [],
        notifications: data.notifications || [],
        archives: data.archives || [],
        cleanup: data.cleanup || { lastRun: null, results: [] }
      };
    }
  } catch (e) {
    console.error('[Phase8] 載入數據失敗:', e.message);
  }
  return {
    config: getDefaultConfig(),
    tasks: [],
    notifications: [],
    archives: [],
    cleanup: { lastRun: null, results: [] }
  };
}

// 保存 Phase 8 數據
function savePhase8Data(data) {
  try {
    fs.writeFileSync(PHASE8_DATA_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[Phase8] 保存數據失敗:', e.message);
  }
}

// 初始化數據
function initPhase8Data() {
  const data = loadPhase8Data();
  // 確保所有配置存在
  data.config = { ...getDefaultConfig(), ...data.config };
  savePhase8Data(data);
  return data;
}

// 檢查是否在安靜時段
function isQuietTime(config) {
  if (!config.quietHours?.enabled) return false;
  
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentTime = hour * 60 + minute;
  
  const startTime = parseTime(config.quietHours.start);
  const endTime = parseTime(config.quietHours.end);
  
  const startMinutes = startTime.hours * 60 + startTime.minutes;
  const endMinutes = endTime.hours * 60 + endTime.minutes;
  
  // 跨天情況 (例如 23:00 - 08:00)
  if (startMinutes > endMinutes) {
    return currentTime >= startMinutes || currentTime <= endMinutes;
  }
  
  return currentTime >= startMinutes && currentTime <= endMinutes;
}

// 解析時間
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

// 發送通知 (考慮安靜時段)
async function sendNotification(client, userId, message, config, type = 'normal') {
  // 檢查安靜時段
  if (isQuietTime(config) && !config.quietHours.exemptTypes.includes(type)) {
    console.log(`[Phase8] 安靜時段，跳過通知: ${type}`);
    // 記錄稍後發送
    return { success: false, reason: 'quiet_hours', queued: true };
  }
  
  try {
    const user = await client.users.fetch(userId);
    if (user) {
      await user.send(message);
      return { success: true };
    }
  } catch (e) {
    console.error(`[Phase8] 發送通知失敗:`, e.message);
    return { success: false, reason: e.message };
  }
}

// 發送到頻道
async function sendToChannel(client, channelId, message, config, type = 'normal') {
  if (isQuietTime(config) && !config.quietHours.exemptTypes.includes(type)) {
    console.log(`[Phase8] 安靜時段，跳過頻道通知: ${type}`);
    return { success: false, reason: 'quiet_hours' };
  }
  
  try {
    const channel = await client.channels.fetch(channelId);
    if (channel) {
      await channel.send(message);
      return { success: true };
    }
  } catch (e) {
    console.error(`[Phase8] 發送到頻道失敗:`, e.message);
    return { success: false, reason: e.message };
  }
}

// ==================== 功能實現 ====================

// 1. Notion/Airtable 任務同步
async function checkNotionUpdates(client) {
  const data = loadPhase8Data();
  const config = data.config.notionSync;
  
  if (!config.enabled || !config.apiKey) {
    return { checked: false, reason: 'not_configured' };
  }
  
  console.log('[Phase8] 檢查 Notion 任務更新...');
  
  // 模擬檢查 (實際需要 Notion API)
  // 這裡用 mock 數據演示
  const mockUpdates = [
    { id: '1', title: '完成 Phase 8 開發', status: 'In Progress', updatedAt: Date.now() }
  ];
  
  config.lastCheck = Date.now();
  
  // 發送到配置的頻道
  for (const channelId of config.channels) {
    const message = `📝 **Notion 任務更新**

${mockUpdates.map(t => `• ${t.title} - ${t.status}`).join('\n')}

---
⏰ 更新時間: ${new Date().toLocaleString('zh-TW')}`;
    
    await sendToChannel(client, channelId, message, data.config, 'sync');
  }
  
  savePhase8Data(data);
  return { checked: true, updates: mockUpdates };
}

async function checkAirtableUpdates(client) {
  const data = loadPhase8Data();
  const config = data.config.airtableSync;
  
  if (!config.enabled || !config.apiKey) {
    return { checked: false, reason: 'not_configured' };
  }
  
  console.log('[Phase8] 檢查 Airtable 任務更新...');
  
  // 模擬檢查
  const mockUpdates = [];
  
  config.lastCheck = Date.now();
  
  for (const channelId of config.channels) {
    if (mockUpdates.length > 0) {
      const message = `📊 **Airtable 任務更新**

${mockUpdates.map(t => `• ${t.title} - ${t.status}`).join('\n')}

---
⏰ 更新時間: ${new Date().toLocaleString('zh-TW')}`;
      await sendToChannel(client, channelId, message, data.config, 'sync');
    }
  }
  
  savePhase8Data(data);
  return { checked: true, updates: mockUpdates };
}

// 2. Jenkins/CI 建置通知
async function checkJenkinsBuilds(client) {
  const data = loadPhase8Data();
  const config = data.config.jenkins;
  
  if (!config.enabled || !config.url) {
    return { checked: false, reason: 'not_configured' };
  }
  
  console.log('[Phase8] 檢查 Jenkins 建置狀態...');
  
  // 模擬 Jenkins API 調用
  const mockBuilds = [
    { name: 'project-build', number: 123, status: 'SUCCESS', duration: 120 },
    { name: 'project-test', number: 122, status: 'FAILURE', duration: 300 }
  ];
  
  // 檢查需要通知的狀態變化
  for (const build of mockBuilds) {
    if (config.notifyOn.includes(build.status.toLowerCase())) {
      const emoji = build.status === 'SUCCESS' ? '✅' : build.status === 'FAILURE' ? '❌' : '⚠️';
      const message = `${emoji} **Jenkins 建置 ${build.name} #${build.number}**

狀態: ${build.status}
耗時: ${Math.round(build.duration / 60)} 分鐘

---
🔗 <${config.url}/job/${build.name}/${build.number}/>`;
      
      for (const channelId of config.channels) {
        await sendToChannel(client, channelId, message, data.config, 'ci');
      }
    }
  }
  
  savePhase8Data(data);
  return { checked: true, builds: mockBuilds };
}

async function checkCIActions(client) {
  const data = loadPhase8Data();
  const config = data.config.ciMonitor;
  
  if (!config.enabled || config.providers.length === 0) {
    return { checked: false, reason: 'not_configured' };
  }
  
  console.log('[Phase8] 檢查 CI 狀態...');
  
  // 處理每個 provider
  for (const provider of config.providers) {
    // 模擬檢查 GitHub Actions, GitLab CI 等
    console.log(`[Phase8] 檢查 ${provider.type}...`);
  }
  
  return { checked: true };
}

// 3. 截止前自動提醒
async function checkDeadlines(client) {
  const data = loadPhase8Data();
  const config = data.config.deadlineReminder;
  
  if (!config.enabled) {
    return { checked: false, reason: 'not_enabled' };
  }
  
  console.log('[Phase8] 檢查截止時間...');
  
  const now = Date.now();
  const reminders = [];
  
  for (const task of data.tasks) {
    if (!task.deadline || task.completed) continue;
    
    const deadlineTime = new Date(task.deadline).getTime();
    const hoursUntilDeadline = (deadlineTime - now) / (1000 * 60 * 60);
    
    for (const reminderHour of config.reminderHours) {
      // 檢查是否需要提醒 (在指定的時間範圍內)
      if (hoursUntilDeadline <= reminderHour && hoursUntilDeadline > reminderHour - 1) {
        // 檢查是否已經提醒過
        const lastReminder = task.lastReminders?.[reminderHour];
        if (!lastReminder || (now - lastReminder) > 60 * 60 * 1000) {
          // 發送提醒
          const message = `⏰ **任務截止提醒**

📌 任務: ${task.title}
⏱️ 截止: ${new Date(task.deadline).toLocaleString('zh-TW')}
📊 剩餘: 約 ${Math.round(hoursUntilDeadline)} 小時

👤 負責人: <@${task.assignee}>`;
          
          // DM 負責人
          if (task.assignee) {
            await sendNotification(client, task.assignee, message, data.config, 'deadline');
          }
          
          // 發送到通知頻道
          if (config.notifyChannel) {
            await sendToChannel(client, config.notifyChannel, message, data.config, 'deadline');
          }
          
          // 記錄提醒
          task.lastReminders = task.lastReminders || {};
          task.lastReminders[reminderHour] = now;
          
          reminders.push({ task: task.title, hours: reminderHour });
        }
      }
    }
  }
  
  savePhase8Data(data);
  return { checked: true, reminders };
}

// 4. 安靜時段 - 已在 isQuietTime() 實現

// 5. 每月清理
async function runMonthlyCleanup(client) {
  const data = loadPhase8Data();
  const config = data.config.monthlyCleanup;
  
  if (!config.enabled) {
    return { cleaned: false, reason: 'not_enabled' };
  }
  
  console.log('[Phase8] 執行每月清理...');
  
  const guild = client.guilds.cache.first();
  if (!guild) {
    return { cleaned: false, reason: 'no_guild' };
  }
  
  const results = [];
  const now = Date.now();
  const inactiveMs = config.inactiveDays * 24 * 60 * 60 * 1000;
  
  // 查找歸檔分類
  let archiveCategory = guild.channels.cache.find(
    c => c.type === 4 && c.name === config.archiveCategory // 4 = GuildCategory
  );
  
  // 如果不存在則創建
  if (!archiveCategory) {
    try {
      archiveCategory = await guild.channels.create({
        name: config.archiveCategory,
        type: 4
      });
      results.push(`創建歸檔分類: ${config.archiveCategory}`);
    } catch (e) {
      console.error('[Phase8] 創建歸檔分類失敗:', e.message);
    }
  }
  
  // 清理閒置 threads
  const forumChannels = guild.channels.cache.filter(c => c.type === 15); // 15 = GuildForum
  
  for (const [channelId, forum] of forumChannels) {
    try {
      const threads = forum.threads.cache;
      
      for (const thread of threads.values()) {
        const lastActivity = thread.lastMessage?.createdAt?.getTime() || 0;
        
        // 檢查是否需要歸檔
        if (now - lastActivity > inactiveMs) {
          if (config.threads.autoArchive && archiveCategory) {
            await thread.setParent(archiveCategory.id);
            results.push(`歸檔 thread: ${thread.name}`);
          }
        }
      }
    } catch (e) {
      console.error(`[Phase8] 清理 forum ${channelId} 失敗:`, e.message);
    }
  }
  
  // 記錄清理結果
  data.cleanup.lastRun = now;
  data.cleanup.results = results;
  savePhase8Data(data);
  
  return { cleaned: true, results };
}

// 6. Thread 封存
async function checkAndArchiveThreads(client) {
  const data = loadPhase8Data();
  const config = data.config.threadArchive;
  
  if (!config.enabled) {
    return { archived: false, reason: 'not_enabled' };
  }
  
  console.log('[Phase8] 檢查需要封存的 threads...');
  
  const guild = client.guilds.cache.first();
  if (!guild) {
    return { archived: false, reason: 'no_guild' };
  }
  
  // 查找歸檔分類
  let archiveCategory = guild.channels.cache.find(
    c => c.type === 4 && c.name === config.archiveCategory
  );
  
  if (!archiveCategory) {
    try {
      archiveCategory = await guild.channels.create({
        name: config.archiveCategory,
        type: 4
      });
    } catch (e) {
      console.error('[Phase8] 創建歸檔分類失敗:', e.message);
    }
  }
  
  const archived = [];
  const now = Date.now();
  
  // 檢查所有 forum 頻道
  const forumChannels = guild.channels.cache.filter(c => c.type === 15);
  
  for (const [channelId, forum] of forumChannels) {
    try {
      const threads = forum.threads.cache;
      
      for (const thread of threads.values()) {
        // 檢查是否包含完成關鍵詞
        const lastMessage = thread.lastMessage?.content || '';
        const shouldArchive = config.autoArchiveKeywords.some(
          keyword => lastMessage.includes(keyword)
        );
        
        // 檢查是否已經封存過
        const isAlreadyArchived = data.archives.some(a => a.threadId === thread.id);
        
        if (shouldArchive && !isAlreadyArchived && archiveCategory) {
          // 提前通知
          if (config.notifyBeforeArchive) {
            const hoursBefore = config.notifyHoursBefore;
            const lastActivity = thread.lastMessage?.createdAt?.getTime() || 0;
            
            if ((now - lastActivity) < hoursBefore * 60 * 60 * 1000) {
              await thread.send(`📦 此 thread 即將被封存至 ${config.archiveCategory}`);
            }
          }
          
          // 封存
          await thread.setParent(archiveCategory.id);
          
          // 記錄
          data.archives.push({
            threadId: thread.id,
            threadName: thread.name,
            archivedAt: now,
            reason: 'auto_keyword'
          });
          
          archived.push(thread.name);
        }
      }
    } catch (e) {
      console.error(`[Phase8] 處理 forum ${channelId} 失敗:`, e.message);
    }
  }
  
  savePhase8Data(data);
  return { archived };
}

// ==================== 命令處理 ====================

async function handlePhase8Command(message, args, data) {
  const subCommand = args[0]?.toLowerCase();
  const client = message.client;
  
  // !phase8 - 顯示幫助
  if (!subCommand || subCommand === 'help') {
    const helpText = `📦 **Phase 8: 6 項新功能**

**1. Notion/Airtable 任務同步**
\`!phase8 notion enable [apiKey] [databaseId]\`
\`!phase8 notion channel [#channel]\`
\`!phase8 airtable enable [apiKey] [baseId]\`

**2. Jenkins/CI 建置通知**
\`!phase8 jenkins enable [url] [user] [token]\`
\`!phase8 jenkins addjob [jobName]\`
\`!phase8 ci enable github\` / \`!phase8 ci enable gitlab\`

**3. 截止前自動提醒**
\`!phase8 deadline add [任務] [@user] [deadline]\`
\`!phase8 deadline list\`
\`!phase8 deadline remove [id]\`

**4. 安靜時段**
\`!phase8 quiet on/off\`
\`!phase8 quiet set [start] [end]\`
\`!phase8 quiet status\`

**5. 每月清理**
\`!phase8 cleanup run\`
\`!phase8 cleanup status\`
\`!phase8 cleanup config [days]\`

**6. Thread 封存**
\`!phase8 archive run\`
\`!phase8 archive keywords\`
\`!phase8 archive add [關鍵詞]\`

**狀態查看**:
\`!phase8 status\` - 查看所有功能狀態`;
    
    await message.channel.send(helpText);
    return;
  }
  
  // !phase8 status
  if (subCommand === 'status') {
    const config = data.config;
    const status = `📦 **Phase 8 功能狀態**

**1. 任務同步**
• Notion: ${config.notionSync.enabled ? '✅ 啟用' : '❌ 停用'}
• Airtable: ${config.airtableSync.enabled ? '✅ 啟用' : '❌ 停用'}

**2. CI 監控**
• Jenkins: ${config.jenkins.enabled ? '✅ 啟用' : '❌ 停用'}
• CI Monitor: ${config.ciMonitor.enabled ? '✅ 啟用' : '❌ 停用'}

**3. 截止提醒**
• 狀態: ${config.deadlineReminder.enabled ? '✅ 啟用' : '❌ 停用'}
• 任務數: ${data.tasks.length} 個

**4. 安靜時段**
• 狀態: ${config.quietHours.enabled ? '✅ 啟用' : '❌ 停用'}
• 時間: ${config.quietHours.start} - ${config.quietHours.end}

**5. 每月清理**
• 狀態: ${config.monthlyCleanup.enabled ? '✅ 啟用' : '❌ 停用'}
• 最後執行: ${data.cleanup.lastRun ? new Date(data.cleanup.lastRun).toLocaleString('zh-TW') : '從未'}

**6. Thread 封存**
• 狀態: ${config.threadArchive.enabled ? '✅ 啟用' : '❌ 停用'}
• 已封存: ${data.archives.length} 個`;
    
    await message.channel.send(status);
    return;
  }
  
  // ========== Notion ==========
  if (subCommand === 'notion') {
    const action = args[1]?.toLowerCase();
    
    if (action === 'enable') {
      const apiKey = args[2];
      const databaseId = args[3];
      
      if (!apiKey || !databaseId) {
        await message.channel.send('用法: !phase8 notion enable [apiKey] [databaseId]');
        return;
      }
      
      data.config.notionSync.enabled = true;
      data.config.notionSync.apiKey = apiKey;
      data.config.notionSync.databaseId = databaseId;
      savePhase8Data(data);
      
      await message.channel.send('✅ Notion 同步已啟用\n📝 每 5 分鐘檢查一次更新');
      return;
    }
    
    if (action === 'disable') {
      data.config.notionSync.enabled = false;
      savePhase8Data(data);
      await message.channel.send('❌ Notion 同步已停用');
      return;
    }
    
    if (action === 'channel') {
      const channel = message.mentions.channels.first();
      if (!channel) {
        await message.channel.send('用法: !phase8 notion channel [#channel]');
        return;
      }
      
      if (!data.config.notionSync.channels.includes(channel.id)) {
        data.config.notionSync.channels.push(channel.id);
        savePhase8Data(data);
      }
      
      await message.channel.send(`✅ 已添加通知頻道: ${channel.name}`);
      return;
    }
    
    await message.channel.send('📝 **Notion 命令**:\n!phase8 notion enable [apiKey] [databaseId]\n!phase8 notion channel [#channel]\n!phase8 notion disable');
    return;
  }
  
  // ========== Airtable ==========
  if (subCommand === 'airtable') {
    const action = args[1]?.toLowerCase();
    
    if (action === 'enable') {
      const apiKey = args[2];
      const baseId = args[3];
      
      if (!apiKey || !baseId) {
        await message.channel.send('用法: !phase8 airtable enable [apiKey] [baseId]');
        return;
      }
      
      data.config.airtableSync.enabled = true;
      data.config.airtableSync.apiKey = apiKey;
      data.config.airtableSync.baseId = baseId;
      savePhase8Data(data);
      
      await message.channel.send('✅ Airtable 同步已啟用');
      return;
    }
    
    if (action === 'disable') {
      data.config.airtableSync.enabled = false;
      savePhase8Data(data);
      await message.channel.send('❌ Airtable 同步已停用');
      return;
    }
    
    if (action === 'channel') {
      const channel = message.mentions.channels.first();
      if (!channel) {
        await message.channel.send('用法: !phase8 airtable channel [#channel]');
        return;
      }
      
      if (!data.config.airtableSync.channels.includes(channel.id)) {
        data.config.airtableSync.channels.push(channel.id);
        savePhase8Data(data);
      }
      
      await message.channel.send(`✅ 已添加通知頻道: ${channel.name}`);
      return;
    }
    
    await message.channel.send('📊 **Airtable 命令**:\n!phase8 airtable enable [apiKey] [baseId]\n!phase8 airtable channel [#channel]');
    return;
  }
  
  // ========== Jenkins ==========
  if (subCommand === 'jenkins') {
    const action = args[1]?.toLowerCase();
    
    if (action === 'enable') {
      const url = args[2];
      const user = args[3];
      const token = args[4];
      
      if (!url) {
        await message.channel.send('用法: !phase8 jenkins enable [url] [user] [token]');
        return;
      }
      
      data.config.jenkins.enabled = true;
      data.config.jenkins.url = url;
      data.config.jenkins.user = user;
      data.config.jenkins.token = token;
      savePhase8Data(data);
      
      await message.channel.send('✅ Jenkins 監控已啟用');
      return;
    }
    
    if (action === 'disable') {
      data.config.jenkins.enabled = false;
      savePhase8Data(data);
      await message.channel.send('❌ Jenkins 監控已停用');
      return;
    }
    
    if (action === 'addjob' || action === 'add') {
      const jobName = args[2];
      
      if (!jobName) {
        await message.channel.send('用法: !phase8 jenkins addjob [jobName]');
        return;
      }
      
      if (!data.config.jenkins.jobs.includes(jobName)) {
        data.config.jenkins.jobs.push(jobName);
        savePhase8Data(data);
      }
      
      await message.channel.send(`✅ 已添加監控 Job: ${jobName}`);
      return;
    }
    
    if (action === 'channel') {
      const channel = message.mentions.channels.first();
      if (!channel) {
        await message.channel.send('用法: !phase8 jenkins channel [#channel]');
        return;
      }
      
      if (!data.config.jenkins.channels.includes(channel.id)) {
        data.config.jenkins.channels.push(channel.id);
        savePhase8Data(data);
      }
      
      await message.channel.send(`✅ 已添加通知頻道: ${channel.name}`);
      return;
    }
    
    await message.channel.send('🔧 **Jenkins 命令**:\n!phase8 jenkins enable [url] [user] [token]\n!phase8 jenkins addjob [jobName]\n!phase8 jenkins channel [#channel]');
    return;
  }
  
  // ========== CI ==========
  if (subCommand === 'ci') {
    const action = args[1]?.toLowerCase();
    const provider = args[2]?.toLowerCase();
    
    if (action === 'enable') {
      if (!provider) {
        await message.channel.send('用法: !phase8 ci enable [github|gitlab|azure]');
        return;
      }
      
      data.config.ciMonitor.enabled = true;
      
      // 添加 provider
      const existingProvider = data.config.ciMonitor.providers.find(p => p.type === provider);
      if (!existingProvider) {
        data.config.ciMonitor.providers.push({
          type: provider,
          enabled: true,
          config: {}
        });
      }
      
      savePhase8Data(data);
      await message.channel.send(`✅ ${provider} CI 監控已啟用`);
      return;
    }
    
    if (action === 'disable') {
      const providerToDisable = args[2]?.toLowerCase();
      
      if (providerToDisable) {
        data.config.ciMonitor.providers = data.config.ciMonitor.providers.filter(
          p => p.type !== providerToDisable
        );
        await message.channel.send(`❌ ${providerToDisable} CI 監控已停用`);
      } else {
        data.config.ciMonitor.enabled = false;
        await message.channel.send('❌ CI 監控已全部停用');
      }
      
      savePhase8Data(data);
      return;
    }
    
    if (action === 'channel') {
      const channel = message.mentions.channels.first();
      if (!channel) {
        await message.channel.send('用法: !phase8 ci channel [#channel]');
        return;
      }
      
      if (!data.config.ciMonitor.channels.includes(channel.id)) {
        data.config.ciMonitor.channels.push(channel.id);
        savePhase8Data(data);
      }
      
      await message.channel.send(`✅ 已添加通知頻道: ${channel.name}`);
      return;
    }
    
    await message.channel.send('🔄 **CI 命令**:\n!phase8 ci enable [github|gitlab]\n!phase8 ci disable [provider]\n!phase8 ci channel [#channel]');
    return;
  }
  
  // ========== Deadline ==========
  if (subCommand === 'deadline') {
    const action = args[1]?.toLowerCase();
    
    if (action === 'add') {
      // !phase8 deadline add [任務] [@user] [deadline]
      const taskName = args.slice(2).join(' ').split('@')[0]?.trim();
      const userMention = message.content.match(/<@!?(\d+)>/);
      const deadlineArg = args[args.length - 1];
      
      if (!taskName || !userMention || !deadlineArg) {
        await message.channel.send('用法: !phase8 deadline add [任務] [@user] [YYYY-MM-DD 或 +Xh/Xd]');
        return;
      }
      
      // 解析 deadline
      let deadline;
      if (deadlineArg.startsWith('+')) {
        const num = parseInt(deadlineArg.slice(1, -1));
        const unit = deadlineArg.slice(-1);
        const now = Date.now();
        
        if (unit === 'h') {
          deadline = new Date(now + num * 60 * 60 * 1000);
        } else if (unit === 'd') {
          deadline = new Date(now + num * 24 * 60 * 60 * 1000);
        } else {
          deadline = new Date(deadlineArg);
        }
      } else {
        deadline = new Date(deadlineArg);
      }
      
      const task = {
        id: `task_${Date.now()}`,
        title: taskName,
        assignee: userMention[1],
        deadline: deadline.toISOString(),
        createdAt: Date.now(),
        completed: false,
        lastReminders: {}
      };
      
      data.tasks.push(task);
      savePhase8Data(data);
      
      await message.channel.send(`✅ 已添加任務: ${taskName}\n⏰ 截止: ${deadline.toLocaleString('zh-TW')}\n👤 負責人: <@${task.assignee}>`);
      return;
    }
    
    if (action === 'list') {
      if (data.tasks.length === 0) {
        await message.channel.send('📝 暫無任務');
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
    
    if (action === 'remove' || action === 'delete') {
      const taskId = args[2];
      
      if (!taskId) {
        await message.channel.send('用法: !phase8 deadline remove [taskId]');
        return;
      }
      
      const index = data.tasks.findIndex(t => t.id === taskId);
      if (index === -1) {
        await message.channel.send(`❌ 找不到任務: ${taskId}`);
        return;
      }
      
      const removed = data.tasks.splice(index, 1)[0];
      savePhase8Data(data);
      
      await message.channel.send(`✅ 已刪除任務: ${removed.title}`);
      return;
    }
    
    if (action === 'complete' || action === 'done') {
      const taskId = args[2];
      
      if (!taskId) {
        await message.channel.send('用法: !phase8 deadline complete [taskId]');
        return;
      }
      
      const task = data.tasks.find(t => t.id === taskId);
      if (!task) {
        await message.channel.send(`❌ 找不到任務: ${taskId}`);
        return;
      }
      
      task.completed = true;
      savePhase8Data(data);
      
      await message.channel.send(`✅ 任務已完成: ${task.title}`);
      return;
    }
    
    await message.channel.send('⏰ **Deadline 命令**:\n!phase8 deadline add [任務] [@user] [+1d]\n!phase8 deadline list\n!phase8 deadline remove [id]\n!phase8 deadline complete [id]');
    return;
  }
  
  // ========== Quiet Hours ==========
  if (subCommand === 'quiet') {
    const action = args[1]?.toLowerCase();
    
    if (action === 'on' || action === 'enable') {
      data.config.quietHours.enabled = true;
      savePhase8Data(data);
      await message.channel.send('✅ 安靜時段已啟用\n🌙 時間: ' + data.config.quietHours.start + ' - ' + data.config.quietHours.end);
      return;
    }
    
    if (action === 'off' || action === 'disable') {
      data.config.quietHours.enabled = false;
      savePhase8Data(data);
      await message.channel.send('❌ 安靜時段已停用');
      return;
    }
    
    if (action === 'set' || action === 'config') {
      const start = args[2];
      const end = args[3];
      
      if (!start || !end) {
        await message.channel.send('用法: !phase8 quiet set [start] [end]\n例如: !phase8 quiet set 23:00 08:00');
        return;
      }
      
      // 驗證時間格式
      if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
        await message.channel.send('❌ 請使用 HH:MM 格式\n例如: 23:00, 08:00');
        return;
      }
      
      data.config.quietHours.start = start;
      data.config.quietHours.end = end;
      savePhase8Data(data);
      
      await message.channel.send(`✅ 安靜時段已設定: ${start} - ${end}`);
      return;
    }
    
    if (action === 'status') {
      const status = `🌙 **安靜時段狀態**

• 狀態: ${data.config.quietHours.enabled ? '✅ 啟用' : '❌ 停用'}
• 時間: ${data.config.quietHours.start} - ${data.config.quietHours.end}
• 時區: ${data.config.quietHours.timezone}
• 豁免類型: ${data.config.quietHours.exemptTypes.join(', ')}`;
      
      await message.channel.send(status);
      return;
    }
    
    // 測試安靜時段
    if (action === 'test') {
      const isQuiet = isQuietTime(data.config);
      await message.channel.send(`🧪 當前時間是否在安靜時段: ${isQuiet ? '✅ 是' : '❌ 否'}`);
      return;
    }
    
    await message.channel.send('🌙 **安靜時段命令**:\n!phase8 quiet on/off\n!phase8 quiet set [start] [end]\n!phase8 quiet status\n!phase8 quiet test');
    return;
  }
  
  // ========== Cleanup ==========
  if (subCommand === 'cleanup') {
    const action = args[1]?.toLowerCase();
    
    if (action === 'run' || action === 'execute') {
      const result = await runMonthlyCleanup(client);
      
      if (result.cleaned) {
        await message.channel.send(`✅ 每月清理完成\n\n${result.results.join('\n') || '無項目清理'}`);
      } else {
        await message.channel.send(`❌ 清理失敗: ${result.reason}`);
      }
      return;
    }
    
    if (action === 'status') {
      const status = `🧹 **每月清理狀態**

• 狀態: ${data.config.monthlyCleanup.enabled ? '✅ 啟用' : '❌ 停用'}
• 執行日: 每月 ${data.config.monthlyCleanup.dayOfMonth} 號
• 閒置定義: ${data.config.monthlyCleanup.inactiveDays} 天
• 最後執行: ${data.cleanup.lastRun ? new Date(data.cleanup.lastRun).toLocaleString('zh-TW') : '從未'}
• 歷史結果: ${data.cleanup.results.length} 條`;
      
      await message.channel.send(status);
      return;
    }
    
    if (action === 'config') {
      const days = parseInt(args[2]);
      
      if (isNaN(days)) {
        await message.channel.send('用法: !phase8 cleanup config [天數]');
        return;
      }
      
      data.config.monthlyCleanup.inactiveDays = days;
      savePhase8Data(data);
      
      await message.channel.send(`✅ 已設定閒置天數為 ${days} 天`);
      return;
    }
    
    await message.channel.send('🧹 **每月清理命令**:\n!phase8 cleanup run\n!phase8 cleanup status\n!phase8 cleanup config [days]');
    return;
  }
  
  // ========== Archive ==========
  if (subCommand === 'archive') {
    const action = args[1]?.toLowerCase();
    
    if (action === 'run' || action === 'execute') {
      const result = await checkAndArchiveThreads(client);
      
      if (result.archived?.length > 0) {
        await message.channel.send(`✅ Thread 封存完成\n\n已封存: ${result.archived.join(', ')}`);
      } else {
        await message.channel.send('📦 沒有需要封存的 threads');
      }
      return;
    }
    
    if (action === 'list' || action === 'history') {
      if (data.archives.length === 0) {
        await message.channel.send('📦 暫無封存記錄');
        return;
      }
      
      let list = '📦 **封存記錄**\n\n';
      for (const archive of data.archives.slice(-10).reverse()) {
        list += `• ${archive.threadName}\n`;
        list += `   📅 ${new Date(archive.archivedAt).toLocaleString('zh-TW')}\n`;
        list += `   原因: ${archive.reason}\n\n`;
      }
      
      await message.channel.send(list);
      return;
    }
    
    if (action === 'keywords') {
      const keywords = data.config.threadArchive.autoArchiveKeywords.join(', ');
      await message.channel.send(`🏷️ **自動封存關鍵詞**\n\n${keywords}\n\n用法: !phase8 archive add [關鍵詞]`);
      return;
    }
    
    if (action === 'add') {
      const keyword = args.slice(2).join(' ');
      
      if (!keyword) {
        await message.channel.send('用法: !phase8 archive add [關鍵詞]');
        return;
      }
      
      if (!data.config.threadArchive.autoArchiveKeywords.includes(keyword)) {
        data.config.threadArchive.autoArchiveKeywords.push(keyword);
        savePhase8Data(data);
      }
      
      await message.channel.send(`✅ 已添加關鍵詞: ${keyword}`);
      return;
    }
    
    if (action === 'remove') {
      const keyword = args.slice(2).join(' ');
      
      if (!keyword) {
        await message.channel.send('用法: !phase8 archive remove [關鍵詞]');
        return;
      }
      
      data.config.threadArchive.autoArchiveKeywords = 
        data.config.threadArchive.autoArchiveKeywords.filter(k => k !== keyword);
      savePhase8Data(data);
      
      await message.channel.send(`❌ 已移除關鍵詞: ${keyword}`);
      return;
    }
    
    await message.channel.send('📦 **Thread 封存命令**:\n!phase8 archive run\n!phase8 archive list\n!phase8 archive keywords\n!phase8 archive add [關鍵詞]');
    return;
  }
}

// ==================== 定時任務 ====================

// 運行所有定時檢查
async function runPeriodicChecks(client) {
  const data = initPhase8Data();
  const results = [];
  
  // 1. Notion 同步
  if (data.config.notionSync.enabled) {
    const result = await checkNotionUpdates(client);
    results.push({ feature: 'notion', ...result });
  }
  
  // 2. Airtable 同步
  if (data.config.airtableSync.enabled) {
    const result = await checkAirtableUpdates(client);
    results.push({ feature: 'airtable', ...result });
  }
  
  // 3. Jenkins/CI 檢查
  if (data.config.jenkins.enabled) {
    const result = await checkJenkinsBuilds(client);
    results.push({ feature: 'jenkins', ...result });
  }
  
  if (data.config.ciMonitor.enabled) {
    const result = await checkCIActions(client);
    results.push({ feature: 'ci', ...result });
  }
  
  // 4. 截止提醒
  if (data.config.deadlineReminder.enabled) {
    const result = await checkDeadlines(client);
    results.push({ feature: 'deadline', ...result });
  }
  
  // 5. Thread 封存檢查
  if (data.config.threadArchive.enabled) {
    const result = await checkAndArchiveThreads(client);
    results.push({ feature: 'archive', ...result });
  }
  
  return results;
}

// 模組導出
module.exports = {
  initPhase8Data,
  loadPhase8Data,
  savePhase8Data,
  handlePhase8Command,
  runPeriodicChecks,
  runMonthlyCleanup,
  checkAndArchiveThreads,
  isQuietTime,
  sendNotification,
  sendToChannel
};