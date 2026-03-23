/**
 * Phase 9: 10項新功能建議
 * 
 * 1. Thread Templates - `!thread template` - 統一團隊工作日誌格式
 * 2. Forum Channel - 每個項目一個討論串
 * 3. 指令分類目錄 - Select Menu 選擇不同功能模組
 * 4. 斜線指令 - (/) 提升指令輸入效率
 * 5. GitHub Webhook - commit 和 PR 更新（已存在，可加強）
 * 6. Google Calendar - 新會議自動提醒（已存在，可加強）
 * 7. 番茄工作法 - 定時詢問工作進展
 * 8. 狀態儀表板 - 實時顯示團隊工作進度
 * 9. Channel Follow - 重要頻道消息跨伺服器共享
 * 10. Cron Job 提醒 - 指定時間發送任務提醒
 */

const fs = require('fs');
const path = require('path');

const PHASE9_DATA_PATH = path.join(__dirname, 'phase9-data.json');

// 初始化 Phase 9 數據
function initPhase9Data() {
  const defaultData = {
    // 1. Thread Templates - 工作日誌範本
    threadTemplates: {
      dailyLog: {
        name: '每日工作日誌',
        format: `📝 **每日工作日誌 - {date}**

**👤 成員:** {author}

**✅ 今日完成:**
{completed}

**⏳ 進行中:**
{inProgress}

**🎯 明日計劃:**
{nextSteps}

**📌 備註:**
{notes}`
      },
      weeklyLog: {
        name: '每週工作週報',
        format: `📊 **每週工作週報 - {weekOf}**

**👤 成員:** {author}

**📈 本週完成:**
{weeklyCompleted}

**🎯 學習/成長:**
{learnings}

**🔮 下週目標:**
{nextWeekGoals}

**📌 備註:**
{notes}`
      },
      projectUpdate: {
        name: '項目更新',
        format: `🚀 **項目更新 - {project}**

**📝 進度:** {progress}%
**🔄 狀態:** {status}

**✅ 已完成:**
{completed}

**⏳ 進行中:**
{inProgress}

**🚧 阻礙:**
{blockers}

**📅 下一步:**
{nextSteps}`
      },
      bugReport: {
        name: 'Bug 報告',
        format: `🐛 **Bug 報告**

**📌 標題:** {title}
**🔴 嚴重程度:** {severity}

**📝 描述:**
{description}

**🔄 重現步驟:**
{steps}

**💡 解決方案:**
{solutions}`
      }
    },
    // 2. Forum Channel - 項目討論串
    forumChannels: {
      // 每個項目的 Forum Channel 配置
      projects: {
        'ai-learning': { forumChannelId: null, description: 'AI 學習項目討論' },
        'virtual-office': { forumChannelId: null, description: '虛擬辦公室討論' },
        'lsc-ole-s1-2026': { forumChannelId: null, description: 'LSC OLE S1 2026 討論' },
        'homework-duty-system': { forumChannelId: null, description: '功課值班系統討論' },
        'math-week-2026': { forumChannelId: null, description: '數學周 2026 討論' },
        'teacher-dev-day': { forumChannelId: null, description: '教師發展日討論' }
      },
      defaultTags: [
        { name: '問題', emoji: '❓' },
        { name: '建議', emoji: '💡' },
        { name: '完成', emoji: '✅' },
        { name: '討論中', emoji: '💬' }
      ]
    },
    // 3. 指令分類目錄 - Select Menu 配置
    commandMenus: {
      enabled: true,
      mainMenu: {
        placeholder: '選擇功能模組...',
        options: [
          { label: '📋 範本', value: 'menu_templates', description: '工作日誌、週報範本' },
          { label: '📊 狀態', value: 'menu_status', description: '成員狀態、儀表板' },
          { label: '🍅 Pomodoro', value: 'menu_pomodoro', description: '番茄工作法計時' },
          { label: '🗳️ 投票', value: 'menu_poll', description: '創建和管理投票' },
          { label: '⏰ 提醒', value: 'menu_reminder', description: '設定任務提醒' },
          { label: '📅 日曆', value: 'menu_calendar', description: '查看會議和日程' },
          { label: '❓ 幫助', value: 'menu_help', description: '查看所有命令' }
        ]
      }
    },
    // 4. 斜線指令 - Slash Commands 配置
    slashCommands: {
      enabled: true,
      commands: [
        { name: 'template', description: '獲取範本', options: [
          { name: 'type', description: '範本類型', type: 'STRING', choices: [
            { name: '每日日誌', value: 'dailyLog' },
            { name: '每週週報', value: 'weeklyLog' },
            { name: '項目更新', value: 'projectUpdate' },
            { name: 'Bug報告', value: 'bugReport' }
          ]}
        ]},
        { name: 'status', description: '查看或設定狀態', options: [
          { name: 'action', description: '動作', type: 'STRING', choices: [
            { name: '查看狀態', value: 'view' },
            { name: '設定狀態', value: 'set' },
            { name: '標記完成', value: 'done' }
          ]},
          { name: 'task', description: '任務內容', type: 'STRING', required: false }
        ]},
        { name: 'pomodoro', description: 'Pomodoro 計時器', options: [
          { name: 'action', description: '動作', type: 'STRING', choices: [
            { name: '開始工作', value: 'start' },
            { name: '短休息', value: 'short' },
            { name: '長休息', value: 'long' },
            { name: '停止', value: 'stop' },
            { name: '狀態', value: 'status' }
          ]},
          { name: 'task', description: '任務名稱', type: 'STRING', required: false }
        ]},
        { name: 'poll', description: '創建投票', options: [
          { name: 'question', description: '投票問題', type: 'STRING', required: true },
          { name: 'options', description: '選項 (用 | 分隔)', type: 'STRING', required: true },
          { name: 'duration', description: '持續時間 (小時)', type: 'INTEGER', required: false }
        ]},
        { name: 'remind', description: '設定提醒', options: [
          { name: 'time', description: '時間 (如 1h, 30m)', type: 'STRING', required: true },
          { name: 'message', description: '提醒內容', type: 'STRING', required: true }
        ]},
        { name: 'gcal', description: 'Google Calendar', options: [
          { name: 'action', description: '動作', type: 'STRING', choices: [
            { name: '今日會議', value: 'today' },
            { name: '明日會議', value: 'tomorrow' },
            { name: '本週會議', value: 'week' }
          ]}
        ]},
        { name: 'help', description: '獲取幫助' }
      ]
    },
    // 5. GitHub Webhook 增強
    githubEnhanced: {
      enabled: true,
      notifyOn: {
        push: true,           // 代碼推送
        prOpened: true,       // PR 開啟
        prClosed: true,       // PR 關閉/合併
        prMerged: true,       // PR 合併
        issueOpened: true,   // Issue 開啟
        issueClosed: true,   // Issue 關閉
        reviewRequested: true // 要求審查
      },
      channels: {},           // 每個 repo 的頻道映射
      recentCommits: {}       // 最近 commits 緩存
    },
    // 6. Google Calendar 增強
    calendarEnhanced: {
      enabled: true,
      notifyBefore: 5,        // 會議前多少分鐘
      notifyOnStart: true,    // 會議開始時通知
      includeMeetLink: true,   // 包含 Meet 連結
      calendarId: 'primary',
      lastNotify: {},
      upcomingEvents: []       // 即將到來的會議緩存
    },
    // 7. Pomodoro 定時詢問工作進展
    pomodoroCheckIn: {
      enabled: true,
      checkInInterval: 15 * 60 * 1000,  // 每15分鐘詢問一次
      checkInMessages: [
        '💪 專注進行中！堅持住！',
        '⏰ 時間過了一半，進度如何？',
        '🔥 最後衝刺！還有几分鐘就完成！',
        '🎉 恭喜完成！準備好休息了嗎？'
      ],
      checkInThreshold: [0.5, 0.75, 0.9, 1.0]  // 觸發詢問的進度百分比
    },
    // 8. 狀態儀表板 - 實時顯示團隊工作進度
    dashboard: {
      enabled: true,
      channel: null,           // 儀表板頻道
      messageId: null,        // 儀表板訊息 ID
      refreshInterval: 60 * 1000,  // 刷新間隔 (1分鐘)
      sections: {
        members: true,        // 成員狀態
        tasks: true,          // 任務進度
        pomodoro: true,       // Pomodoro 狀態
        mood: true,           // 心情統計
        upcoming: true        // 即將到來的事件
      },
      lastUpdate: null
    },
    // 9. Channel Follow - 跨伺服器頻道共享
    channelFollow: {
      enabled: true,
      follows: [],            // 追蹤配置 [{
      //   sourceChannel: 'xxx',
      //   targetChannel: 'xxx',
      //   targetGuild: 'xxx',
      //   filters: []
      // }]
      recentMessages: {}      // 已轉發的消息緩存
    },
    // 10. Cron Job 提醒增強
    cronEnhanced: {
      enabled: true,
      reminders: [
        { id: 'standup', name: '每日 Standup', time: '09:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], enabled: true },
        { id: 'weekly', name: '週報催交', time: '17:00', days: ['friday'], enabled: true },
        { id: 'mood', name: '心情問候', time: '09:30', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], enabled: true },
        { id: 'lunch', name: '午飯提醒', time: '12:30', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], enabled: false },
        { id: 'cleanup', name: '清理提醒', time: '18:00', days: ['friday'], enabled: false }
      ],
      customReminders: []     // 用戶自定義提醒
    }
  };

  // 如果文件存在，合併現有配置
  try {
    if (fs.existsSync(PHASE9_DATA_PATH)) {
      const existing = JSON.parse(fs.readFileSync(PHASE9_DATA_PATH, 'utf8'));
      return deepMerge(defaultData, existing);
    }
  } catch (e) {
    console.error('[Phase9] 載入數據失敗:', e.message);
  }

  return defaultData;
}

