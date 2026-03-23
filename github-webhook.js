/**
 * GitHub Webhook Handler
 * 功能：接收 GitHub webhook，推送 PR/Issue 更新到 Discord
 * 
 * 環境變量:
 *   GITHUB_WEBHOOK_SECRET - GitHub Webhook Secret
 *   DISCORD_BOT_TOKEN - Discord Bot Token
 *   PORT - Webhook 伺服器端口 (預設 3000)
 * 
 * 支持的事件:
 * - pull_request: PR 创建/更新/合併
 * - issues: Issue 创建/更新/關閉
 * - push: 代碼推送
 */

const http = require('http');
const crypto = require('crypto');
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const GITHUB_CONFIG_PATH = path.join(__dirname, 'github-config.json');

// 載入配置
function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    console.error('無法載入配置:', e.message);
    return {};
  }
}

function loadGitHubConfig() {
  try {
    return JSON.parse(fs.readFileSync(GITHUB_CONFIG_PATH, 'utf8'));
  } catch (e) {
    console.error('無法載入 GitHub 配置:', e.message);
    return {};
  }
}

// 驗證 GitHub signature
function verifySignature(payload, signature, secret) {
  if (!signature || !secret) return true; // 測試模式
  
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// 根據 repo 獲取對應的 Discord 頻道
function getChannelForRepo(repo, config) {
  const repoMap = {
    'ai-learning': 'ai-updates',
    'virtual-office': 'vo-updates',
    'lsc-ole-s1-2026': 'ole-updates',
    'homework-duty-system': 'hwd-updates',
    'math-week-2026': 'mw-updates',
    'teacher-dev-day': 'tdd-updates'
  };
  
  const channelName = repoMap[repo];
  if (!channelName) return null;
  
  // 從配置中獲取頻道 ID
  const githubConfig = loadGitHubConfig();
  return githubConfig.channels?.[channelName];
}

// 格式化 PR 消息
function formatPullRequest(event, payload) {
  const { action, pull_request, repository } = payload;
  
  const emojis = {
    'opened': '🆕',
    'closed': '✅',
    'reopened': '🔄',
    'ready_for_review': '👀',
    'synchronize': '📝'
  };
  
  const emoji = emojis[action] || '📋';
  const title = pull_request.title;
  const url = pull_request.html_url;
  const author = pull_request.user.login;
  const description = pull_request.body?.substring(0, 200) || '無描述';
  
  // 构建字段
  const fields = [
    { name: '作者', value: author, inline: true },
    { name: '狀態', value: action.replace('_', ' '), inline: true },
    { name: '分支', value: `${pull_request.head?.ref} → ${pull_request.base?.ref}`, inline: false }
  ];
  
  if (pull_request.merged) {
    fields.push({ name: '合併', value: `✅ 已合併到 ${pull_request.base?.ref}`, inline: false });
  }
  
  return {
    title: `${emoji} PR: ${title}`,
    description: description,
    url: url,
    color: action === 'closed' && pull_request.merged ? 0x00ff00 : 0x0099ff,
    fields: fields,
    footer: { text: `${repository.full_name} • ${new Date().toISOString()}` }
  };
}

// 格式化 Issue 消息
function formatIssue(event, payload) {
  const { action, issue, repository } = payload;
  
  const emojis = {
    'opened': '🆕',
    'closed': '✅',
    'reopened': '🔄'
  };
  
  const emoji = emojis[action] || '📋';
  const title = issue.title;
  const url = issue.html_url;
  const author = issue.user.login;
  const labels = issue.labels.map(l => l.name).join(', ') || '無標籤';
  
  const fields = [
    { name: '作者', value: author, inline: true },
    { name: '標籤', value: labels, inline: true }
  ];
  
  if (issue.assignee) {
    fields.push({ name: '負責人', value: issue.assignee.login, inline: true });
  }
  
  return {
    title: `${emoji} Issue: ${title}`,
    description: issue.body?.substring(0, 200) || '無描述',
    url: url,
    color: action === 'closed' ? 0x00ff00 : 0xff9900,
    fields: fields,
    footer: { text: `${repository.full_name} • ${new Date().toISOString()}` }
  };
}

// 格式化 Push 消息
function formatPush(payload) {
  const { repository, commits, pusher } = payload;
  
  const commitList = commits.slice(0, 5).map(c => {
    const shortHash = c.id.substring(0, 7);
    const message = c.message.split('\n')[0].substring(0, 80);
    return `\`${shortHash}\` ${message}`;
  }).join('\n');
  
  const moreCommits = commits.length > 5 ? `\n... 仲有 ${commits.length - 5} 個 commit` : '';
  
  return {
    title: `🚀 ${repository.full_name} Push`,
    description: `**推送者**: ${pusher.name}\n**Commit 數量**: ${commits.length}`,
    color: 0x9933ff,
    fields: [
      { name: '最新 Commit', value: commitList + moreCommits }
    ],
    footer: { text: `${repository.full_name} • ${new Date().toISOString()}` }
  };
}

// Discord 客戶端
let discordClient = null;

// 初始化 Discord Client
async function initDiscord() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.log('⚠️ 未設置 DISCORD_BOT_TOKEN，跳過 Discord 推送');
    return;
  }
  
  discordClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages
    ]
  });
  
  await new Promise((resolve, reject) => {
    discordClient.once('ready', () => {
      console.log('✅ Discord Client 已就緒');
      resolve();
    });
    discordClient.once('error', reject);
    discordClient.login(token);
  });
}

