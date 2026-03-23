#!/usr/bin/env node
/**
 * Virtual Office Sync - Start Script
 * Starts both the sync server and optionally the Discord bot
 * 
 * Usage:
 *   node start-vo-sync.js              # Start sync server only
 *   node start-vo-sync.js --discord    # Start both sync server and Discord bot
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const BASE_DIR = __dirname;

console.log(`
╔═══════════════════════════════════════════════════╗
║       Virtual Office Sync - Startup               ║
║   Discord ↔ Website Real-time Synchronization     ║
╚═══════════════════════════════════════════════════╝
`);

// Parse arguments
const args = process.argv.slice(2);
const startDiscord = args.includes('--discord') || args.includes('-d');
const startUI = args.includes('--ui') || args.includes('-u');

// ==================== Step 1: Initialize Data Files ====================

console.log('\n📁 Initializing data files...');

const dataFiles = [
  'vo-status-db.json',
  'vo-standup-db.json',
  'vo-poll-db.json',
  'vo-mood-db.json',
  'vo-pomodoro-db.json',
  'vo-reminder-db.json',
  'vo-points-db.json',
  'vo-badges-db.json',
  'vo-calendar-db.json',
  'vo-whiteboard-db.json',
  'vo-forum-db.json',
  'vo-templates-db.json',
  'vo-stats-db.json',
  'vo-config.json',
];

const defaults = {
  'vo-status-db.json': { members: {}, lastUpdated: null },
  'vo-standup-db.json': { standups: [], currentWeek: null },
  'vo-poll-db.json': { polls: [], votes: {} },
  'vo-mood-db.json': { entries: [], teamStats: { average: 3, count: 0, trend: 'stable' } },
  'vo-pomodoro-db.json': { activeSessions: {}, history: [], stats: {} },
  'vo-reminder-db.json': { reminders: [], triggered: [] },
  'vo-points-db.json': { users: {}, transactions: [] },
  'vo-badges-db.json': { 
    badges: {
      'first-task': { id: 'first-task', name: '初試身手', icon: '🌟', description: '完成第一個任務', points: 10 },
      'speed-demon': { id: 'speed-demon', name: '閃電俠', icon: '⚡', description: '24小時內完成任務', points: 20 },
      'team-player': { id: 'team-player', name: '團隊精神', icon: '🤝', description: '協助隊友完成任務', points: 15 },
      'mood-master': { id: 'mood-master', name: '心情大使', icon: '😊', description: '連續7天匯報心情', points: 50 },
      'streak-3': { id: 'streak-3', name: '持續的力量', icon: '🔥', description: '連續3天完成任務', points: 30 },
      'streak-7': { id: 'streak-7', name: '一週冠軍', icon: '🏆', description: '連續7天完成任務', points: 100 },
      'centurian': { id: 'centurian', name: '百分達人', icon: '💯', description: '累積100積分', points: 25 },
      'top-500': { id: 'top-500', name: '五百強', icon: '🥇', description: '累積500積分', points: 100 },
      'reminder-hero': { id: 'reminder-hero', name: '提醒英雄', icon: '⏰', description: '設置10個提醒', points: 20 },
    }, 
    userBadges: {} 
  },
  'vo-calendar-db.json': { events: [], lastSync: null },
  'vo-whiteboard-db.json': { 
    pages: { 
      default: { id: 'default', name: '默認白板', content: [], createdAt: Date.now() } 
    }, 
    currentPage: 'default' 
  },
  'vo-forum-db.json': { categories: [], posts: [] },
  'vo-templates-db.json': { 
    templates: [
      { id: 'daily-standup', name: '每日 Standup', category: 'standup', content: '## 昨日完成\n- \n\n## 今日計劃\n- \n\n## 阻礙\n- 無' },
      { id: 'bug-report', name: 'Bug 報告', category: 'report', content: '## Bug 描述\n\n## 重現步驟\n1. \n2. \n3. \n\n## 預期行為\n\n## 實際行為' },
      { id: 'meeting-notes', name: '會議記錄', category: 'notes', content: '## 會議主題\n\n## 出席者\n\n## 討論內容\n\n## 行動項目\n- [ ] ' },
      { id: 'feature-request', name: '功能請求', category: 'request', content: '## 功能名稱\n\n## 需求描述\n\n## 使用場景\n\n## 預期效果' },
    ], 
    recentUse: {} 
  },
  'vo-stats-db.json': { daily: {}, weekly: {}, monthly: {}, allTime: {} },
  'vo-config.json': {
    syncEnabled: true,
    websocketPort: 18900,
    pollInterval: 5000,
    maxHistory: 1000,
    features: {
      status: true,
      standup: true,
      poll: true,
      mood: true,
      pomodoro: true,
      reminder: true,
      points: true,
      badges: true,
      calendar: true,
      whiteboard: true,
      forum: true,
      templates: true,
      stats: true,
    },
  },
};

for (const file of dataFiles) {
  const filePath = path.join(BASE_DIR, file);
  if (!fs.existsSync(filePath)) {
    const defaultData = defaults[file] || {};
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    console.log(`  ✅ Created ${file}`);
  } else {
    console.log(`  ✓  ${file} exists`);
  }
}

// ==================== Step 2: Start Sync Server ====================

console.log('\n🚀 Starting VO Sync Server...');

const syncServer = spawn('node', ['sync/vo-sync-server.js'], {
  cwd: BASE_DIR,
  stdio: 'inherit',
  env: { ...process.env, VO_SYNC_PORT: '18900' }
});

syncServer.on('error', (err) => {
  console.error('❌ Failed to start sync server:', err.message);
});

// Wait a bit for server to start
setTimeout(() => {
  // ==================== Step 3: Start Discord Bot (optional) ====================
  
  if (startDiscord) {
    console.log('\n🤖 Starting Discord Bot...');
    
    // Check if discord-bot.js exists and has VO bridge code
    const discordBotPath = path.join(BASE_DIR, 'discord-bot.js');
    if (fs.existsSync(discordBotPath)) {
      // Check if bridge is integrated
      let content = fs.readFileSync(discordBotPath, 'utf8');
      if (!content.includes('vo-discord-bridge')) {
        console.log('\n⚠️  Discord bot does not have VO bridge integrated.');
        console.log('    Add the following to discord-bot.js:');
        console.log('    const voBridge = require("./sync/vo-discord-bridge");');
        console.log('    const bridge = voBridge.integrateWithDiscordBot(client);');
      }
    }
    
    const discordBot = spawn('node', ['discord-bot.js'], {
      cwd: BASE_DIR,
      stdio: 'inherit',
      env: process.env
    });
    
    discordBot.on('error', (err) => {
      console.error('❌ Failed to start Discord bot:', err.message);
    });
  }
  
  // ==================== Step 4: Open UI (optional) ====================
  
  if (startUI) {
    console.log('\n🌐 Opening VO Sync UI...');
    const { execSync } = require('child_process');
    try {
      execSync(`open http://localhost:18900`, { stdio: 'ignore' });
    } catch (e) {}
  }

}, 2000);

// ==================== Graceful Shutdown ====================

process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down...');
  syncServer.kill();
  process.exit(0);
});

console.log('\n📌 Press Ctrl+C to stop all services\n');
