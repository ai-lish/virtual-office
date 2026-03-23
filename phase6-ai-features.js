/**
 * Phase 6: 更多 AI 功能
 * 
 * 功能：
 * 1. 實時協作白板 - 團隊成員可即時繪圖/寫字
 * 2. 遊戲化系統 - 完成任務賺積分/徽章
 * 3. 團隊心情指數 - 每日問候，追蹤團隊情緒
 * 4. 智能提醒系統 - 根據緊急程度自動提醒
 * 5. 自訂義數據儀表板 - 自由拖拽放置組件
 */

const fs = require('fs');
const path = require('path');

const PHASE6_DATA_PATH = path.join(__dirname, 'phase6-data.json');

// 加载/保存数据
function loadPhase6Data() {
  try {
    return JSON.parse(fs.readFileSync(PHASE6_DATA_PATH, 'utf8'));
  } catch (e) {
    return getDefaultData();
  }
}

function savePhase6Data(data) {
  fs.writeFileSync(PHASE6_DATA_PATH, JSON.stringify(data, null, 2));
}

function getDefaultData() {
  return {
    whiteboard: {
      pages: {
        main: {
          id: 'main',
          name: '主白板',
          content: [],
          lastUpdated: null,
          updatedBy: null
        }
      }
    },
    gamification: {
      users: {},
      badges: [
        { id: 'first_task', name: '初試身手', description: '完成第一個任務', icon: '🌟', points: 10 },
        { id: 'quick_winner', name: '閃電俠', description: '24小時內完成任務', icon: '⚡', points: 20 },
        { id: 'team_player', name: '團隊精神', description: '協助隊友完成任務', icon: '🤝', points: 15 },
        { id: 'mood_master', name: '心情大使', description: '連續7天匯報心情', icon: '😊', points: 50 },
        { id: 'early_bird', name: '早起鳥兒', description: '早上8點前完成任務', icon: '🐦', points: 15 },
        { id: 'night_owl', name: '夜貓子的', description: '晚上11點後完成任務', icon: '🦉', points: 15 },
        { id: 'streak_3', name: '持續的力量', description: '連續3天完成任務', icon: '🔥', points: 30 },
        { id: 'streak_7', name: '一週冠軍', description: '連續7天完成任務', icon: '🏆', points: 100 },
        { id: 'point_100', name: '百分達人', description: '累積100積分', icon: '💯', points: 25 },
        { id: 'point_500', name: '五百強', description: '累積500積分', icon: '🥇', points: 100 },
        { id: 'reminder_hero', name: '提醒英雄', description: '設置10個提醒', icon: '⏰', points: 20 }
      ]
    },
    mood: {
      entries: {},
      moods: [
        { emoji: '😄', label: '超開心', value: 5 },
        { emoji: '🙂', label: '幾開心', value: 4 },
        { emoji: '😐', label: '一般', value: 3 },
        { emoji: '😕', label: '幾攰', value: 2 },
        { emoji: '😫', label: '幾辛苦', value: 1 }
      ]
    },
    reminders: {
      items: []
    },
    dashboard: {
      widgets: [
        { id: 'tasks', type: 'tasks', title: '📋 待辦任務', position: 0, visible: true },
        { id: 'points', type: 'points', title: '🏆 積分排行', position: 1, visible: true },
        { id: 'mood', type: 'mood', title: '😊 團隊心情', position: 2, visible: true },
        { id: 'activity', type: 'activity', title: '📊 近期活動', position: 3, visible: true }
      ],
      layout: 'default'
    }
  };
}

// ==================== 白板功能 ====================

function getWhiteboardHelp() {
  return `**🎨 白板命令**:
\`!board\` - 查看白板內容
\`!board add [內容]\` - 添加內容到白板
\`!board clear\` - 清除白板
\`!board pages\` - 查看所有頁面
\`!board page [名稱]\` - 切換頁面
\`!board new [名稱]\` - 創建新頁面`;
}