// 深度合併對象
function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}

// 保存數據
function saveData(data) {
  try {
    fs.writeFileSync(PHASE9_DATA_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[Phase9] 保存數據失敗:', e.message);
  }
}

// 加載數據
function loadData() {
  return initPhase9Data();
}

// ==================== 1. Thread Templates ====================

// 處理 Thread Template 命令
async function handleThreadTemplateCommand(message, args, data) {
  const subCommand = args[0]?.toLowerCase();
  const templates = data.threadTemplates;

  if (!subCommand || subCommand === 'help' || subCommand === 'list') {
    const list = Object.entries(templates).map(([key, t]) => 
      `• \`!thread ${key}\` - ${t.name}`
    ).join('\n');
    await message.channel.send(`📝 **Thread 範本**:\n${list}\n\n使用 \`!thread [類型]\` 獲取範本`);
    return;
  }

  const template = templates[subCommand];
  if (!template) {
    await message.channel.send(`❌ 未知的範本類型: ${subCommand}\n使用 \`!thread list\` 查看可用範本`);
    return;
  }

  // 填充默認值
  const today = new Date();
  const formatted = template.format
    .replace(/{date}/g, today.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }))
    .replace(/{weekOf}/g, today.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' }))
    .replace(/{author}/g, message.author.displayName)
    .replace(/{project}/g, '[項目名稱]')
    .replace(/{progress}/g, '0')
    .replace(/{status}/g, '進行中')
    .replace(/{completed}/g, '• ')
    .replace(/{inProgress}/g, '• ')
    .replace(/{nextSteps}/g, '• ')
    .replace(/{notes}/g, '無')
    .replace(/{blockers}/g, '無')
    .replace(/{learnings}/g, '• ')
    .replace(/{nextWeekGoals}/g, '• ')
    .replace(/{title}/g, '[Bug 標題]')
    .replace(/{severity}/g, '🔶 中等')
    .replace(/{description}/g, '[描述問題]')
    .replace(/{steps}/g, '1. \n2. \n3. ')
    .replace(/{solutions}/g, '[解決方案]');

  await message.channel.send(formatted);
}

