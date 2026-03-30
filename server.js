#!/usr/bin/env node
/**
 * OpenClaw Virtual Office — WebSocket Server
 * Based on: https://github.com/thx0701/openclaw-virtual-office
 * 
 * Serves the dashboard + pushes real-time status updates via WebSocket.
 * Polls OpenClaw sessions every 10s and broadcasts changes to all clients.
 * 
 * Usage:
 *   node server.js                    # Default port 18899
 *   PORT=3000 node server.js         # Custom port
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = parseInt(process.env.PORT || '18899');
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '10000'); // 10s
const BASE_DIR = __dirname;

// --- Simple WebSocket implementation (no dependencies) ---

function hashWebSocketKey(key) {
  const crypto = require('crypto');
  return crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-A5AB53DC65B4')
    .digest('base64');
}

function encodeFrame(data) {
  const payload = Buffer.from(data, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // text frame, fin
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

function decodeFrame(buffer) {
  if (buffer.length < 2) return null;
  const masked = (buffer[1] & 0x80) !== 0;
  let payloadLen = buffer[1] & 0x7f;
  let offset = 2;
  if (payloadLen === 126) {
    payloadLen = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLen === 127) {
    payloadLen = Number(buffer.readBigUInt64BE(2));
    offset = 10;
  }
  if (masked) {
    const mask = buffer.slice(offset, offset + 4);
    offset += 4;
    const data = buffer.slice(offset, offset + payloadLen);
    for (let i = 0; i < data.length; i++) data[i] ^= mask[i % 4];
    return data.toString('utf8');
  }
  return buffer.slice(offset, offset + payloadLen).toString('utf8');
}

// --- State management ---

const clients = new Set();
let currentStatus = null;
let config = {};

function loadConfig() {
  try {
    config = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'config.json'), 'utf8'));
  } catch (e) {
    config = { title: 'OpenClaw Virtual Office', agents: [] };
  }
}

function getSessions() {
  try {
    const out = execSync('openclaw sessions --json', {
      timeout: 10000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const data = JSON.parse(out);
    return Array.isArray(data) ? data : (data.sessions || []);
  } catch (e) {
    console.error('Error fetching OpenClaw sessions:', e.message);
    return [];
  }
}

function matchSession(agent, sessions) {
  const pattern = agent.sessionMatch || '';
  if (!pattern) return null;
  return sessions.find(s => {
    const hay = (s.key || '') + '|' + (s.displayName || '');
    return hay.includes(pattern);
  });
}

function buildStatus() {
  const sessions = getSessions();
  const now = Date.now();
  const agents = (config.agents || []).map(agent => {
    const s = matchSession(agent, sessions);
    if (s) {
      const age = s.updatedAt ? Math.floor((now - s.updatedAt) / 60000) : 999;
      let status = 'offline';
      if (age < 2) status = 'busy';
      else if (age < 10) status = 'online';
      else if (age < 60) status = 'idle';

      // Extract last message
      let task = '工作中...';
      for (const msg of [...(s.messages || [])].reverse()) {
        const content = msg.content;
        if (Array.isArray(content)) {
          for (const c of content) {
            if (c && c.type === 'text' && c.text && c.text.trim().length > 2) {
              task = c.text.trim().slice(0, 80);
              break;
            }
          }
        } else if (typeof content === 'string' && content.trim().length > 2) {
          task = content.trim().slice(0, 80);
        }
        if (task !== '工作中...') break;
      }

      return {
        id: agent.id, name: agent.name, sprite: agent.sprite || 'agent-tech',
        role: agent.role || '', status, task, lastActive: age,
        session: s.key, tokens: s.totalTokens || 0,
      };
    }
    return {
      id: agent.id, name: agent.name, sprite: agent.sprite || 'agent-tech',
      role: agent.role || '', status: 'offline', task: '等待中...',
      lastActive: -1, session: null, tokens: 0,
    };
  });

  return { title: config.title || 'OpenClaw Virtual Office', timestamp: now, agents };
}

function broadcast(data) {
  const frame = encodeFrame(JSON.stringify(data));
  for (const client of clients) {
    try { client.write(frame); } catch (e) { clients.delete(client); }
  }
}

// ========== ClawTeam API Functions ==========

const AGENTS_DIR = path.join(process.env.HOME || '/Users/zachli', '.openclaw/workspace/agents');

// Read agent identity files
function readAgentIdentity(agentPath) {
  const identityPath = path.join(agentPath, 'IDENTITY.md');
  const toolsPath = path.join(agentPath, 'TOOLS.md');
  const soulPath = path.join(agentPath, 'SOUL.md');
  
  const identity = { name: 'Unknown', role: 'Agent', emoji: '🤖' };
  
  try {
    if (fs.existsSync(identityPath)) {
      const content = fs.readFileSync(identityPath, 'utf8');
      const nameMatch = content.match(/- \*\*Name:\*\*\s*(.+)/);
      const emojiMatch = content.match(/- \*\*Emoji:\*\*\s*(.+)/);
      if (nameMatch) identity.name = nameMatch[1].trim();
      if (emojiMatch) identity.emoji = emojiMatch[1].trim();
    }
  } catch (e) {}
  
  try {
    if (fs.existsSync(soulPath)) {
      const content = fs.readFileSync(soulPath, 'utf8');
      const roleMatch = content.match(/\*\*Role:\*\*\s*(.+)/);
      if (roleMatch) identity.role = roleMatch[1].trim();
    }
  } catch (e) {}
  
  return identity;
}

// Get all teams (from agent workspaces)
function getClawTeamTeams() {
  const teams = [];
  const agentDirs = ['secretary', 'dev', 'ta', 'tester'];
  
  for (const dir of agentDirs) {
    const agentPath = path.join(AGENTS_DIR, dir);
    if (fs.existsSync(agentPath)) {
      const identity = readAgentIdentity(agentPath);
      teams.push({
        id: dir,
        name: identity.name,
        role: identity.role,
        emoji: identity.emoji,
        path: agentPath,
      });
    }
  }
  
  return { teams, count: teams.length, timestamp: Date.now() };
}

// Get tasks from phase data files and agent memory
function getClawTeamTasks() {
  const tasks = { todo: [], inProgress: [], done: [], lastUpdated: null };
  
  // Read from phase data files
  const phaseFiles = ['phase5-data.json', 'phase6-data.json', 'phase7-data.json', 'phase8-data.json', 'phase9-data.json'];
  
  for (const phaseFile of phaseFiles) {
    try {
      const filePath = path.join(BASE_DIR, phaseFile);
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Extract tasks from cron reminders
        if (data.cronEnhanced?.reminders) {
          for (const r of data.cronEnhanced.reminders) {
            if (r.enabled) {
              tasks.todo.push({
                id: r.id,
                title: r.name,
                source: phaseFile,
                type: 'reminder',
                status: r.enabled ? 'active' : 'inactive'
              });
            }
          }
        }
        
        // Extract dashboard tasks
        if (data.dashboard?.sections) {
          tasks.inProgress.push({
            id: 'dashboard',
            title: 'Dashboard',
            source: phaseFile,
            type: 'feature',
            sections: data.dashboard.sections
          });
        }
      }
    } catch (e) {}
  }
  
  // Read from agent memory files for active tasks
  const memoryDir = path.join(process.env.HOME || '/Users/zachli', '.openclaw/workspace/memory');
  if (fs.existsSync(memoryDir)) {
    try {
      const files = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md')).sort().reverse().slice(0, 7);
      for (const file of files) {
        const content = fs.readFileSync(path.join(memoryDir, file), 'utf8');
        // Extract task-like lines (starting with - [ ] or - ✅)
        const taskMatches = content.match(/- \[ \] (.+)/g) || [];
        for (const match of taskMatches) {
          const title = match.replace('- [ ] ', '').trim();
          if (title && !tasks.todo.find(t => t.title === title)) {
            tasks.todo.push({ id: `mem-${file}-${tasks.todo.length}`, title, source: file, type: 'memory' });
          }
        }
        const doneMatches = content.match(/- ✅ (.+)/g) || [];
        for (const match of doneMatches) {
          const title = match.replace('- ✅ ', '').trim();
          if (title && !tasks.done.find(t => t.title === title)) {
            tasks.done.push({ id: `mem-${file}-${tasks.done.length}`, title, source: file, type: 'memory' });
          }
        }
      }
    } catch (e) {}
  }
  
  tasks.lastUpdated = Date.now();
  return tasks;
}

// Get agent status from OpenClaw sessions
function getClawTeamAgents() {
  const sessions = getSessions();
  const now = Date.now();
  
  const agents = [];
  const agentDirs = ['secretary', 'dev', 'ta', 'tester'];
  
  for (const dir of agentDirs) {
    const agentPath = path.join(AGENTS_DIR, dir);
    const identity = fs.existsSync(agentPath) ? readAgentIdentity(agentPath) : { name: dir, role: 'Agent', emoji: '🤖' };
    
    // Find matching session
    const session = sessions.find(s => s.key.includes(`subagent:${dir}`) || s.key.includes(`:${dir}`));
    
    if (session) {
      const ageMs = now - (session.updatedAt || now);
      const ageMins = Math.floor(ageMs / 60000);
      let status = 'offline';
      if (ageMins < 2) status = 'busy';
      else if (ageMins < 10) status = 'online';
      else if (ageMins < 60) status = 'idle';
      
      agents.push({
        id: dir,
        name: identity.name,
        emoji: identity.emoji,
        role: identity.role,
        status,
        lastActive: ageMins,
        session: session.key,
        tokens: session.totalTokens || 0,
        inputTokens: session.inputTokens || 0,
        outputTokens: session.outputTokens || 0,
        updatedAt: session.updatedAt
      });
    } else {
      agents.push({
        id: dir,
        name: identity.name,
        emoji: identity.emoji,
        role: identity.role,
        status: 'offline',
        lastActive: -1,
        session: null,
        tokens: 0
      });
    }
  }
  
  return { agents, count: agents.length, timestamp: Date.now() };
}

// Get recent messages from Discord (via Discord bot data)
function getClawTeamMessages() {
  const messages = [];
  
  // Read from Discord bot's message cache if available
  const messageCachePath = path.join(BASE_DIR, 'discord-messages.json');
  try {
    if (fs.existsSync(messageCachePath)) {
      const cache = JSON.parse(fs.readFileSync(messageCachePath, 'utf8'));
      messages.push(...(cache.messages || []).slice(0, 50));
    }
  } catch (e) {}
  
  // Read from poll-db and keyword-db for recent activity
  const dbFiles = ['poll-db.json', 'keyword-db.json'];
  for (const dbFile of dbFiles) {
    try {
      const filePath = path.join(BASE_DIR, dbFile);
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // Extract recent polls/votes as "messages"
        if (data.polls) {
          for (const poll of data.polls.slice(0, 5)) {
            messages.push({
              id: `poll-${poll.id}`,
              type: 'poll',
              content: poll.question,
              author: poll.author || 'system',
              createdAt: poll.createdAt,
              channel: poll.channelId
            });
          }
        }
        if (data.keywords) {
          for (const kw of Object.keys(data.keywords || {}).slice(0, 5)) {
            messages.push({
              id: `keyword-${kw}`,
              type: 'keyword',
              content: `Keyword subscription: ${kw}`,
              createdAt: Date.now()
            });
          }
        }
      }
    } catch (e) {}
  }
  
  // Read from OpenClaw sessions for recent messages
  const sessions = getSessions();
  for (const session of sessions.slice(0, 10)) {
    if (session.messages && session.messages.length > 0) {
      const lastMsg = session.messages[session.messages.length - 1];
      const content = Array.isArray(lastMsg.content) 
        ? lastMsg.content.find(c => c.type === 'text')?.text || '...'
        : typeof lastMsg.content === 'string' ? lastMsg.content.slice(0, 100) : '...';
      
      messages.push({
        id: `session-${session.sessionId?.slice(0, 8)}`,
        type: 'session',
        content: content.slice(0, 120),
        author: session.agentId || 'unknown',
        createdAt: session.updatedAt,
        session: session.key
      });
    }
  }
  
  // Sort by createdAt descending
  messages.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  
  return { messages: messages.slice(0, 20), count: messages.length, timestamp: Date.now() };
}

// Get activity timeline from memory files and session logs
function getClawTeamActivity() {
  const activities = [];
  const memoryDir = path.join(process.env.HOME || '/Users/zachli', '.openclaw/workspace/memory');
  
  // Read memory files for activity
  if (fs.existsSync(memoryDir)) {
    try {
      const files = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md')).sort().reverse().slice(0, 7);
      
      for (const file of files) {
        const content = fs.readFileSync(path.join(memoryDir, file), 'utf8');
        const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
        
        // Extract timestamp from file
        const timestamp = dateMatch ? new Date(dateMatch[1]).getTime() : Date.now();
        
        // Look for action items and events
        const lines = content.split('\n');
        for (const line of lines) {
          // Detect various activity types
          if (line.includes('spawned') || line.includes('created') || line.includes('started')) {
            activities.push({ type: 'spawn', description: line.trim().slice(0, 100), timestamp, source: file });
          } else if (line.includes('completed') || line.includes('finished') || line.includes('done')) {
            activities.push({ type: 'complete', description: line.trim().slice(0, 100), timestamp, source: file });
          } else if (line.includes('error') || line.includes('failed') || line.includes('failed')) {
            activities.push({ type: 'error', description: line.trim().slice(0, 100), timestamp, source: file });
          } else if (line.match(/^## /)) {
            activities.push({ type: 'section', description: line.replace(/^## /, '').trim(), timestamp, source: file });
          }
        }
      }
    } catch (e) {
      console.error('[ClawTeam API] Error reading memory:', e.message);
    }
  }
  
  // Add agent status changes
  const sessions = getSessions();
  for (const session of sessions) {
    if (session.key.includes('subagent:')) {
      const agentId = session.key.split('subagent:')[1].split(':')[0];
      activities.push({
        type: 'agent',
        description: `Agent ${agentId} session active`,
        timestamp: session.updatedAt || Date.now(),
        source: 'session'
      });
    }
  }
  
  // Sort by timestamp descending
  activities.sort((a, b) => b.timestamp - a.timestamp);
  
  return { activities: activities.slice(0, 50), count: activities.length, timestamp: Date.now() };
}

// ==============================================

// --- HTTP server ---

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  let filePath = req.url.split('?')[0];
  if (filePath === '/') filePath = '/index.html';
  
  // API endpoint for voice status (from Discord bot)
  if (filePath === '/api/voice-status') {
    try {
      const voiceStatus = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'voice-status.json'), 'utf8'));
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(voiceStatus));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ channels: {}, total: 0 }));
    }
    return;
  }

  // API endpoint for current status
  if (filePath === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(currentStatus || { agents: [] }));
    return;
  }

  // ========== ClawTeam API Endpoints ==========
  
  // /api/clawteam/teams - List all teams
  if (filePath === '/api/clawteam/teams') {
    const teams = getClawTeamTeams();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(teams));
    return;
  }

  // /api/clawteam/tasks - Task kanban status
  if (filePath === '/api/clawteam/tasks') {
    const tasks = getClawTeamTasks();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(tasks));
    return;
  }

  // /api/clawteam/agents - Agent status
  if (filePath === '/api/clawteam/agents') {
    const agents = getClawTeamAgents();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(agents));
    return;
  }

  // /api/clawteam/messages - Recent inbox messages
  if (filePath === '/api/clawteam/messages') {
    const messages = getClawTeamMessages();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(messages));
    return;
  }

  // /api/clawteam/activity - Activity timeline
  if (filePath === '/api/clawteam/activity') {
    const activity = getClawTeamActivity();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(activity));
    return;
  }

  // ============================================
  // MiniMax Quota API (secure proxy)
  // ============================================

  if (filePath === '/api/minimax/quota') {
    const MINIMAX_KEY_FILE = path.join(process.env.HOME || '/Users/zachli', '.minimax-api-key');
    const MINIMAX_STATUS_FILE = path.join(BASE_DIR, 'public', 'minimax-status.json');
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

    // Try live fetch first, fall back to cached file
    try {
      if (fs.existsSync(MINIMAX_KEY_FILE)) {
        const apiKey = fs.readFileSync(MINIMAX_KEY_FILE, 'utf8').trim();
        const apiRes = await fetch('https://www.minimax.io/v1/api/openplatform/coding_plan/remains', {
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        });
        if (apiRes.ok) {
          const raw = await apiRes.json();
          const d = raw.data || raw;
          const status = {
            remains: d.remains ?? d.remaining ?? null,
            used: d.used ?? null,
            total: d.total ?? null,
            resetDate: d.resetDate ?? d.reset_date ?? null,
            updatedAt: new Date().toISOString(),
            provider: 'minimax',
            source: 'live',
          };
          // Cache it
          const pubDir = path.join(BASE_DIR, 'public');
          if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
          fs.writeFileSync(MINIMAX_STATUS_FILE, JSON.stringify(status, null, 2));
          res.writeHead(200, headers);
          res.end(JSON.stringify({ success: true, data: status }));
          return;
        }
      }
    } catch (e) {
      console.error('[MiniMax API] Live fetch error:', e.message);
    }

    // Fallback: serve cached status file
    try {
      if (fs.existsSync(MINIMAX_STATUS_FILE)) {
        const cached = JSON.parse(fs.readFileSync(MINIMAX_STATUS_FILE, 'utf8'));
        cached.source = 'cached';
        res.writeHead(200, headers);
        res.end(JSON.stringify({ success: true, data: cached }));
        return;
      }
    } catch (e) {}

    res.writeHead(200, headers);
    res.end(JSON.stringify({ success: false, error: { message: 'No API key and no cached data', code: 'NOT_CONFIGURED' } }));
    return;
  }

  // ============================================
  // Phase 11: Token Analysis API
  // ============================================
  
  const { TokenAPI } = require('./phase11-api');
  const tokenApi = new TokenAPI();
  
  // Token API routes
  const tokenEndpoints = [
    '/api/tokens/summary',
    '/api/tokens/trend',
    '/api/tokens/by-api',
    '/api/tokens/by-model',
    '/api/tokens/cache-efficiency',
    '/api/tokens/vlm',
    '/api/tokens/daily',
    '/api/tokens/hourly',
    '/api/tokens/export',
    '/api/tokens/compare',
    '/api/tokens/weekly',
    '/api/tokens/monthly',
    '/api/tokens/records'
  ];
  
  if (tokenEndpoints.some(ep => filePath.startsWith(ep))) {
    // Parse query string
    const urlParts = filePath.split('?');
    const endpoint = urlParts[0];
    const queryString = urlParts[1] || '';
    const params = {};
    queryString.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      if (key) params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    });
    
    // Route to appropriate handler
    let result = { success: false, error: { message: 'Not found', code: 'NOT_FOUND' } };
    
    try {
      if (endpoint === '/api/tokens/summary') {
        const { TokenAnalyzer } = require('./phase11-analyzer');
        const analyzer = new TokenAnalyzer();
        result = { success: true, data: analyzer.getSummaryWithRange(params.startDate, params.endDate) };
      } else if (endpoint === '/api/tokens/trend') {
        const { TokenAnalyzer } = require('./phase11-analyzer');
        const analyzer = new TokenAnalyzer();
        const records = analyzer.getRecords();
        let filtered = records;
        if (params.startDate || params.endDate) {
          filtered = analyzer.filterByDateRange(records, params.startDate, params.endDate);
        }
        result = { success: true, data: { period: params.period || 'daily', trends: analyzer.getTrends(filtered, params.period || 'daily') } };
      } else if (endpoint === '/api/tokens/by-api') {
        const { TokenAnalyzer } = require('./phase11-analyzer');
        const analyzer = new TokenAnalyzer();
        const records = analyzer.getRecords();
        let filtered = records;
        if (params.startDate || params.endDate) {
          filtered = analyzer.filterByDateRange(records, params.startDate, params.endDate);
        }
        const dist = analyzer.getApiDistribution(filtered);
        const total = Object.values(dist).reduce((sum, d) => sum + d.tokens, 0);
        result = { success: true, data: { distribution: dist, totalTokens: total, recordCount: filtered.length } };
      } else if (endpoint === '/api/tokens/by-model') {
        const { TokenAnalyzer } = require('./phase11-analyzer');
        const analyzer = new TokenAnalyzer();
        const records = analyzer.getRecords();
        let filtered = records;
        if (params.startDate || params.endDate) {
          filtered = analyzer.filterByDateRange(records, params.startDate, params.endDate);
        }
        const dist = analyzer.getModelDistribution(filtered);
        const total = Object.values(dist).reduce((sum, d) => sum + d.tokens, 0);
        result = { success: true, data: { distribution: dist, totalTokens: total, recordCount: filtered.length } };
      } else if (endpoint === '/api/tokens/cache-efficiency') {
        const { TokenAnalyzer } = require('./phase11-analyzer');
        const analyzer = new TokenAnalyzer();
        const records = analyzer.getRecords();
        let filtered = records;
        if (params.startDate || params.endDate) {
          filtered = analyzer.filterByDateRange(records, params.startDate, params.endDate);
        }
        const cache = analyzer.calculateCacheHitRate(filtered);
        const io = analyzer.calculateInputOutputRatio(filtered);
        result = { success: true, data: { ...cache, totalTokens: io.totalTokens, inputTokens: io.inputTokens, outputTokens: io.outputTokens, inputOutputRatio: io.ratio } };
      } else if (endpoint === '/api/tokens/vlm') {
        const { TokenAnalyzer } = require('./phase11-analyzer');
        const analyzer = new TokenAnalyzer();
        result = { success: true, data: analyzer.analyzeVLMUsage() };
      } else if (endpoint === '/api/tokens/daily') {
        const { TokenAnalyzer } = require('./phase11-analyzer');
        const analyzer = new TokenAnalyzer();
        const records = analyzer.getRecords();
        let filtered = records;
        if (params.startDate || params.endDate) {
          filtered = analyzer.filterByDateRange(records, params.startDate, params.endDate);
        }
        let daily = analyzer.getDailyDistribution(filtered);
        if (params.limit) daily = daily.slice(-parseInt(params.limit));
        result = { success: true, data: { daily, count: daily.length } };
      } else if (endpoint === '/api/tokens/hourly') {
        const { TokenAnalyzer } = require('./phase11-analyzer');
        const analyzer = new TokenAnalyzer();
        const records = analyzer.getRecords();
        let filtered = records;
        if (params.startDate || params.endDate) {
          filtered = analyzer.filterByDateRange(records, params.startDate, params.endDate);
        }
        const hourly = analyzer.getHourlyDistribution(filtered);
        const hourlyArr = Object.entries(hourly).map(([h, t]) => ({ hour: parseInt(h), tokens: t }));
        const peak = hourlyArr.reduce((max, h) => h.tokens > max.tokens ? h : max, hourlyArr[0]);
        result = { success: true, data: { hourly: hourlyArr, peakHour: peak } };
      } else if (endpoint === '/api/tokens/export') {
        const { TokenAnalyzer } = require('./phase11-analyzer');
        const analyzer = new TokenAnalyzer();
        const records = analyzer.getRecords();
        let filtered = records;
        if (params.startDate || params.endDate) {
          filtered = analyzer.filterByDateRange(records, params.startDate, params.endDate);
        }
        result = { success: true, data: { records: filtered, count: filtered.length, exportedAt: new Date().toISOString() } };
      } else if (endpoint === '/api/tokens/compare') {
        const { TokenAnalyzer } = require('./phase11-analyzer');
        const analyzer = new TokenAnalyzer();
        result = { success: true, data: analyzer.compareToPreviousPeriod(null, params.period || 'daily') };
      } else if (endpoint === '/api/tokens/weekly') {
        const { TokenAnalyzer } = require('./phase11-analyzer');
        const analyzer = new TokenAnalyzer();
        const summary = analyzer.buildWeeklySummary(null, params.weekStart);
        result = summary ? { success: true, data: summary } : { success: false, error: { message: 'No data for specified week', code: 'NOT_FOUND' } };
      } else if (endpoint === '/api/tokens/monthly') {
        const { TokenAnalyzer } = require('./phase11-analyzer');
        const analyzer = new TokenAnalyzer();
        const summary = analyzer.buildMonthlySummary(null, params.month);
        result = summary ? { success: true, data: summary } : { success: false, error: { message: 'No data for specified month', code: 'NOT_FOUND' } };
      } else if (endpoint === '/api/tokens/records') {
        const { TokenAnalyzer } = require('./phase11-analyzer');
        const analyzer = new TokenAnalyzer();
        const records = analyzer.getRecords();
        let filtered = records;
        if (params.startDate || params.endDate) {
          filtered = analyzer.filterByDateRange(records, params.startDate, params.endDate);
        }
        filtered = [...filtered].sort((a, b) => new Date(b.consumptionTime) - new Date(a.consumptionTime));
        const page = parseInt(params.page) || 1;
        const limit = Math.min(parseInt(params.limit) || 50, 100);
        const start = (page - 1) * limit;
        result = { success: true, data: { records: filtered.slice(start, start + limit), pagination: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) } } };
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(result));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: false, error: { message: err.message, code: 'SERVER_ERROR' } }));
      return;
    }
  }

  // ============================================
  // Phase 12: Copilot Usage API
  // ============================================

  if (filePath.startsWith('/api/copilot/')) {
    const { CopilotUsageTracker, COPILOT_MODEL_MULTIPLIERS, getModelProvider } = require('./copilot-usage-api');
    const tracker = new CopilotUsageTracker();
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

    const sendOk = (data) => {
      res.writeHead(200, headers);
      res.end(JSON.stringify({ success: true, data }));
    };
    const sendErr = (message, code, status) => {
      res.writeHead(status || 400, headers);
      res.end(JSON.stringify({ success: false, error: { message, code: code || 'ERROR' } }));
    };

    const readBody = (cb) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          cb(null, body ? JSON.parse(body) : {});
        } catch (e) {
          cb(new Error('Invalid JSON body'));
        }
      });
    };

    try {
      if (req.method === 'GET' && filePath === '/api/copilot/quota') {
        sendOk(tracker.getQuotaStatus());
        return;
      }

      if (req.method === 'GET' && filePath === '/api/copilot/analysis') {
        sendOk(tracker.getUsageAnalysis());
        return;
      }

      if (req.method === 'GET' && filePath === '/api/copilot/models') {
        const models = Object.entries(COPILOT_MODEL_MULTIPLIERS).map(([name, multiplier]) => ({
          name,
          multiplier,
          type: multiplier === 0 ? 'base' : 'premium'
        }));
        sendOk({ models, total: models.length });
        return;
      }

      if (req.method === 'GET' && filePath === '/api/copilot/github-status') {
        // Return GitHub API polling status
        const apiKeys = tracker.loadApiKeys();
        const endpoints = [
          { path: '/user/copilot_billing', note: 'User-level billing (requires manage_billing:copilot scope)' },
          { path: '/user/copilot_subscription', note: 'Copilot subscription status' },
          { path: '/user/copilot/seats', note: 'Copilot seat assignments' },
          { path: '/orgs/github/copilot/usage', note: 'Org-level usage (requires org admin)' },
          { path: '/enterprises/github/copilot/usage', note: 'Enterprise-level usage' },
        ];
        sendOk({
          githubTokenSet: !!apiKeys.githubToken,
          lastSync: apiKeys.lastGitHubSync,
          lastError: apiKeys.lastGitHubError,
          endpoints,
          mathLishTokenStatus: 'tested_all_return_404',
          mathLishTokenPlan: 'free',
          note: 'All Copilot API endpoints return 404 because math-lish token lacks manage_billing:copilot scope and account has no Copilot subscription',
        });
        return;
      }

      if (req.method === 'POST' && filePath === '/api/copilot/log') {
        readBody((err, body) => {
          if (err) { sendErr(err.message, 'BAD_REQUEST'); return; }
          try {
            const { model, feature, tokens, latency, apiKeyUsed, success } = body;
            const entry = tracker.logUsage(model, feature, tokens, { latency, apiKeyUsed, success });
            sendOk({ entry, quota: tracker.getQuotaStatus() });
          } catch (e) {
            sendErr(e.message, 'SERVER_ERROR', 500);
          }
        });
        return;
      }

      if (req.method === 'POST' && filePath === '/api/copilot/log-batch') {
        // Batch log multiple entries at once
        readBody((err, body) => {
          if (err) { sendErr(err.message, 'BAD_REQUEST'); return; }
          try {
            const entries = Array.isArray(body) ? body : body.entries || [];
            const logged = entries.map(e => tracker.logUsage(e.model, e.feature, e.tokens, {
              latency: e.latency, apiKeyUsed: e.apiKeyUsed, success: e.success
            }));
            sendOk({ logged: logged.length, entries: logged, quota: tracker.getQuotaStatus() });
          } catch (e) {
            sendErr(e.message, 'SERVER_ERROR', 500);
          }
        });
        return;
      }

      if (req.method === 'POST' && filePath === '/api/copilot/preference') {
        readBody((err, body) => {
          if (err) { sendErr(err.message, 'BAD_REQUEST'); return; }
          try {
            const result = tracker.setModelPreference(body.preference);
            sendOk(result);
          } catch (e) {
            sendErr(e.message, 'BAD_REQUEST');
          }
        });
        return;
      }

      if (req.method === 'POST' && filePath === '/api/copilot/quota') {
        readBody((err, body) => {
          if (err) { sendErr(err.message, 'BAD_REQUEST'); return; }
          try {
            const quota = tracker.setQuota(body.total, body.used, body.resetDate);
            sendOk({ quota });
          } catch (e) {
            sendErr(e.message, 'SERVER_ERROR', 500);
          }
        });
        return;
      }

      if (req.method === 'POST' && filePath === '/api/copilot/poll-github') {
        // Trigger a GitHub API poll (async, returns immediately with status)
        readBody((err, body) => {
          if (err) { sendErr(err.message, 'BAD_REQUEST'); return; }
          // Run async and respond immediately
          tracker.pollGitHubCopilotUsage(body.token).then(results => {
            sendOk({ polled: true, results, tokenUsed: !!body.token });
          }).catch(e => {
            sendErr(e.message, 'SERVER_ERROR', 500);
          });
        });
        return;
      }

      if (req.method === 'POST' && filePath === '/api/copilot/api-key') {
        // Store an API key for a provider
        readBody((err, body) => {
          if (err) { sendErr(err.message, 'BAD_REQUEST'); return; }
          try {
            const { provider, key } = body;
            if (!provider || !key) { sendErr('provider and key are required', 'BAD_REQUEST'); return; }
            const result = tracker.setApiKey(provider, key);
            sendOk(result);
          } catch (e) {
            sendErr(e.message, 'SERVER_ERROR', 500);
          }
        });
        return;
      }

      if (req.method === 'GET' && filePath === '/api/copilot/api-keys') {
        sendOk(tracker.listApiKeys());
        return;
      }

      if (req.method === 'DELETE' && filePath === '/api/copilot/api-key') {
        const urlParts = filePath.split('?');
        const params = {};
        (urlParts[1] || '').split('&').forEach(pair => {
          const [k, v] = pair.split('=');
          if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
        });
        const provider = params.provider;
        if (!provider) { sendErr('provider query param required', 'BAD_REQUEST'); return; }
        sendOk(tracker.removeApiKey(provider));
        return;
      }

      // POST /api/copilot/upload-csv — handle CSV file upload
      if (req.method === 'POST' && filePath === '/api/copilot/upload-csv') {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', async () => {
          const boundary = req.headers['content-type']?.match(/boundary=(.+)/)?.[1];
          if (!boundary) { sendErr('No boundary', 'BAD_REQUEST', 400); return; }
          const body = Buffer.concat(chunks).toString('binary');
          const parts = body.split(`--${boundary}`);
          let csvContent = null;
          for (const part of parts) {
            const match = part.match(/filename="([^"]+)"[\s\S]*?\r\n\r\n([\s\S]*?)\r\n$/);
            if (match) csvContent = match[2];
          }
          if (!csvContent) { sendErr('No CSV file found', 'BAD_REQUEST', 400); return; }

          // Parse CSV and update files
          try {
            const lines = csvContent.trim().split('\n');
            function parseCsvLine(line) {
              const result = [], current = '';
              let inQuote = false;
              for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === '"') inQuote = !inQuote;
                else if (ch === ',' && !inQuote) { result.push(current.trim()); current = ''; }
                else current += ch;
              }
              result.push(current.trim());
              return result;
            }
            const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
            const rows = [];
            for (let i = 1; i < lines.length; i++) {
              const vals = parseCsvLine(lines[i]);
              if (vals.length < headers.length) continue;
              const row = {};
              headers.forEach((h, idx) => row[h] = vals[idx] || '');
              rows.push(row);
            }

            const modelMap = { 'Claude Opus 4.6': 'claude-opus-4', 'Claude Sonnet 4.6': 'claude-sonnet-4-5', 'Code Review model': 'code-review', 'Coding Agent model': 'coding-agent', 'GPT-5.4 mini': 'gpt-5.4-mini', 'Gemini 3.1 Pro': 'gemini-3.1-pro' };
            const COSTS = { 'claude-opus-4': 5, 'claude-sonnet-4-5': 1, 'code-review': 1, 'coding-agent': 1, 'gpt-5.4-mini': 1, 'gemini-3.1-pro': 1 };
            const byModel = {}, byDate = {};
            let totalRequests = 0;
            rows.forEach(r => {
              const model = modelMap[r.model] || r.model.toLowerCase().replace(/\s+/g, '-');
              const qty = parseFloat(r.quantity) || 0;
              totalRequests += qty;
              byModel[model] = (byModel[model] || 0) + qty;
              byDate[r.date] = (byDate[r.date] || 0) + qty;
            });
            const totalPremiumCost = Object.entries(byModel).reduce((s, [m, qty]) => s + qty * (COSTS[m] || 1), 0);
            const providerUsage = { claude: 0, openai: 0, gemini: 0, unknown: 0 };
            Object.entries(byModel).forEach(([m, qty]) => {
              const p = m.includes('claude') ? 'claude' : m.includes('gpt') ? 'openai' : m.includes('gemini') ? 'gemini' : 'unknown';
              providerUsage[p] += qty * (COSTS[m] || 1);
            });

            // Update copilot-usage-db.json
            const dbPath = path.join(BASE_DIR, 'copilot-usage-db.json');
            let db = { quota: { total: 300, used: totalRequests, resetDate: '2026-04-01' }, history: [], modelPreference: 'balanced', providerUsage };
            try { db = JSON.parse(fs.readFileSync(dbPath, 'utf8')); } catch(e) {}
            const entries = rows.map((r, i) => {
              const model = modelMap[r.model] || r.model.toLowerCase().replace(/\s+/g, '-');
              const qty = parseFloat(r.quantity) || 0;
              return { id: 'g' + Date.now() + i, timestamp: new Date(r.date + 'T00:00:00Z').toISOString(), model, feature: 'chat', tokens: Math.round(qty * 1000), multiplier: COSTS[model] || 1, premiumCost: qty * (COSTS[model] || 1) };
            });
            db.history = entries;
            db.quota.used = totalRequests;
            db.quota.providerUsage = providerUsage;
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

            // Update public/copilot-data.json
            const pubDataPath = path.join(BASE_DIR, 'public', 'copilot-data.json');
            const usedPct = (totalRequests / 300 * 100).toFixed(1);
            const pubData = { _generatedAt: new Date().toISOString(), quota: { total: 300, used: totalRequests, remaining: parseFloat((300 - totalRequests).toFixed(2)), usedPercent: parseFloat(usedPct), dailyBudget: parseFloat(((300 - totalRequests) / 4).toFixed(2)), daysRemaining: 4, resetDate: '2026-04-01', warningLevel: 'normal', providerUsage }, analysis: { totalRequests, totalPremiumCost: parseFloat(totalPremiumCost.toFixed(2)), byModel, byDate, providerUsage } };
            fs.writeFileSync(pubDataPath, JSON.stringify(pubData, null, 2));

            sendOk({ success: true, message: 'CSV uploaded and processed', records: rows.length, totalRequests });
          } catch(e) {
            sendErr('Processing error: ' + e.message, 'PROCESSING_ERROR', 500);
          }
        });
        return;
      }

      sendErr('Copilot endpoint not found', 'NOT_FOUND', 404);
      return;
    } catch (err) {
      res.writeHead(500, headers);
      res.end(JSON.stringify({ success: false, error: { message: err.message, code: 'SERVER_ERROR' } }));
      return;
    }
  }

  // ============================================

  const fullPath = path.join(BASE_DIR, filePath);
  // Security: prevent path traversal
  if (!fullPath.startsWith(BASE_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('Not Found'); return;
    }
    const ext = path.extname(fullPath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

// --- WebSocket upgrade ---

server.on('upgrade', (req, socket, head) => {
  if (req.url !== '/ws') { socket.destroy(); return; }
  
  const key = req.headers['sec-websocket-key'];
  const accept = hashWebSocketKey(key);
  
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n` +
    '\r\n'
  );
  
  clients.add(socket);
  console.log(`[WS] Client connected (${clients.size} total)`);
  
  // Send current status immediately
  if (currentStatus) {
    socket.write(encodeFrame(JSON.stringify(currentStatus)));
  }
  
  socket.on('data', (buf) => {
    const opcode = buf[0] & 0x0f;
    if (opcode === 0x8) { // close
      clients.delete(socket);
      socket.end();
    }
    // ping → pong
    if (opcode === 0x9) {
      const pong = Buffer.from(buf);
      pong[0] = (pong[0] & 0xf0) | 0xa;
      socket.write(pong);
    }
  });
  
  socket.on('close', () => {
    clients.delete(socket);
    console.log(`[WS] Client disconnected (${clients.size} total)`);
  });
  
  socket.on('error', () => { clients.delete(socket); });
});

// --- Main loop ---

loadConfig();
// Watch config changes
fs.watchFile(path.join(BASE_DIR, 'config.json'), () => {
  console.log('[Config] Reloaded');
  loadConfig();
});


function poll() {
  const newStatus = buildStatus();
  const changed = JSON.stringify(newStatus.agents) !== JSON.stringify((currentStatus || {}).agents);
  currentStatus = newStatus;
  
  // Also write status.json for backward compatibility
  fs.writeFileSync(path.join(BASE_DIR, 'status.json'), JSON.stringify(newStatus, null, 2));
  
  if (changed && clients.size > 0) {
    console.log(`[Poll] Status changed, broadcasting to ${clients.size} clients`);
    broadcast(newStatus);
  }
}

poll(); // Initial
setInterval(poll, POLL_INTERVAL);

// ============================================================
// Phase 12: GitHub Copilot API Polling
// ============================================================
//
// Architecture:
//   - COPILOT_POLL_INTERVAL: How often to poll GitHub API (default: 1 hour)
//   - Uses the GitHub token from copilot-api-keys.json (githubToken field)
//     or GITHUB_TOKEN env var
//   - All known Copilot billing endpoints return 404 for personal tokens
//     because they require manage_billing:copilot scope
//
// Tested endpoints (all return 404 for math-lish token):
//   GET /user/copilot_billing              — 404 (needs manage_billing:copilot scope)
//   GET /user/copilot_subscription        — 404 (needs manage_billing:copilot scope)
//   GET /user/copilot/seats                — 404 (needs manage_billing:copilot scope)
//   GET /orgs/{org}/copilot/usage         — 404 (needs org admin)
//   GET /enterprise/{ent}/copilot/usage   — 404 (needs enterprise admin)
//
// Requirements for real data:
//   1. Token must have: manage_billing:copilot OAuth scope
//   2. Account must have: GitHub Copilot subscription
//   3. math-lish account is on "free" plan — no Copilot subscription
//
// The polling still runs to catch the endpoint if it becomes available.
// Results are stored in copilot-api-keys.json (lastGitHubSync, lastGitHubError)
// ============================================================

const COPILOT_POLL_INTERVAL = parseInt(process.env.COPILOT_POLL_INTERVAL || (60 * 60 * 1000)); // 1 hour

let copilotTracker = null;

function getCopilotTracker() {
  if (!copilotTracker) {
    const { CopilotUsageTracker } = require('./copilot-usage-api');
    copilotTracker = new CopilotUsageTracker();
  }
  return copilotTracker;
}

async function pollGitHubCopilot() {
  const tracker = getCopilotTracker();
  const apiKeys = tracker.loadApiKeys();
  const token   = apiKeys.githubToken || process.env.GITHUB_TOKEN;

  if (!token) {
    console.log('[CopilotPoll] No GitHub token configured — skipping poll');
    console.log('[CopilotPoll] To enable: node log-usage.js --api-key github <token>');
    return;
  }

  console.log(`[CopilotPoll] Polling GitHub Copilot API...`);
  const results = await tracker.pollGitHubCopilotUsage(token);

  let anySuccess = false;
  for (const [path, result] of Object.entries(results)) {
    if (result.status === 'success') {
      anySuccess = true;
      console.log(`[CopilotPoll] ✅ ${path} — returned data`);
    }
  }

  if (!anySuccess) {
    console.log(`[CopilotPoll] ❌ All endpoints returned errors (expected for personal tokens)`);
    // Log individual errors at debug level
    for (const [path, result] of Object.entries(results)) {
      if (result.error) {
        console.log(`[CopilotPoll]   ${path}: HTTP ${result.status} — ${result.error}`);
      }
    }
  }
}

// Initial poll after 30s (give server time to fully start)
setTimeout(pollGitHubCopilot, 30_000);
// Then poll on interval
setInterval(pollGitHubCopilot, COPILOT_POLL_INTERVAL);

// Initial GitHub Copilot status report (sync, for startup log)
(function reportGitHubStatus() {
  try {
    const tracker = getCopilotTracker();
    const apiKeys = tracker.loadApiKeys();
    console.log(`[CopilotPoll] GitHub token: ${apiKeys.githubToken ? 'configured' : 'not configured'}`);
    if (!apiKeys.githubToken) {
      console.log(`[CopilotPoll] Note: Set GITHUB_TOKEN env var or use: node log-usage.js --api-key github <token>`);
      console.log(`[CopilotPoll] math-lish token tested: all Copilot endpoints return 404`);
      console.log(`[CopilotPoll]   Reason: token lacks manage_billing:copilot scope + no Copilot subscription`);
    }
  } catch (e) {
    console.log(`[CopilotPoll] Could not load API keys: ${e.message}`);
  }
})();

server.listen(PORT, '0.0.0.0', () => {
  const online = (currentStatus?.agents || []).filter(a => a.status !== 'offline').length;
  const total = (currentStatus?.agents || []).length;
  console.log(`
🏢 OpenClaw Virtual Office Server
   http://localhost:${PORT}
   WebSocket: ws://localhost:${PORT}/ws
   API: http://localhost:${PORT}/api/status
   Agents: ${online}/${total} online
   Polling every ${POLL_INTERVAL / 1000}s
   Copilot polling every ${COPILOT_POLL_INTERVAL / 60000}min
`);
});