async function handleWhiteboardCommand(message, args, data) {
  const subCommand = args[0] || 'view';
  const userId = message.author.id;
  const username = message.author.username;

  switch (subCommand) {
    case 'view':
    case '':
      return await showWhiteboard(message, data);

    case 'add':
    case 'write':
    case 'draw':
      const content = args.slice(1).join(' ');
      if (!content) {
        await message.channel.send('用法: !board add [內容]\n例如: !board add 今日頭腦風暴：AI 教學');
        return;
      }
      return await addToWhiteboard(message, data, content, username);

    case 'clear':
      return await clearWhiteboard(message, data);

    case 'pages':
      return await showWhiteboardPages(message, data);

    case 'page':
      const pageName = args[1];
      if (!pageName) {
        await message.channel.send('用法: !board page [頁面名稱]');
        return;
      }
      return await switchWhiteboardPage(message, data, pageName);

    case 'new':
      const newPageName = args[1];
      if (!newPageName) {
        await message.channel.send('用法: !board new [頁面名稱]');
        return;
      }
      return await createWhiteboardPage(message, data, newPageName);

    default:
      await message.channel.send(getWhiteboardHelp());
  }
}

async function showWhiteboard(message, data) {
  const page = data.whiteboard.pages.main;
  if (!page.content || page.content.length === 0) {
    await message.channel.send('📋 **白板是空的**\n使用 `!board add [內容]` 添加內容');
    return;
  }

  const content = page.content.map((item, i) => 
    `${i + 1}. ${item.text} (${item.author}, ${item.timestamp})`
  ).join('\n');

  await message.channel.send(`📋 **白板 - ${page.name}**\n\n${content}\n\n_最後更新: ${page.lastUpdated || '無'}_`);
}

async function addToWhiteboard(message, data, content, username) {
  const entry = {
    text: content,
    author: username,
    timestamp: new Date().toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong' })
  };

  data.whiteboard.pages.main.content.push(entry);
  data.whiteboard.pages.main.lastUpdated = entry.timestamp;
  data.whiteboard.pages.main.updatedBy = username;

  savePhase6Data(data);
  await message.channel.send(`✅ 已添加到白板: "${content}"`);
}

async function clearWhiteboard(message, data) {
  data.whiteboard.pages.main.content = [];
  data.whiteboard.pages.main.lastUpdated = null;
  data.whiteboard.pages.main.updatedBy = null;

  savePhase6Data(data);
  await message.channel.send('🗑️ 白板已清除');
}

async function showWhiteboardPages(message, data) {
  const pages = Object.values(data.whiteboard.pages);
  const pageList = pages.map(p => 
    `• ${p.name} (${p.content.length} 條內容)`
  ).join('\n');

  await message.channel.send(`📑 **白板頁面**\n\n${pageList}\n\n使用 !board page [名稱] 切換頁面`);
}

async function switchWhiteboardPage(message, data, pageName) {
  const page = data.whiteboard.pages[pageName];
  if (!page) {
    await message.channel.send(`❌ 頁面 "${pageName}" 不存在\n使用 !board new [名稱] 創建新頁面`);
    return;
  }

  if (!page.content || page.content.length === 0) {
    await message.channel.send(`📋 **白板 - ${page.name}** (空的)\n使用 !board add [內容] 添加`);
    return;
  }

  const content = page.content.map((item, i) =>
    `${i + 1}. ${item.text} (${item.author})`
  ).join('\n');

  await message.channel.send(`📋 **白板 - ${page.name}**\n\n${content}`);
}

async function createWhiteboardPage(message, data, pageName) {
  if (data.whiteboard.pages[pageName]) {
    await message.channel.send(`❌ 頁面 "${pageName}" 已存在`);
    return;
  }

  data.whiteboard.pages[pageName] = {
    id: pageName,
    name: pageName,
    content: [],
    lastUpdated: null,
    updatedBy: null
  };

  savePhase6Data(data);
  await message.channel.send(`✅ 已創建白板頁面: "${pageName}"\n使用 !board page ${pageName} 切換`);
}

// ==================== 遊戲化系統 ====================

