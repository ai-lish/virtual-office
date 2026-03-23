/**
 * Virtual Office Sync - WebSocket + API Server
 * Handles real-time bidirectional sync between Discord Bot and Website
 * 
 * Flow:
 * - Discord Bot sends state changes → Server broadcasts to website clients
 * - Website sends actions → Server forwards to Discord Bot
 * - All data goes through shared JSON database
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const voData = require('./vo-data-manager');

const PORT = parseInt(process.env.VO_SYNC_PORT || '18900');
const BASE_DIR = __dirname;

// ==================== WebSocket Utilities ====================

function hashWebSocketKey(key) {
  const crypto = require('crypto');
  return crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-A5AB53DC65B4')
    .digest('base64');
}

function encodeFrame(data) {
  const payload = Buffer.from(JSON.stringify(data));
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81;
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

// ==================== Client Management ====================

const wsClients = new Set();
const discordClient = { connected: false, socket: null };

function broadcastToWeb(data) {
  const frame = encodeFrame(data);
  let count = 0;
  for (const client of wsClients) {
    try {
      client.write(frame);
      count++;
    } catch (e) {
      wsClients.delete(client);
    }
  }
  return count;
}

function broadcastToDiscord(data) {
  if (discordClient.socket) {
    try {
      discordClient.socket.write(encodeFrame(data));
      return true;
    } catch (e) {
      console.error('[VO-Sync] Error sending to Discord:', e.message);
    }
  }
  return false;
}

// ==================== Action Handlers ====================

const actionHandlers = {
  // Status actions
  'status.update': (data) => {
    voData.setMemberStatus(data.userId, {
      status: data.status,
      task: data.task,
      emoji: data.emoji,
    });
    return { success: true, type: 'status_update', data: voData.getStatus() };
  },

  'status.get': () => {
    return { success: true, type: 'status_list', data: voData.getAllMemberStatuses() };
  },

  // Standup actions
  'standup.submit': (data) => {
    const standup = voData.addStandup({
      userId: data.userId,
      yesterday: data.yesterday,
      today: data.today,
      blockers: data.blockers,
      week: data.week,
    });
    voData.incrementStat('standup', 'submitted');
    return { success: true, type: 'standup_added', data: standup };
  },

  'standup.get': (data) => {
    return { success: true, type: 'standup_list', data: voData.getStandups(data.week) };
  },

  // Poll actions
  'poll.create': (data) => {
    const poll = voData.createPoll({
      question: data.question,
      options: data.options,
      author: data.author,
      duration: data.duration,
      anonymous: data.anonymous,
      allowMultiple: data.allowMultiple,
    });
    voData.incrementStat('poll', 'created');
    return { success: true, type: 'poll_created', data: poll };
  },

  'poll.vote': (data) => {
    const poll = voData.vote(data.pollId, data.optionId, data.userId);
    if (poll) {
      voData.incrementStat('poll', 'votes');
      return { success: true, type: 'poll_updated', data: poll };
    }
    return { success: false, error: 'Poll not found or closed' };
  },

  'poll.close': (data) => {
    const poll = voData.closePoll(data.pollId);
    return { success: true, type: 'poll_closed', data: poll };
  },

  'poll.list': () => {
    return { success: true, type: 'poll_list', data: voData.getPolls() };
  },

  // Mood actions
  'mood.submit': (data) => {
    const entry = voData.addMoodEntry({
      userId: data.userId,
      score: data.score,
      note: data.note,
      weather: data.weather,
    });
    voData.incrementStat('mood', 'submitted');
    return { success: true, type: 'mood_added', data: entry, teamStats: voData.get('mood').teamStats };
  },

  'mood.get': () => {
    return { success: true, type: 'mood_data', data: voData.getMoodHistory(), teamStats: voData.get('mood').teamStats };
  },

  // Pomodoro actions
  'pomodoro.start': (data) => {
    const session = voData.startPomodoro({
      userId: data.userId,
      task: data.task,
      type: data.type,
      duration: data.duration,
    });
    voData.incrementStat('pomodoro', 'started');
    return { success: true, type: 'pomodoro_started', data: session };
  },

  'pomodoro.stop': (data) => {
    const session = voData.stopPomodoro(data.userId);
    if (session) {
      voData.incrementStat('pomodoro', 'completed');
      return { success: true, type: 'pomodoro_stopped', data: session };
    }
    return { success: false, error: 'No active session' };
  },

  'pomodoro.update': (data) => {
    voData.updatePomodoroProgress(data.userId, data.remainingMs);
    return { success: true };
  },

  'pomodoro.list': () => {
    return { success: true, type: 'pomodoro_list', data: voData.getPomodoroSessions() };
  },

  // Reminder actions
  'reminder.add': (data) => {
    const reminder = voData.addReminder({
      userId: data.userId,
      content: data.content,
      remindAt: data.remindAt,
      repeat: data.repeat,
    });
    return { success: true, type: 'reminder_added', data: reminder };
  },

  'reminder.complete': (data) => {
    const reminder = voData.completeReminder(data.reminderId);
    return { success: true, type: 'reminder_completed', data: reminder };
  },

  'reminder.list': () => {
    return { success: true, type: 'reminder_list', data: voData.getActiveReminders() };
  },

  // Points actions
  'points.get': (data) => {
    const points = voData.getPoints(data.userId);
    return { success: true, type: 'points_data', data: points };
  },

  'points.leaderboard': () => {
    return { success: true, type: 'leaderboard', data: voData.getLeaderboard() };
  },

  // Badges actions
  'badges.get': (data) => {
    return { success: true, type: 'badges_data', data: voData.getBadges(data.userId), allBadges: voData.getAllBadges() };
  },

  // Whiteboard actions
  'whiteboard.get': (data) => {
    const page = voData.getWhiteboardPage(data.pageId);
    return { success: true, type: 'whiteboard_page', data: page };
  },

  'whiteboard.add': (data) => {
    const page = voData.addWhiteboardContent(data.pageId, {
      type: data.itemType,
      text: data.text,
      color: data.color,
      x: data.x,
      y: data.y,
    });
    return { success: true, type: 'whiteboard_updated', data: page };
  },

  'whiteboard.pages': () => {
    return { success: true, type: 'whiteboard_pages', data: voData.getAllWhiteboardPages() };
  },

  'whiteboard.create_page': (data) => {
    const page = voData.createWhiteboardPage(data.name);
    return { success: true, type: 'whiteboard_page_created', data: page };
  },

  // Forum actions
  'forum.posts': (data) => {
    return { success: true, type: 'forum_posts', data: voData.getForumPosts(data.categoryId) };
  },

  'forum.create_post': (data) => {
    const post = voData.createForumPost({
      title: data.title,
      content: data.content,
      author: data.author,
      categoryId: data.categoryId,
    });
    return { success: true, type: 'forum_post_created', data: post };
  },

  'forum.reply': (data) => {
    const post = voData.addForumReply(data.postId, {
      content: data.content,
      author: data.author,
    });
    return { success: true, type: 'forum_post_updated', data: post };
  },

  // Template actions
  'templates.get': (data) => {
    return { success: true, type: 'templates_list', data: voData.getTemplates(data.category) };
  },

  'templates.use': (data) => {
    const template = voData.incrementTemplateUse(data.templateId);
    return { success: true, type: 'template_used', data: template };
  },

  // Stats actions
  'stats.get': (data) => {
    return { success: true, type: 'stats_data', data: voData.getStats(data.range, data.type) };
  },

  // Calendar actions
  'calendar.get': () => {
    return { success: true, type: 'calendar_data', data: voData.get('calendar').events };
  },

  'calendar.add': (data) => {
    voData.get('calendar').events.push({
      id: `event-${Date.now()}`,
      ...data,
      createdAt: Date.now(),
    });
    voData.save('calendar');
    return { success: true, type: 'calendar_updated', data: voData.get('calendar').events };
  },

  // Config actions
  'config.get': () => {
    return { success: true, type: 'config_data', data: voData.getConfig() };
  },

  // Ping
  'ping': () => {
    return { success: true, type: 'pong', timestamp: Date.now() };
  },
};

// ==================== HTTP Server ====================

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let url = req.url.split('?')[0];

  // API endpoint for website actions
  if (url.startsWith('/api/vo/')) {
    const endpoint = url.replace('/api/vo/', '');
    
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = body ? JSON.parse(body) : {};
        const action = endpoint.replace(/\//g, '.');
        
        if (actionHandlers[action]) {
          const result = actionHandlers[action](data);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
          
          // Broadcast to all web clients
          broadcastToWeb({
            ...result,
            _source: 'api',
            _action: action,
            _timestamp: Date.now(),
          });
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Unknown action' }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // REST-style endpoints
  if (url === '/api/vo/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: voData.getAllMemberStatuses() }));
    return;
  }

  if (url === '/api/vo/poll' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: voData.getPolls() }));
    return;
  }

  if (url === '/api/vo/mood' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: voData.getMoodHistory(), teamStats: voData.get('mood').teamStats }));
    return;
  }

  if (url === '/api/vo/pomodoro' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: voData.getPomodoroSessions() }));
    return;
  }

  if (url === '/api/vo/leaderboard' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: voData.getLeaderboard() }));
    return;
  }

  // Serve static UI files
  if (url === '/' || url === '/index.html') {
    url = '/vo-sync-ui.html';
  }

  const fullPath = path.join(BASE_DIR, 'ui', url.replace(/^\/ui\//, ''));
  const staticPath = path.join(BASE_DIR, url);

  let filePath = fullPath;
  if (!fs.existsSync(fullPath)) {
    filePath = staticPath;
  }

  // Security check
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Try index.html
      fs.readFile(path.join(BASE_DIR, 'index.html'), (err2, data2) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(data2);
        }
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

// ==================== WebSocket Upgrade ====================

server.on('upgrade', (req, socket, head) => {
  const clientType = req.headers['x-client-type'] || 'web';

  if (req.url === '/ws/vo') {
    const key = req.headers['sec-websocket-key'];
    const accept = hashWebSocketKey(key);

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n` +
      '\r\n'
    );

    wsClients.add(socket);
    console.log(`[VO-Sync] Web client connected (${wsClients.size} total)`);

    // Send initial state
    socket.write(encodeFrame({
      type: 'init',
      data: {
        status: voData.getStatus(),
        polls: voData.getPolls(),
        mood: { entries: voData.getMoodHistory(), teamStats: voData.get('mood').teamStats },
        pomodoro: voData.getPomodoroSessions(),
        reminders: voData.getActiveReminders(),
        leaderboard: voData.getLeaderboard(),
        config: voData.getConfig(),
      },
      timestamp: Date.now(),
    }));

    socket.on('data', (buf) => {
      try {
        const msg = decodeFrame(buf);
        if (!msg) return;

        const data = JSON.parse(msg);
        const opcode = buf[0] & 0x0f;

        // Handle close
        if (opcode === 0x8) {
          wsClients.delete(socket);
          socket.end();
          return;
        }

        // Handle ping
        if (opcode === 0x9) {
          const pong = Buffer.from(buf);
          pong[0] = (pong[0] & 0xf0) | 0xa;
          socket.write(pong);
          return;
        }

        // Handle message
        if (data.action && actionHandlers[data.action]) {
          const result = actionHandlers[data.action](data);
          
          // Send response back
          socket.write(encodeFrame({
            ...result,
            _source: clientType,
            _action: data.action,
            _timestamp: Date.now(),
          }));

          // Broadcast to other clients
          const broadcastData = {
            ...result,
            _source: clientType,
            _action: data.action,
            _timestamp: Date.now(),
          };
          for (const client of wsClients) {
            if (client !== socket) {
              try {
                client.write(encodeFrame(broadcastData));
              } catch (e) {
                wsClients.delete(client);
              }
            }
          }

          // Also forward to Discord if needed
          if (['status.update', 'standup.submit', 'poll.create', 'poll.vote', 'poll.close',
               'mood.submit', 'pomodoro.start', 'pomodoro.stop', 'reminder.add', 'reminder.complete',
               'whiteboard.add', 'forum.create_post', 'forum.reply'].includes(data.action)) {
            broadcastToDiscord({
              ...broadcastData,
              _from: 'web',
            });
          }
        }
      } catch (e) {
        console.error('[VO-Sync] Error handling message:', e.message);
      }
    });

    socket.on('close', () => {
      wsClients.delete(socket);
      console.log(`[VO-Sync] Web client disconnected (${wsClients.size} total)`);
    });

    socket.on('error', () => {
      wsClients.delete(socket);
    });
  }
  // Discord bot connection
  else if (req.url === '/ws/discord') {
    const key = req.headers['sec-websocket-key'];
    const accept = hashWebSocketKey(key);

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n` +
      '\r\n'
    );

    discordClient.connected = true;
    discordClient.socket = socket;
    console.log('[VO-Sync] Discord bot connected');

    socket.on('data', (buf) => {
      try {
        const msg = decodeFrame(buf);
        if (!msg) return;

        const data = JSON.parse(msg);

        // Broadcast Discord events to all web clients
        broadcastToWeb({
          ...data,
          _source: 'discord',
          _timestamp: Date.now(),
        });
      } catch (e) {
        console.error('[VO-Sync] Error handling Discord message:', e.message);
      }
    });

    socket.on('close', () => {
      discordClient.connected = false;
      discordClient.socket = null;
      console.log('[VO-Sync] Discord bot disconnected');
    });

    socket.on('error', () => {
      discordClient.connected = false;
      discordClient.socket = null;
    });
  } else {
    socket.destroy();
  }
});

// ==================== Data Change Listeners ====================

// When data changes, broadcast to all web clients
voData.on('status', (data) => {
  broadcastToWeb({ type: 'status_update', data, timestamp: Date.now() });
});

voData.on('poll', (data) => {
  broadcastToWeb({ type: 'poll_update', data, timestamp: Date.now() });
});

voData.on('mood', (data) => {
  broadcastToWeb({ type: 'mood_update', data, timestamp: Date.now() });
});

voData.on('pomodoro', (data) => {
  broadcastToWeb({ type: 'pomodoro_update', data, timestamp: Date.now() });
});

voData.on('reminder', (data) => {
  broadcastToWeb({ type: 'reminder_update', data, timestamp: Date.now() });
});

voData.on('points', (data) => {
  broadcastToWeb({ type: 'points_update', data, timestamp: Date.now() });
});

voData.on('whiteboard', (data) => {
  broadcastToWeb({ type: 'whiteboard_update', data, timestamp: Date.now() });
});

voData.on('forum', (data) => {
  broadcastToWeb({ type: 'forum_update', data, timestamp: Date.now() });
});

// ==================== Start Server ====================

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
🔄 Virtual Office Sync Server
   HTTP API: http://localhost:${PORT}/api/vo/
   WebSocket: ws://localhost:${PORT}/ws/vo
   Discord Bot: ws://localhost:${PORT}/ws/discord
   Features: ${Object.entries(voData.getConfig().features).filter(([k,v]) => v).length} enabled
`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[VO-Sync] Shutting down...');
  server.close();
  process.exit(0);
});

module.exports = { server, voData, broadcastToWeb, broadcastToDiscord };