// ==================== 2. Forum Channel ====================

// 處理 Forum Channel 命令
async function handleForumCommand(message, args, data) {
  const subCommand = args[0]?.toLowerCase();
  const forumData = data.forumChannels;

  if (!subCommand || subCommand === 'help') {
    await message.channel.send(`📋 **Forum Channel 命令**:

\`!forum list\` - 查看所有項目論壇
\`!forum create [項目]\` - 為項目創建 Forum Channel
\`!forum post [項目] [標題]\` - 在項目論壇發帖
\`!forum tags\` - 查看可用標籤`);
    return;
  }

  if (subCommand === 'list') {
    const projects = Object.entries(forumData.projects).map(([key, p]) => {
      const status = p.forumChannelId ? '✅' : '❌';
      return `• ${status} \`${key}\` - ${p.description}`;
    }).join('\n');
    await message.channel.send(`📁 **項目論壇**:\n${projects}`);
    return;
  }

  if (subCommand === 'create') {
    const project = args[1];
    if (!project || !forumData.projects[project]) {
      await message.channel.send(`❌ 未知的項目: ${project}\n使用 \`!forum list\` 查看可用項目`);
      return;
    }

    // 創建 Forum Channel
    try {
      const guild = message.guild;
      const forumChannel = await guild.channels.create({
        name: `${project}-討論`,
        type: ChannelType.GuildForum,
        topic: forumData.projects[project].description,
        permissionOverwrites: []
      });

      // 添加默認標籤
      for (const tag of forumData.defaultTags) {
        // Note: Discord.js 需要管理員權限才能創建標籤
      }

      forumData.projects[project].forumChannelId = forumChannel.id;
      saveData(data);

      await message.channel.send(`✅ 已為項目 \`${project}\` 創建 Forum Channel: ${forumChannel}`);
    } catch (e) {
      await message.channel.send(`❌ 創建失敗: ${e.message}`);
    }
    return;
  }

  if (subCommand === 'post') {
    const project = args[1];
    const title = args.slice(2).join(' ');

    if (!project || !forumData.projects[project]) {
      await message.channel.send(`❌ 未知的項目: ${project}`);
      return;
    }

    const channelId = forumData.projects[project].forumChannelId;
    if (!channelId) {
      await message.channel.send(`❌ 項目 \`${project}\` 尚未創建 Forum Channel\n使用 \`!forum create ${project}\` 創建`);
      return;
    }

    try {
      const channel = await message.client.channels.fetch(channelId);
      if (channel && channel.type === ChannelType.GuildForum) {
        const thread = await channel.threads.create({
          name: title || '新帖子',
          message: {
            content: `📝 **發帖人:** ${message.author.displayName}\n**時間:** ${new Date().toLocaleString('zh-TW')}`
          }
        });
        await message.channel.send(`✅ 已發帖: ${thread}`);
      }
    } catch (e) {
      await message.channel.send(`❌ 發帖失敗: ${e.message}`);
    }
    return;
  }

  if (subCommand === 'tags') {
    const tags = forumData.defaultTags.map(t => `${t.emoji} ${t.name}`).join('\n');
    await message.channel.send(`🏷️ **可用標籤**:\n${tags}`);
    return;
  }
}