function getGamificationHelp() {
  return `**🏆 遊戲化系統**:
\`!points\` - 查看自己既積分
\`!points @[人]\` - 查看其他人既積分
\`!badges\` - 查看所有徽章
\`!badges @[人]\` - 查看某人既徽章
\`!leaderboard\` - 積分排行榜
\`!task complete [任務]\` - 完成任務賺積分`;
}

async function handleGamificationCommand(message, args, data, command) {
  const userId = message.author.id;
  const username = message.author.username;

  // !points
  if (command === 'points') {
    const targetUser = message.mentions.users.first();
    if (targetUser) {
      return await showUserPoints(message, data, targetUser);
    }
    return await showUserPoints(message, data, message.author);
  }

  // !badges
  if (command === 'badges') {
    const targetUser = message.mentions.users.first();
    if (targetUser) {
      return await showUserBadges(message, data, targetUser);
    }
    return await showAllBadges(message, data);
  }

  // !leaderboard
  if (command === 'leaderboard' || command === 'ranks') {
    return await showLeaderboard(message, data);
  }

  // !task complete
  if (command === 'task') {
    const subCmd = args[0];
    if (subCmd === 'complete' || subCmd === 'done') {
      const task = args.slice(1).join(' ');
      if (!task) {
        await message.channel.send('用法: !task complete [任務名稱]\n例如: !task complete 撰寫教學文章');
        return;
      }
      return await completeTask(message, data, task, username);
    }
  }
}

async function showUserPoints(message, data, user) {
  const userId = user.id;
  const username = user.username;

  if (!data.gamification.users[userId]) {
    data.gamification.users[userId] = {
      points: 0,
      badges: [],
      tasks: [],
      streak: 0,
      lastTaskDate: null
    };
  }

  const userData = data.gamification.users[userId];
  await message.channel.send(`🏆 **${username}** 既積分: **${userData.points}** 分\n\n已完成 ${userData.tasks.length} 個任務\n連續 ${userData.streak} 天`);
}

async function showAllBadges(message, data) {
  const badges = data.gamification.badges;
  const badgeList = badges.map(b => 
    `${b.icon} **${b.name}** - ${b.description} (+${b.points}分)`
  ).join('\n');

  await message.channel.send(`🎖️ **所有徽章**\n\n${badgeList}`);
}

async function showUserBadges(message, data, user) {
  const userId = user.id;
  const username = user.username;

  if (!data.gamification.users[userId]) {
    data.gamification.users[userId] = {
      points: 0,
      badges: [],
      tasks: [],
      streak: 0,
      lastTaskDate: null
    };
  }

  const userData = data.gamification.users[userId];
  const allBadges = data.gamification.badges;

  if (userData.badges.length === 0) {
    await message.channel.send(`🎖️ **${username}** 暫時未有徽章\n完成任務賺積分攞徽章！`);
    return;
  }

  const userBadges = userData.badges.map(badgeId => {
    const badge = allBadges.find(b => b.id === badgeId);
    return badge ? `${badge.icon} ${badge.name}` : badgeId;
  }).join(' ');

  await message.channel.send(`🎖️ **${username}** 既徽章\n\n${userBadges}\n\n共 ${userData.badges.length} 個徽章`);
}

async function showLeaderboard(message, data) {
  const users = Object.entries(data.gamification.users)
    .sort((a, b) => b[1].points - a[1].points)
    .slice(0, 10);

  if (users.length === 0) {
    await message.channel.send('🏆 **排行榜**\n\n暫時未有數據，等齊隊友一齊來！');
    return;
  }

  const leaderboard = users.map(([userId, userData], index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
    return `${medal} #${index + 1} <@${userId}> - ${userData.points} 分`;
  }).join('\n');

  await message.channel.send(`🏆 **積分排行榜**\n\n${leaderboard}`);
}