// 發送到 Discord
async function sendToDiscord(channelId, embed) {
  if (!discordClient) {
    console.log('⚠️ Discord Client 未初始化');
    return;
  }
  
  try {
    const channel = await discordClient.channels.fetch(channelId);
    if (channel) {
      await channel.send({ embeds: [embed] });
      console.log(`✅ 已發送到 Discord 頻道: ${channelId}`);
    } else {
      console.log(`⚠️ 找不到頻道: ${channelId}`);
    }
  } catch (e) {
    console.error('發送失敗:', e.message);
  }
}

// HTTP 伺服器
async function startServer() {
  const config = loadConfig();
  const port = process.env.PORT || 3000;
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  
  // 初始化 Discord
  await initDiscord();
  
  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Hub-Signature-256');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    if (req.method !== 'POST' || req.url !== '/webhook') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
      return;
    }
    
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const signature = req.headers['x-hub-signature-256'];
      
      // 驗證 signature (可選)
      if (secret && !verifySignature(body, signature, secret)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid signature' }));
        return;
      }
      
      try {
        const payload = JSON.parse(body);
        const event = req.headers['x-github-event'];
        
        console.log(`📥 收到 GitHub Event: ${event}`);
        
        let embed = null;
        
        switch (event) {
          case 'pull_request':
            embed = formatPullRequest(event, payload);
            break;
          case 'issues':
            embed = formatIssue(event, payload);
            break;
          case 'push':
            embed = formatPush(payload);
            break;
          default:
            console.log(`⚠️ 未處理的事件: ${event}`);
        }
        
        if (embed) {
          const repo = payload.repository?.name;
          const channelId = getChannelForRepo(repo, config);
          
          if (channelId) {
            await sendToDiscord(channelId, embed);
          } else {
            console.log(`⚠️ 未找到對應頻道: ${repo}`);
          }
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        console.error('處理錯誤:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  });
  
  server.listen(port, () => {
    console.log(`🌐 GitHub Webhook Server 運行於 port ${port}`);
    console.log(`📍 Webhook URL: http://localhost:${port}/webhook`);
  });
}

// 導出以便獨立運行
module.exports = { startServer, sendToDiscord };

if (require.main === module) {
  startServer().catch(console.error);
}