// ==================== 3. 指令分類目錄 - Select Menu ====================

// 發送命令選單
async function sendCommandMenu(message, data) {
  const { MessageActionRow, MessageSelectMenu } = require('discord.js');
  
  const menuConfig = data.commandMenus.mainMenu;
  
  const row = new MessageActionRow()
    .addComponents(
      new MessageSelectMenu()
        .setCustomId('command_menu')
        .setPlaceholder(menuConfig.placeholder)
        .addOptions(menuConfig.options)
    );

  await message.channel.send({
    content: '📋 **請選擇功能模組:**',
    components: [row]
  });
}

// 處理 Select Menu 選擇
async function handleCommandMenuSelect(interaction, data) {
  const value = interaction.values[0];
  
  let response = '';
  switch (value) {
    case 'menu_templates':
      response = `📋 **範本 (Templates)**

\`!template task\` - 任務更新範本
\`!template blocker\` - 阻礙報告範本
\`!template review\` - 程式碼審查請求範本
\`!template standup\` - 每日 Standup 範本
\`!template weekly\` - 週報範本

\`!thread dailyLog\` - 每日工作日誌
\`!thread weeklyLog\` - 每週工作週報
\`!thread projectUpdate\` - 項目更新
\`!thread bugReport\` - Bug 報告`;
      break;
    case 'menu_status':
      response = `📊 **狀態 (Status)**

\`!status\` - 查看所有成員狀態 (Embed 卡片)
\`!status set [任務]\` - 設定當前狀態
\`!status done\` - 標記為完成
\`!status blocker [原因]\` - 標記阻礙

\`!project [名稱]\` - 查看專案狀態 (Embed 卡片)`;
      break;
    case 'menu_pomodoro':
      response = `🍅 **Pomodoro**

\`!pomodoro start [任務]\` - 開始25分鐘衝刺
\`!pomodoro short\` - 5分鐘短休息
\`!pomodoro long\` - 15分鐘長休息
\`!pomodoro status\` - 查看狀態
\`!pomodoro stop\` - 停止`;
      break;
    case 'menu_poll':
      response = `🗳️ **投票 (Poll)**

\`!poll [問題]|[選項1]|[選項2]\` - 創建投票
\`!poll quick yesno\` - 快速投票
\`!poll list\` - 查看進行中投票
\`!poll close [ID]\` - 結束投票`;
      break;
    case 'menu_reminder':
      response = `⏰ **提醒 (Reminder)**

\`!remind [時間] [內容]\` - 設定提醒
\`!reminders\` - 查看所有提醒
\`!remind done [ID]\` - 完成提醒
\`!remind delete [ID]\` - 刪除提醒`;
      break;
    case 'menu_calendar':
      response = `📅 **日曆 (Calendar)**

\`!gcal\` - 查看今日會議
\`!gcal week\` - 查看本週會議
\`!gcal today\` - 今日詳細
\`!gcal tomorrow\` - 明日會議`;
      break;
    case 'menu_help':
      response = `❓ **幫助 (Help)**

使用 \`!help\` 查看所有命令
或直接輸入命令獲取幫助

**斜線指令**: \`/help\` - 獲取幫助`;
      break;
  }

  await interaction.reply({ content: response, ephemeral: true });
}

// ==================== 4. 斜線指令 ====================