async function completeTask(message, data, task, username) {
  const userId = message.author.id;

  if (!data.gamification.users[userId]) {
    data.gamification.users[userId] = {
      points: 0,
      badges: [],
      tasks: [],
      streak: 0,
      lastTaskDate: null
    };
  }

  const userData = data.gamification.users[userId];
  const today = new Date().toDateString();

  // Add task
  const taskEntry = {
    task: task,
    completedAt: new Date().toISOString(),
    points: 10
  };
  userData.tasks.push(taskEntry);
  userData.points += 10;

  // Check streak
  if (userData.lastTaskDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (userData.lastTaskDate === yesterday.toDateString()) {
      userData.streak++;
    } else {
      userData.streak = 1;
    }
    userData.lastTaskDate = today;
  }

  // Check badges
  const earnedBadges = [];
  
  // First task badge
  if (userData.tasks.length === 1 && !userData.badges.includes('first_task')) {
    userData.badges.push('first_task');
    userData.points += 10;
    earnedBadges.push('first_task');
  }

  // Streak badges
  if (userData.streak >= 3 && !userData.badges.includes('streak_3')) {
    userData.badges.push('streak_3');
    userData.points += 30;
    earnedBadges.push('streak_3');
  }

  if (userData.streak >= 7 && !userData.badges.includes('streak_7')) {
    userData.badges.push('streak_7');
    userData.points += 100;
    earnedBadges.push('streak_7');
  }

  // Point badges
  if (userData.points >= 100 && !userData.badges.includes('point_100')) {
    userData.badges.push('point_100');
    userData.points += 25;
    earnedBadges.push('point_100');
  }

  if (userData.points >= 500 && !userData.badges.includes('point_500')) {
    userData.badges.push('point_500');
    userData.points += 100;
    earnedBadges.push('point_500');
  }

  savePhase6Data(data);

  // Build response
  let response = `✅ **任務完成！** "${task}"\n\n+10 積分 | 總積分: ${userData.points}`;

  if (earnedBadges.length > 0) {
    const badgeNames = earnedBadges.map(id => {
      const badge = data.gamification.badges.find(b => b.id === id);
      return badge ? `${badge.icon} ${badge.name}` : id;
    }).join(', ');
    response += `\n\n🎉 **解鎖新徽章！** ${badgeNames}`;
  }

  await message.channel.send(response);
}

// ==================== 團隊心情指數 ====================

function getMoodHelp() {
  return `**😊 團隊心情**:
\`!mood\` - 查看今日心情
\`!mood [數字1-5]\` - 匯報今日心情 (1=幾辛苦, 5=超開心)
\`!mood 1-5 [備註]\` - 匯報心情並備註
\`!mood stats\` - 查看團隊心情統計
\`!mood chart\` - 查看心情趨勢圖`;
}

async function handleMoodCommand(message, args, data) {
  const subCommand = args[0];
  const userId = message.author.id;
  const username = message.author.username;
  const today = new Date().toDateString();

  // Just show mood help or today's mood
  if (!subCommand || subCommand === 'today' || subCommand === 'view') {
    return await showTodayMood(message, data);
  }

  // Set mood: !mood [1-5] [optional note]
  if (/^[1-5]$/.test(subCommand)) {
    const moodValue = parseInt(subCommand);
    const note = args.slice(1).join(' ') || null;
    return await setMood(message, data, userId, username, moodValue, note);
  }

  // Stats
  if (subCommand === 'stats' || subCommand === 'statistics') {
    return await showMoodStats(message, data);
  }

  // Chart
  if (subCommand === 'chart' || subCommand === 'trend') {
    return await showMoodChart(message, data);
  }

  await message.channel.send(getMoodHelp());
}

