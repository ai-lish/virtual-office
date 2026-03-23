/**
 * Pomodoro Timer Module
 * 每日任務衝刺計時器
 * 
 * 命令:
 * !pomodoro start [任務] - 開始25分鐘衝刺
 * !pomodoro short - 開始5分鐘短休息
 * !pomodoro long - 開始15分鐘長休息
 * !pomodoro status - 查看當前狀態
 * !pomodoro list - 查看進行中的衝刺
 * !pomodoro stop - 停止當前衝刺
 * !pomodoro stats - 查看統計
 */

const fs = require('fs');
const path = require('path');

const POMODORO_DATA_PATH = path.join(__dirname, 'pomodoro-data.json');

// 默認配置
function getDefaultConfig() {
  return {
    workDuration: 25 * 60 * 1000,      // 25分鐘工作
    shortBreak: 5 * 60 * 1000,         // 5分鐘短休息
    longBreak: 15 * 60 * 1000,         // 15分鐘長休息
    sessionsBeforeLong: 4,              // 4個工作週期後長休息
    autoStartBreak: false,              // 自動開始休息
    soundNotification: true,            // 聲音提醒
    channel: null                       // 通知頻道
  };
}

// 加載數據
function loadData() {
  try {
    if (fs.existsSync(POMODORO_DATA_PATH)) {
      return JSON.parse(fs.readFileSync(POMODORO_DATA_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('[Pomodoro] 載入數據失敗:', e.message);
  }
  return {
    config: getDefaultConfig(),
    activeSessions: {},
    history: [],
    stats: {}
  };
}

// 保存數據
function saveData(data) {
  try {
    fs.writeFileSync(POMODORO_DATA_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[Pomodoro] 保存數據失敗:', e.message);
  }
}

// 格式化時間
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 處理 Pomodoro 命令
async function handlePomodoroCommand(message, args, data) {
  const subCommand = args[0]?.toLowerCase();
  const userId = message.author.id;
  const userName = message.author.displayName;

  // !pomodoro - 顯示幫助
  if (!subCommand || subCommand === 'help') {
    const helpText = `🍅 **Pomodoro 衝刺計時器**

**開始衝刺**:
\`!pomodoro start [任務]\` - 開始25分鐘專注工作
\`!pomodoro short\` - 5分鐘短休息
\`!pomodoro long\` - 15分鐘長休息

**狀態查詢**:
\`!pomodoro status\` - 查看當前狀態
\`!pomodoro list\` - 查看所有進行中的衝刺
\`!pomodoro stats\` - 查看統計

**控制**:
\`!pomodoro stop\` - 停止當前衝刺
\`!pomodoro pause\` - 暫停
\`!pomodoro resume\` - 繼續

**配置**:
\`!pomodoro config\` - 查看配置
\`!pomodoro config work [分鐘]\` - 設定工作時間
\`!pomodoro config break [分鐘]\` - 設定休息時間

---
🍅 工作25分鐘 → 休息5分鐘 → 重複4次 → 長休息15分鐘`;
    await message.channel.send(helpText);
    return;
  }

  // !pomodoro start [任務]
  if (subCommand === 'start' || subCommand === 'work') {
    const task = args.slice(1).join(' ') || '專注工作中';
    
    // 檢查是否已有進行中的衝刺
    if (data.activeSessions[userId]) {
      const existing = data.activeSessions[userId];
      await message.channel.send(`⚠️ 你已有進行中的衝刺: ${existing.task}\n使用 \`!pomodoro stop\` 停止後再開始`);
      return;
    }

    // 創建新衝刺
    const session = {
      id: `session_${Date.now()}`,
      userId,
      userName,
      task,
      type: 'work',
      startTime: Date.now(),
      endTime: Date.now() + data.config.workDuration,
      paused: false,
      remaining: data.config.workDuration
    };

    data.activeSessions[userId] = session;
    saveData(data);

    // 初始化計時器
    startPomodoroTimer(message.client, data);

    const embed = {
      color: 0xFF6B6B,
      title: '🍅 Pomodoro 衝刺開始！',
      description: `**任務**: ${task}`,
      fields: [
        { name: '⏱️ 剩餘時間', value: formatTime(data.config.workDuration), inline: true },
        { name: '🎯 專注時段', value: '25分鐘', inline: true },
        { name: '💡 提示', value: '專注完成後可獲得積分！', inline: false }
      ],
      footer: { text: `由 ${userName} 發起` },
      timestamp: new Date().toISOString()
    };

    await message.channel.send({ embeds: [embed] });
    return;
  }

  // !pomodoro short - 短休息
  if (subCommand === 'short' || subCommand === 'break') {
    if (data.activeSessions[userId]) {
      await message.channel.send(`⚠️ 請先完成或停止當前衝刺`);
      return;
    }

    const session = {
      id: `session_${Date.now()}`,
      userId,
      userName,
      task: '☕ 短休息',
      type: 'shortBreak',
      startTime: Date.now(),
      endTime: Date.now() + data.config.shortBreak,
      paused: false,
      remaining: data.config.shortBreak
    };

    data.activeSessions[userId] = session;
    saveData(data);

    startPomodoroTimer(message.client, data);

    await message.channel.send(`☕ **短休息開始！**\n\n⏱️ 休息時間: ${data.config.shortBreak / 60000} 分鐘\n💆 放鬆一下~`);
    return;
  }

  // !pomodoro long - 長休息
  if (subCommand === 'long' || subCommand === 'rest') {
    if (data.activeSessions[userId]) {
      await message.channel.send(`⚠️ 請先完成或停止當前衝刺`);
      return;
    }

    const session = {
      id: `session_${Date.now()}`,
      userId,
      userName,
      task: '🛋️ 長休息',
      type: 'longBreak',
      startTime: Date.now(),
      endTime: Date.now() + data.config.longBreak,
      paused: false,
      remaining: data.config.longBreak
    };

    data.activeSessions[userId] = session;
    saveData(data);

    startPomodoroTimer(message.client, data);

    await message.channel.send(`🛋️ **長休息開始！**\n\n⏱️ 休息時間: ${data.config.longBreak / 60000} 分鐘\n💆 好好休息~`);
    return;
  }

  // !pomodoro status
  if (subCommand === 'status' || subCommand === 'now') {
    const session = data.activeSessions[userId];
    
    if (!session) {
      await message.channel.send(`🍅 你目前沒有進行中的衝刺\n使用 \`!pomodoro start [任務]\` 開始`);
      return;
    }

    const remaining = session.endTime - Date.now();
    const progress = 1 - (remaining / (session.type === 'work' ? data.config.workDuration : session.type === 'shortBreak' ? data.config.shortBreak : data.config.longBreak));
    
    const bar = '█'.repeat(Math.floor(progress * 10)) + '░'.repeat(10 - Math.floor(progress * 10));
    
    const typeEmoji = session.type === 'work' ? '🍅' : session.type === 'shortBreak' ? '☕' : '🛋️';
    const typeName = session.type === 'work' ? '工作' : session.type === 'shortBreak' ? '短休息' : '長休息';

    await message.channel.send(`${typeEmoji} **${userName} 的 Pomodoro**

**任務**: ${session.task}
**類型**: ${typeName}
**剩餘**: ${formatTime(Math.max(0, remaining))}
**進度**: ${bar} ${Math.floor(progress * 100)}%`);
    return;
  }

  // !pomodoro list
  if (subCommand === 'list' || subCommand === 'ls') {
    const sessions = Object.values(data.activeSessions);
    
    if (sessions.length === 0) {
      await message.channel.send('🍅 目前沒有進行中的衝刺');
      return;
    }

    let list = '🍅 **進行中的 Pomodoro**\n\n';
    for (const s of sessions) {
      const remaining = s.endTime - Date.now();
      list += `🍅 <@${s.userId}> - ${s.task}\n`;
      list += `   剩餘: ${formatTime(Math.max(0, remaining))}\n\n`;
    }

    await message.channel.send(list);
    return;
  }

  // !pomodoro stop
  if (subCommand === 'stop' || subCommand === 'cancel') {
    const session = data.activeSessions[userId];
    
    if (!session) {
      await message.channel.send('❌ 你沒有進行中的衝刺');
      return;
    }

    // 記錄到歷史
    data.history.push({
      ...session,
      stoppedAt: Date.now(),
      completed: false
    });

    delete data.activeSessions[userId];
    saveData(data);

    await message.channel.send(`✅ 已停止 Pomodoro: ${session.task}`);
    return;
  }

  // !pomodoro pause
  if (subCommand === 'pause') {
    const session = data.activeSessions[userId];
    
    if (!session) {
      await message.channel.send('❌ 你沒有進行中的衝刺');
      return;
    }

    if (session.paused) {
      await message.channel.send('⚠️ 已經暫停了');
      return;
    }

    session.paused = true;
    session.remaining = session.endTime - Date.now();
    session.endTime = null;
    saveData(data);

    await message.channel.send('⏸️ Pomodoro 已暫停\n使用 `!pomodoro resume` 繼續');
    return;
  }

  // !pomodoro resume
  if (subCommand === 'resume' || subCommand === 'continue') {
    const session = data.activeSessions[userId];
    
    if (!session) {
      await message.channel.send('❌ 你沒有進行中的衝刺');
      return;
    }

    if (!session.paused) {
      await message.channel.send('⚠️ 沒有暫停的衝刺');
      return;
    }

    session.paused = false;
    session.endTime = Date.now() + session.remaining;
    saveData(data);

    await message.channel.send(`▶️ Pomodoro 已繼續\n剩餘時間: ${formatTime(session.remaining)}`);
    return;
  }

  // !pomodoro stats
  if (subCommand === 'stats' || subCommand === 'statistics') {
    const userHistory = data.history.filter(h => h.userId === userId);
    const completedSessions = userHistory.filter(h => h.completed);
    const totalMinutes = completedSessions.reduce((sum, h) => {
      const duration = h.type === 'work' ? data.config.workDuration : h.type === 'shortBreak' ? data.config.shortBreak : data.config.longBreak;
      return sum + Math.floor(duration / 60000);
    }, 0);

    // 今日統計
    const today = new Date().toDateString();
    const todaySessions = completedSessions.filter(h => new Date(h.completedAt).toDateString() === today);
    const todayMinutes = todaySessions.reduce((sum, h) => {
      const duration = h.type === 'work' ? data.config.workDuration : h.type === 'shortBreak' ? data.config.shortBreak : data.config.longBreak;
      return sum + Math.floor(duration / 60000);
    }, 0);

    const embed = {
      color: 0xFF6B6B,
      title: '🍅 Pomodoro 統計',
      fields: [
        { name: '📅 今日', value: `${todaySessions.length} 個衝刺 (${todayMinutes} 分鐘)`, inline: true },
        { name: '📊 總計', value: `${completedSessions.length} 個衝刺 (${totalMinutes} 分鐘)`, inline: true },
        { name: '⏱️ 平均', value: totalMinutes > 0 ? `${Math.round(totalMinutes / completedSessions.length)} 分鐘/衝刺` : '0 分鐘', inline: true }
      ]
    };

    await message.channel.send({ embeds: [embed] });
    return;
  }

  // !pomodoro config
  if (subCommand === 'config' || subCommand === 'settings') {
    const configAction = args[1]?.toLowerCase();
    const configValue = parseInt(args[2]);

    if (!configAction) {
      const c = data.config;
      await message.channel.send(`⚙️ **Pomodoro 配置**

• 工作時間: ${c.workDuration / 60000} 分鐘
• 短休息: ${c.shortBreak / 60000} 分鐘
• 長休息: ${c.longBreak / 60000} 分鐘
• 長休息間隔: ${c.sessionsBeforeLong} 個工作週期
• 自動開始休息: ${c.autoStartBreak ? '✅' : '❌'}`);
      return;
    }

    if (configAction === 'work' && configValue) {
      data.config.workDuration = configValue * 60 * 1000;
      saveData(data);
      await message.channel.send(`✅ 工作時間已設定為 ${configValue} 分鐘`);
      return;
    }

    if (configAction === 'break' && configValue) {
      data.config.shortBreak = configValue * 60 * 1000;
      saveData(data);
      await message.channel.send(`✅ 短休息已設定為 ${configValue} 分鐘`);
      return;
    }

    await message.channel.send(`⚙️ **配置命令**:
\`!pomodoro config\` - 查看配置
\`!pomodoro config work [分鐘]\` - 設定工作時間
\`!pomodoro config break [分鐘]\` - 設定短休息時間`);
    return;
  }
}

// Pomodoro 計時器
let pomodoroInterval = null;

function startPomodoroTimer(client, data) {
  if (pomodoroInterval) return;

  pomodoroInterval = setInterval(async () => {
    const now = Date.now();
    const toDelete = [];

    for (const [userId, session] of Object.entries(data.activeSessions)) {
      if (session.paused) continue;

      const remaining = session.endTime - now;

      if (remaining <= 0) {
        // 衝刺完成
        toDelete.push(userId);

        // 記錄到歷史
        data.history.push({
          ...session,
          completedAt: now,
          completed: true
        });

        // 發送完成通知
        try {
          const user = await client.users.fetch(userId);
          if (user) {
            if (session.type === 'work') {
              // 工作完成 - 獎勵積分 (如果 Phase 6 可用)
              await user.send(`🎉 **Pomodoro 完成！**\n\n任務: ${session.task}\n\n好犀利！繼續保持~ 🍅`);
              
              // 這裡可以調用 Phase 6 的積分系統
              // phase6.addPoints(userId, 10);
            } else {
              await user.send(`☕ **休息結束！**\n\n準備好繼續工作了嗎？`);
            }
          }
        } catch (e) {
          console.log('[Pomodoro] 發送通知失敗:', e.message);
        }
      }
    }

    // 清理完成的會話
    for (const userId of toDelete) {
      delete data.activeSessions[userId];
    }

    if (toDelete.length > 0) {
      saveData(data);
    }

    // 沒有會話時停止計時器
    if (Object.keys(data.activeSessions).length === 0 && pomodoroInterval) {
      clearInterval(pomodoroInterval);
      pomodoroInterval = null;
    }
  }, 1000);
}

// 導出模組
module.exports = {
  handlePomodoroCommand,
  loadData,
  saveData
};