// 註冊 Slash Commands
async function registerSlashCommands(client, data) {
  if (!data.slashCommands.enabled) return;

  const commands = data.slashCommands.commands.map(cmd => {
    const command = {
      name: cmd.name,
      description: cmd.description
    };
    
    if (cmd.options) {
      command.options = cmd.options.map(opt => {
        const option = {
          name: opt.name,
          description: opt.description,
          type: opt.type === 'STRING' ? 3 : opt.type === 'INTEGER' ? 4 : opt.type === 'BOOLEAN' ? 5 : 3,
          required: opt.required || false
        };
        
        if (opt.choices) {
          option.choices = opt.choices;
        }
        
        return option;
      });
    }
    
    return command;
  });

  try {
    // 注意: 這需要應用程序命令作用域
    await client.application.commands.set(commands);
    console.log('[Phase9] Slash Commands 已註冊');
  } catch (e) {
    console.error('[Phase9] 註冊 Slash Commands 失敗:', e.message);
  }
}

// 處理 Slash Command
async function handleSlashCommand(interaction, client, data) {
  const { commandName, options } = interaction;
  
  switch (commandName) {
    case 'template': {
      const type = options.getString('type');
      const templates = data.threadTemplates;
      const template = templates[type];
      
      if (template) {
        const today = new Date();
        const formatted = template.format
          .replace(/{date}/g, today.toLocaleDateString('zh-TW'))
          .replace(/{author}/g, interaction.user.displayName);
        await interaction.reply(formatted);
      } else {
        await interaction.reply('❌ 未知的範本類型');
      }
      break;
    }
    
    case 'status': {
      // 調用現有的 status 命令邏輯
      await interaction.reply('✅ 請使用 `!status` 命令');
      break;
    }
    
    case 'pomodoro': {
      const action = options.getString('action');
      const task = options.getString('task');
      
      if (action === 'start') {
        await interaction.reply(`🍅 開始 Pomodoro: ${task || '專注工作中'}`);
      } else if (action === 'status') {
        await interaction.reply('📊 查看 Pomodoro 狀態');
      } else {
        await interaction.reply(`✅ Pomodoro ${action}`);
      }
      break;
    }
    
    case 'poll': {
      const question = options.getString('question');
      const optionsStr = options.getString('options');
      const duration = options.getInteger('duration') || 1;
      
      await interaction.reply(`🗳️ 創建投票: ${question}\n選項: ${optionsStr}`);
      break;
    }
    
    case 'remind': {
      const time = options.getString('time');
      const msg = options.getString('message');
      
      await interaction.reply(`🔔 提醒已設定: ${time} 後 - ${msg}`);
      break;
    }
    
    case 'gcal': {
      const action = options.getString('action') || 'today';
      
      if (action === 'today') {
        await interaction.reply('📅 今日會議');
      } else if (action === 'tomorrow') {
        await interaction.reply('📅 明日會議');
      } else {
        await interaction.reply('📅 本週會議');
      }
      break;
    }
    
    case 'help': {
      await interaction.reply('ℹ️ 使用 `!help` 查看所有命令');
      break;
    }
  }
}

// ==================== 7. Pomodoro 定時詢問 ====================

// Pomodoro Check-in 計時器
let pomodoroCheckInTimer = null;

// 啟動 Pomodoro Check-in
function startPomodoroCheckIn(client, data) {
  if (!data.pomodoroCheckIn.enabled) return;
  
  if (pomodoroCheckInTimer) {
    clearInterval(pomodoroCheckInTimer);
  }
  
  pomodoroCheckInTimer = setInterval(async () => {
    try {
      await checkPomodoroProgress(client, data);
    } catch (e) {
      console.error('[Phase9] Pomodoro Check-in 錯誤:', e.message);
    }
  }, data.pomodoroCheckIn.checkInInterval);
  
  console.log('[Phase9] Pomodoro Check-in 已啟動');
}

// 檢查 Pomodoro 進度並詢問
async function checkPomodoroProgress(client, data) {
  const pomodoroData = data.pomodoroData || { activeSessions: {} };
  const sessions = Object.values(pomodoroData.activeSessions);
  
  if (sessions.length === 0) return;
  
  for (const session of sessions) {
    const elapsed = Date.now() - session.startTime;
    const progress = elapsed / (session.type === 'work' ? data.pomodoro?.config?.workDuration || (25 * 60 * 1000) : 300000);
    
    // 檢查是否觸發 check-in
    const thresholds = data.pomodoroCheckIn.checkInThreshold;
    for (let i = 0; i < thresholds.length; i++) {
      if (progress >= thresholds[i] && (!session.lastCheckIn || session.lastCheckIn < thresholds[i])) {
        const msg = data.pomodoroCheckIn.checkInMessages[i];
        
        try {
          const channel = await client.channels.fetch(session.channelId);
          if (channel) {
            await channel.send(`📢 **Pomodoro 進度** - ${session.userName}\n${msg}\n\n任務: ${session.task}`);
          }
        } catch (e) {
          // 忽略錯誤
        }
        
        session.lastCheckIn = thresholds[i];
      }
    }
  }
}