async function showTodayMood(message, data) {
  const today = new Date().toDateString();
  const todayEntries = data.mood.entries[today] || {};

  const entries = Object.entries(todayEntries);
  if (entries.length === 0) {
    const moods = data.mood.moods.map(m => `${m.emoji} ${m.label}`).join(' | ');
    await message.channel.send(`😊 **今日心情**\n\n暫時未有隊友匯報\n\n匯報心情: \`!mood [1-5]\`\n${moods}`);
    return;
  }

  const avgMood = entries.reduce((sum, [, entry]) => sum + entry.mood, 0) / entries.length;
  const avgMoodInfo = data.mood.moods.find(m => m.value === Math.round(avgMood)) || data.mood.moods[2];

  const entryList = entries.map(([userId, entry]) => {
    const moodInfo = data.mood.moods.find(m => m.value === entry.mood) || data.mood.moods[2];
    return `${moodInfo.emoji} <@${userId}>: ${moodInfo.label}${entry.note ? ` (${entry.note})` : ''}`;
  }).join('\n');

  await message.channel.send(`😊 **今日心情** ${avgMoodInfo.emoji} (平均: ${avgMood.toFixed(1)})\n\n${entryList}`);
}

async function setMood(message, data, userId, username, moodValue, note) {
  const today = new Date().toDateString();

  if (!data.mood.entries[today]) {
    data.mood.entries[today] = {};
  }

  data.mood.entries[today][userId] = {
    username: username,
    mood: moodValue,
    note: note,
    timestamp: new Date().toISOString()
  };

  // Check mood streak for badges
  if (!data.gamification.users[userId]) {
    data.gamification.users[userId] = {
      points: 0,
      badges: [],
      tasks: [],
      streak: 0,
      lastTaskDate: null,
      moodStreak: 0,
      lastMoodDate: null
    };
  }

  const userData = data.gamification.users[userId];
  if (!userData.moodStreak) userData.moodStreak = 0;
  if (!userData.lastMoodDate) userData.lastMoodDate = null;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (userData.lastMoodDate !== today) {
    if (userData.lastMoodDate === yesterday.toDateString()) {
      userData.moodStreak++;
    } else {
      userData.moodStreak = 1;
    }
    userData.lastMoodDate = today;

    // Award points for mood check-in
    userData.points += 2;
    savePhase6Data(data);

    // Check for mood master badge
    if (userData.moodStreak >= 7 && !userData.badges.includes('mood_master')) {
      userData.badges.push('mood_master');
      userData.points += 50;
      savePhase6Data(data);
      await message.channel.send(`✅ **心情已記錄！** ${data.mood.moods[moodValue - 1].emoji}\n\n+2 積分\n\n🎉 **解鎖徽章！** ${data.gamification.badges.find(b => b.id === 'mood_master').icon} ${data.gamification.badges.find(b => b.id === 'mood_master').name}`);
      return;
    }
  }

  savePhase6Data(data);

  const moodInfo = data.mood.moods.find(m => m.value === moodValue);
  await message.channel.send(`✅ **心情已記錄！** ${moodInfo.emoji} ${moodInfo.label}${note ? `\n備註: ${note}` : ''}\n\n+2 積分 | 連續 ${userData.moodStreak} 天匯報心情`);
}

async function showMoodStats(message, data) {
  const allEntries = data.mood.entries;
  const totalCheckins = Object.values(allEntries).reduce((sum, day) => sum + Object.keys(day).length, 0);

  if (totalCheckins === 0) {
    await message.channel.send('📊 **心情統計**\n\n暫時未有數據');
    return;
  }

  // Count moods
  const moodCounts = {};
  Object.values(allEntries).forEach(day => {
    Object.values(day).forEach(entry => {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    });
  });

  const stats = data.mood.moods.map(m => {
    const count = moodCounts[m.value] || 0;
    const bar = '█'.repeat(Math.round(count / totalCheckins * 10));
    return `${m.emoji} ${m.label}: ${count}次 ${bar}`;
  }).join('\n');

  await message.channel.send(`📊 **團隊心情統計** (共 ${totalCheckins} 次匯報)\n\n${stats}`);
}