// ==================== 8. 狀態儀表板 ====================

// 更新儀表板
async function updateDashboard(client, data) {
  if (!data.dashboard.enabled || !data.dashboard.channel) return;
  
  try {
    const channel = await client.channels.fetch(data.dashboard.channel);
    if (!channel) return;
    
    // 構建儀表板內容
    let dashboard = '📊 **團隊工作儀表板**\n';
    dashboard += `*更新時間: ${new Date().toLocaleString('zh-TW')}*\n\n`;
    
    // 成員狀態
    if (data.dashboard.sections.members) {
      const statusDB = loadStatusDB();
      const members = Object.values(statusDB.members || {});
      const working = members.filter(m => m.status === 'working').length;
      const done = members.filter(m => m.status === 'done').length;
      const blocked = members.filter(m => m.status === 'blocked').length;
      
      dashboard += `👥 **成員狀態**\n`;
      dashboard += `   ⏳ 工作中: ${working}\n`;
      dashboard += `   ✅ 已完成: ${done}\n`;
      dashboard += `   🚫 受阻礙: ${blocked}\n\n`;
    }
    
    // Pomodoro 狀態
    if (data.dashboard.sections.pomodoro) {
      const pomodoroData = data.pomodoroData || { activeSessions: {} };
      const sessions = Object.values(pomodoroData.activeSessions);
      
      dashboard += `🍅 **Pomodoro 進行中**: ${sessions.length}\n`;
      for (const s of sessions.slice(0, 3)) {
        dashboard += `   • ${s.userName}: ${s.task}\n`;
      }
      if (sessions.length > 3) {
        dashboard += `   ... 還有 ${sessions.length - 3} 個\n`;
      }
      dashboard += '\n';
    }
    
    // 即將到來的會議
    if (data.dashboard.sections.upcoming) {
      const calData = data.calendarEnhanced;
      if (calData.upcomingEvents && calData.upcomingEvents.length > 0) {
        dashboard += `📅 **即將到來的會議**\n`;
        for (const event of calData.upcomingEvents.slice(0, 3)) {
          dashboard += `   • ${event.summary} (${event.time})\n`;
        }
      }
    }
    
    // 發送或更新訊息
    if (data.dashboard.messageId) {
      try {
        const msg = await channel.messages.fetch(data.dashboard.messageId);
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
    data.dashboard.messageId = sent.id;
    data.dashboard.lastUpdate = Date.now();
    saveData(data);
    
  } catch (e) {
    console.error('[Phase9] 更新儀表板失敗:', e.message);
  }
}

// 啟動儀表板自動更新
let dashboardTimer = null;

function startDashboardAutoRefresh(client, data) {
  if (!data.dashboard.enabled || !data.dashboard.channel) return;
  
  if (dashboardTimer) {
    clearInterval(dashboardTimer);
  }
  
  dashboardTimer = setInterval(async () => {
    try {
      await updateDashboard(client, data);
    } catch (e) {
      console.error('[Phase9] 儀表板自動刷新錯誤:', e.message);
    }
  }, data.dashboard.refreshInterval);
  
  console.log('[Phase9] 儀表板自動刷新已啟動');
}

// ==================== 9. Channel Follow ====================

// 處理 Channel Follow
async function handleChannelFollow(sourceChannel, message, data) {
  if (!data.channelFollow.enabled) return;
  
  const follows = data.channelFollow.follows.filter(f => f.sourceChannel === sourceChannel.id);
  
  for (const follow of follows) {
    try {
      let targetChannel;
      
      if (follow.targetGuild) {
        // 跨伺服器 - 需要先獲取 guild
        const guild = await message.client.guilds.fetch(follow.targetGuild);
        if (guild) {
          targetChannel = await guild.channels.fetch(follow.targetChannel);
        }
      } else {
        targetChannel = await message.client.channels.fetch(follow.targetChannel);
      }
      
      if (targetChannel) {
        // 檢查過濾器
        if (follow.filters && follow.filters.length > 0) {
          const hasFilter = follow.filters.some(f => 
            message.content.toLowerCase().includes(f.toLowerCase())
          );
          if (!hasFilter) continue;
        }
        
        // 轉發訊息
        await targetChannel.send({
          content: `📢 **${message.channel.name}** - ${message.author.displayName}:\n${message.content}`,
          files: message.attachments.map(a => a.url)
        });
      }
    } catch (e) {
      console.error('[Phase9] Channel Follow 錯誤:', e.message);
    }
  }
}

// 添加 Channel Follow
async function addChannelFollow(message, args, data) {
  const sourceChannel = message.mentions.channels.first();
  const targetChannel = message.mentions.channels.last();
  
  if (!sourceChannel || !targetChannel) {
    await message.channel.send('❌ 請提及來源和目標頻道\n用法: !follow add [#來源] [#目標]');
    return;
  }
  
  const filters = args.slice(3); // 額外的過濾詞
  
  data.channelFollow.follows.push({
    sourceChannel: sourceChannel.id,
    targetChannel: targetChannel.id,
    targetGuild: message.guild.id,
    filters: filters
  });
  
  saveData(data);
  await message.channel.send(`✅ 已添加 Channel Follow:\n來源: ${sourceChannel.name}\n目標: ${targetChannel.name}`);
}

// ==================== 10. Cron Job 提醒增強 ====================

// ==================== 10. Cron Job 提醒增強 ====================

// 增強的 Cron 檢查
function checkEnhancedCron(client, data) {
  if (!data.cronEnhanced.enabled) return;
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const minute = now.getMinutes();
  const hour = now.getHours();
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  
  const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  
  // 檢查內置提醒
  for (const reminder of data.cronEnhanced.reminders) {
    if (!reminder.enabled) continue;
    if (!reminder.days.includes(dayName)) continue;
    if (reminder.time !== timeStr) continue;
    
    // 避免重複發送
    const lastSent = reminder.lastSent || '';
    if (lastSent === today + timeStr) continue;
    
    sendCronReminder(client, reminder);
    reminder.lastSent = today + timeStr;
    saveData(data);
  }
  
  // 檢查自定義提醒
  for (const reminder of data.cronEnhanced.customReminders) {
    if (!reminder.enabled) continue;
    if (reminder.time !== timeStr) continue;
    
    // 處理 days 字段
    if (reminder.days && !reminder.days.includes(dayName)) continue;
    
    sendCronReminder(client, reminder);
    reminder.lastSent = Date.now();
    saveData(data);
  }
}

// 發送 Cron 提醒
async function sendCronReminder(client, reminder) {
  if (!reminder.channel) return;
  
  try {
    const channel = await client.channels.fetch(reminder.channel);
    if (channel) {
      await channel.send(reminder.message);
      console.log(`[Phase9] 已發送提醒: ${reminder.name}`);
    }
  } catch (e) {
    console.error(`[Phase9] 發送提醒失敗:`, e.message);
  }
}

// 添加自定義提醒
async function addCustomReminder(message, args, data) {
  const time = args[1];
  const reminderMessage = args.slice(2).join(' ');
  
  if (!time || !reminderMessage) {
    await message.channel.send('❌ 用法: !cron add [HH:MM] [訊息]');
    return;
  }
  
  // 解析時間
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    await message.channel.send('❌ 時間格式錯誤，請使用 HH:MM 格式');
    return;
  }
  
  const reminder = {
    id: `custom_${Date.now()}`,
    name: reminderMessage.substring(0, 30),
    time: time,
    message: reminderMessage,
    channel: message.channel.id,
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], // 默認工作日
    enabled: true,
    createdAt: Date.now()
  };
  
  data.cronEnhanced.customReminders.push(reminder);
  saveData(data);
  
  await message.channel.send(`✅ 已添加提醒: "${reminder.name}"\n時間: ${time}\n頻道: ${message.channel.name}`);
}

// 處理 Phase 9 命令
async function handlePhase9Command(message, args, data) {
  const subCommand = args[0]?.toLowerCase();
  
  if (!subCommand || subCommand === 'help') {
    await message.channel.send(`🔟 **Phase 9: 10項新功能**

**Thread 範本**:
\`!thread [類型]\` - 獲取工作日誌範本
\`!thread list\` - 查看所有範本

**Forum Channel**:
\`!forum list\` - 查看所有項目論壇
\`!forum create [項目]\` - 創建項目論壇

**指令分類**:
\`!menu\` - 顯示命令選單

**提醒管理**:
\`!cron add [HH:MM] [訊息]\` - 添加自定義提醒
\`!cron list\` - 查看所有提醒
\`!cron delete [ID]\` - 刪除提醒

**儀表板**:
\`!dashboard set [#channel]\` - 設定儀表板頻道

**Channel Follow**:
\`!follow add [#來源] [#目標] [過濾詞]\` - 添加追蹤
\`!follow list\` - 查看追蹤列表`);
    return;
  }
  
  // !thread 命令
  if (subCommand === 'thread') {
    await handleThreadTemplateCommand(message, args.slice(1), data);
    return;
  }
  
  // !forum 命令
  if (subCommand === 'forum') {
    await handleForumCommand(message, args.slice(1), data);
    return;
  }
  
  // !menu 命令
  if (subCommand === 'menu') {
    await sendCommandMenu(message, data);
    return;
  }
  
  // !cron add 命令
  if (subCommand === 'cron') {
    const cronAction = args[1]?.toLowerCase();
    
    if (cronAction === 'add') {
      await addCustomReminder(message, args, data);
      return;
    }
    
    if (cronAction === 'list') {
      const reminders = data.cronEnhanced.customReminders;
      if (reminders.length === 0) {
        await message.channel.send('📋 暂无自定義提醒');
        return;
      }
      
      let list = '📋 **自定義提醒**\n\n';
      for (const r of reminders) {
        list += `• \`${r.time}\` - ${r.name}\n`;
        list += `  ID: ${r.id}\n\n`;
      }
      await message.channel.send(list);
      return;
    }
    
    if (cronAction === 'delete') {
      const id = args[2];
      const index = data.cronEnhanced.customReminders.findIndex(r => r.id === id);
      
      if (index >= 0) {
        const removed = data.cronEnhanced.customReminders.splice(index, 1)[0];
        saveData(data);
        await message.channel.send(`✅ 已刪除提醒: ${removed.name}`);
      } else {
        await message.channel.send('❌ 找不到該提醒');
      }
      return;
    }
    
    // 使用現有的 cron 命令邏輯
    return;
  }
  
  // !dashboard set 命令
  if (subCommand === 'dashboard') {
    const dashAction = args[1]?.toLowerCase();
    
    if (dashAction === 'set') {
      const channel = message.mentions.channels.first();
      if (!channel) {
        await message.channel.send('❌ 請提及頻道\n用法: !dashboard set [#channel]');
        return;
      }
      
      data.dashboard.channel = channel.id;
      saveData(data);
      
      await message.channel.send(`✅ 儀表板已設定為 ${channel.name}`);
      await updateDashboard(message.client, data);
      return;
    }
    
    // 查看儀表板
    if (data.dashboard.channel) {
      await updateDashboard(message.client, data);
      await message.channel.send(`📊 儀表板已更新`);
    } else {
      await message.channel.send('❌ 請先設定儀表板頻道\n用法: !dashboard set [#channel]');
    }
    return;
  }
  
  // !follow 命令
  if (subCommand === 'follow') {
    const followAction = args[1]?.toLowerCase();
    
    if (followAction === 'add') {
      await addChannelFollow(message, args, data);
      return;
    }
    
    if (followAction === 'list') {
      const follows = data.channelFollow.follows;
      if (follows.length === 0) {
        await message.channel.send('📋 暂无 Channel Follow');
        return;
      }
      
      let list = '📋 **Channel Follow 列表**\n\n';
      for (const f of follows) {
        list += `• 來源: ${f.sourceChannel} → 目標: ${f.targetChannel}\n`;
        if (f.filters && f.filters.length > 0) {
          list += `  過濾: ${f.filters.join(', ')}\n`;
        }
        list += '\n';
      }
      await message.channel.send(list);
      return;
    }
    
    if (followAction === 'remove') {
      const index = parseInt(args[2]) - 1;
      if (isNaN(index) || index < 0 || index >= data.channelFollow.follows.length) {
        await message.channel.send('❌ 請提供有效的序號\n使用 !follow list 查看');
        return;
      }
      
      data.channelFollow.follows.splice(index, 1);
      saveData(data);
      await message.channel.send('✅ 已刪除 Channel Follow');
      return;
    }
    
    await message.channel.send(`📋 **Channel Follow 命令**:

\`!follow add [#來源] [#目標] [過濾詞]\` - 添加追蹤
\`!follow list\` - 查看追蹤列表
\`!follow remove [序號]\` - 刪除追蹤`);
    return;
  }
}

// ==================== 導出模組 ====================

module.exports = {
  initPhase9Data,
  loadData,
  saveData,
  handlePhase9Command,
  handleThreadTemplateCommand,
  handleForumCommand,
  sendCommandMenu,
  handleCommandMenuSelect,
  registerSlashCommands,
  handleSlashCommand,
  startPomodoroCheckIn,
  checkPomodoroProgress,
  updateDashboard,
  startDashboardAutoRefresh,
  handleChannelFollow,
  checkEnhancedCron,
  addCustomReminder
};