async function showMoodChart(message, data) {
  const allEntries = data.mood.entries;
  const dates = Object.keys(allEntries).sort().slice(-7);

  if (dates.length === 0) {
    await message.channel.send('📈 **心情趨勢**\n\n暫時未有足夠數據');
    return;
  }

  const chart = dates.map(date => {
    const dayEntries = Object.values(allEntries[date]);
    if (dayEntries.length === 0) return null;

    const avg = dayEntries.reduce((sum, e) => sum + e.mood, 0) / dayEntries.length;
    const emoji = avg >= 4.5 ? '😄' : avg >= 3.5 ? '🙂' : avg >= 2.5 ? '😐' : avg >= 1.5 ? '😕' : '😫';
    const bar = '▓'.repeat(Math.round(avg)) + '░'.repeat(5 - Math.round(avg));
    return `${date.slice(5)}: ${bar} ${emoji} ${avg.toFixed(1)}`;
  }).filter(Boolean).join('\n');

  await message.channel.send(`📈 **過去7天心情趨勢**\n\n${chart}`);
}

// ==================== 智能提醒系統 ====================

function getReminderHelp() {
  return `**⏰ 智能提醒**:
\`!remind [內容]\` - 添加提醒
\`!remind [小時] [內容]\` - 幾小時後提醒
\`!remind [日期] [內容]\` - 特定日期提醒
\`!reminders\` - 查看所有提醒
\`!remind done [ID]\` - 完成提醒
\`!remind delete [ID]\` - 刪除提醒`;
}

async function handleReminderCommand(message, args, data) {
  const subCommand = args[0];
  const userId = message.author.id;
  const username = message.author.username;

  // List reminders
  if (!subCommand || subCommand === 'list' || subCommand === 'view') {
    return await listReminders(message, data, userId);
  }

  // Add reminder
  if (subCommand === 'add' || !/^\d+$/.test(subCommand)) {
    const content = args.join(' ');
    if (!content) {
      await message.channel.send(getReminderHelp());
      return;
    }
    return await addReminder(message, data, userId, username, content);
  }

  // Add timed reminder: !remind [小時] [內容]
  if (/^\d+$/.test(subCommand)) {
    const hours = parseInt(subCommand);
    const content = args.slice(1).join(' ');
    if (!content) {
      await message.channel.send('用法: !remind [小時] [內容]\n例如: !remind 2 開會');
      return;
    }
    return await addTimedReminder(message, data, userId, username, hours, content);
  }

  // Done
  if (subCommand === 'done' || subCommand === 'complete') {
    const id = args[1];
    if (!id) {
      await message.channel.send('用法: !remind done [ID]');
      return;
    }
    return await completeReminder(message, data, userId, id);
  }

  // Delete
  if (subCommand === 'delete' || subCommand === 'remove') {
    const id = args[1];
    if (!id) {
      await message.channel.send('用法: !remind delete [ID]');
      return;
    }
    return await deleteReminder(message, data, userId, id);
  }

  await message.channel.send(getReminderHelp());
}

async function listReminders(message, data, userId) {
  const reminders = data.reminders.items.filter(r => r.userId === userId && !r.completed);

  if (reminders.length === 0) {
    await message.channel.send('⏰ **你的提醒**\n\n暫時未有提醒\n用法: !remind [內容]');
    return;
  }

  const list = reminders.map(r => {
    const dueDate = new Date(r.dueDate);
    const now = new Date();
    const diff = dueDate - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    let timeLeft = diff > 0 ? `${hours}小時${minutes}分後` : '已過期';
    const urgent = r.urgent ? '🔴 ' : '';

    return `**${r.id}**. ${urgent}${r.content}\n   ${timeLeft}`;
  }).join('\n');

  await message.channel.send(`⏰ **你的提醒** (${reminders.length}個)\n\n${list}`);
}

async function addReminder(message, data, userId, username, content) {
  const id = Date.now().toString().slice(-6);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1); // Default: tomorrow

  // Check for urgent keywords
  const urgentKeywords = ['緊急', 'urgent', 'asap', '立即', '盡快'];
  const urgent = urgentKeywords.some(k => content.toLowerCase().includes(k.toLowerCase()));

  const reminder = {
    id: id,
    userId: userId,
    username: username,
    content: content,
    dueDate: dueDate.toISOString(),
    urgent: urgent,
    completed: false,
    createdAt: new Date().toISOString()
  };

  data.reminders.items.push(reminder);

  // Check reminder hero badge
  const reminderCount = data.reminders.items.filter(r => r.userId === userId).length;
  if (reminderCount >= 10 && data.gamification.users[userId]) {
    const userData = data.gamification.users[userId];
    if (!userData.badges.includes('reminder_hero')) {
      userData.badges.push('reminder_hero');
      userData.points += 20;
      savePhase6Data(data);
      await message.channel.send(`✅ **提醒已設置！** ${urgent ? '🔴 緊急' : ''}\n\n${content}\n\n🎉 **解鎖徽章！** ⏰ 提醒英雄`);
      return;
    }
  }

  savePhase6Data(data);

  const dueStr = dueDate.toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  await message.channel.send(`✅ **提醒已設置！** ${urgent ? '🔴 緊急' : ''}\n\n${content}\n\n到期: ${dueStr}`);
}

async function addTimedReminder(message, data, userId, username, hours, content) {
  const id = Date.now().toString().slice(-6);
  const dueDate = new Date();
  dueDate.setHours(dueDate.getHours() + hours);

  const reminder = {
    id: id,
    userId: userId,
    username: username,
    content: content,
    dueDate: dueDate.toISOString(),
    urgent: false,
    completed: false,
    createdAt: new Date().toISOString()
  };

  data.reminders.items.push(reminder);
  savePhase6Data(data);

  const dueStr = dueDate.toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong', hour: '2-digit', minute: '2-digit' });
  await message.channel.send(`✅ **提醒已設置！**\n\n${content}\n\n${hours}小時後提醒 (${dueStr})`);
}

async function completeReminder(message, data, userId, id) {
  const reminder = data.reminders.items.find(r => r.id === id && r.userId === userId);

  if (!reminder) {
    await message.channel.send(`❌ 找不到提醒 #${id}`);
    return;
  }

  reminder.completed = true;
  savePhase6Data(data);

  // Award points
  if (!data.gamification.users[userId]) {
    data.gamification.users[userId] = {
      points: 0,
      badges: [],
      tasks: [],
      streak: 0,
      lastTaskDate: null
    };
  }

  const urgentBonus = reminder.urgent ? 5 : 2;
  data.gamification.users[userId].points += urgentBonus;
  savePhase6Data(data);

  await message.channel.send(`✅ **提醒完成！** "${reminder.content}"\n\n+${urgentBonus} 積分`);
}

async function deleteReminder(message, data, userId, id) {
  const index = data.reminders.items.findIndex(r => r.id === id && r.userId === userId);

  if (index === -1) {
    await message.channel.send(`❌ 找不到提醒 #${id}`);
    return;
  }

  const removed = data.reminders.items.splice(index, 1)[0];
  savePhase6Data(data);

  await message.channel.send(`🗑️ **提醒已刪除！** "${removed.content}"`);
}

// ==================== 數據儀表板 ====================

function getDashboardHelp() {
  return `**📊 數據儀表板**:
\`!dashboard\` - 查看儀表板
\`!dashboard tasks\` - 只看任務
\`!dashboard points\` - 只看積分
\`!dashboard mood\` - 只看心情
\`!dashboard activity\` - 只看活動`;
}

async function handleDashboardCommand(message, args, data) {
  const subCommand = args[0];

  if (!subCommand) {
    return await showFullDashboard(message, data);
  }

  switch (subCommand) {
    case 'tasks':
      return await showDashboardTasks(message, data);
    case 'points':
    case 'leaderboard':
      return await showDashboardPoints(message, data);
    case 'mood':
      return await showDashboardMood(message, data);
    case 'activity':
      return await showDashboardActivity(message, data);
    default:
      await message.channel.send(getDashboardHelp());
  }
}

async function showFullDashboard(message, data) {
  const tasks = data.reminders.items.filter(r => !r.completed).slice(0, 5);
  const users = Object.values(data.gamification.users)
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);

  const today = new Date().toDateString();
  const todayEntries = data.mood.entries[today] || {};
  const avgMood = Object.values(todayEntries).length > 0
    ? Object.values(todayEntries).reduce((sum, e) => sum + e.mood, 0) / Object.values(todayEntries).length
    : null;

  let embed = '📊 **虛擬辦公室儀表板**\n\n';

  // Tasks
  embed += '📋 **待辦任務**\n';
  if (tasks.length === 0) {
    embed += '  無待辦任務\n';
  } else {
    embed += tasks.map(t => `  • ${t.content}`).join('\n') + '\n';
  }

  // Points
  embed += '\n🏆 **積分 Top 5**\n';
  if (users.length === 0) {
    embed += '  暫無數據\n';
  } else {
    embed += users.map((u, i) => `  ${i + 1}. ${u.points} 分`).join('\n') + '\n';
  }

  // Mood
  embed += '\n😊 **今日心情**\n';
  if (avgMood) {
    const moodInfo = data.mood.moods.find(m => m.value === Math.round(avgMood));
    embed += `  ${moodInfo?.emoji || '😐'} 平均 ${avgMood.toFixed(1)}/5 (${Object.keys(todayEntries).length}人)`;
  } else {
    embed += '  暫無匯報';
  }

  await message.channel.send(embed);
}

async function showDashboardTasks(message, data) {
  const tasks = data.reminders.items.filter(r => !r.completed);


  if (tasks.length === 0) {
    await message.channel.send('📋 **待辦任務**\n\n無待辦任務');
    return;
  }

  const list = tasks.map(t => {
    const urgent = t.urgent ? '🔴 ' : '';
    return `**${t.id}**. ${urgent}${t.content}`;
  }).join('\n');

  await message.channel.send(`📋 **待辦任務** (${tasks.length}個)\n\n${list}`);
}

async function showDashboardPoints(message, data) {
  const users = Object.entries(data.gamification.users)
    .sort((a, b) => b[1].points - a[1].points)
    .slice(0, 10);

  if (users.length === 0) {
    await message.channel.send('🏆 **積分排行**\n\n暫無數據');
    return;
  }

  const list = users.map(([userId, userData], index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
    return `${medal} #${index + 1} <@${userId}> - ${userData.points} 分`;
  }).join('\n');

  await message.channel.send(`🏆 **積分排行**\n\n${list}`);
}

async function showDashboardMood(message, data) {
  const today = new Date().toDateString();
  const todayEntries = data.mood.entries[today] || {};

  const entries = Object.entries(todayEntries);
  if (entries.length === 0) {
    await message.channel.send('😊 **今日心情**\n\n暫時未有隊友匯報');
    return;
  }

  const avgMood = entries.reduce((sum, [, entry]) => sum + entry.mood, 0) / entries.length;
  const avgMoodInfo = data.mood.moods.find(m => m.value === Math.round(avgMood)) || data.mood.moods[2];

  const entryList = entries.map(([userId, entry]) => {
    const moodInfo = data.mood.moods.find(m => m.value === entry.mood) || data.mood.moods[2];
    return `${moodInfo.emoji} <@${userId}>`;
  }).join(' ');

  await message.channel.send(`😊 **今日心情** ${avgMoodInfo.emoji} (平均: ${avgMood.toFixed(1)})\n\n${entryList}`);
}

async function showDashboardActivity(message, data) {
  const recentTasks = data.gamification.users
    ? Object.values(data.gamification.users)
        .flatMap(u => u.tasks || [])
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
        .slice(0, 10)
    : [];

  if (recentTasks.length === 0) {
    await message.channel.send('📊 **近期活動**\n\n暫無活動記錄');
    return;
  }

  const list = recentTasks.map((t, i) => {
    const date = new Date(t.completedAt).toLocaleString('zh-HK', { 
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
    return `${i + 1}. ${t.task} (+${t.points}) ${date}`;
  }).join('\n');

  await message.channel.send(`📊 **近期活動**\n\n${list}`);
}

// 導出模組
module.exports = {
  loadPhase6Data,
  savePhase6Data,
  handleWhiteboardCommand,
  handleGamificationCommand,
  handleMoodCommand,
  handleReminderCommand,
  handleDashboardCommand
};
