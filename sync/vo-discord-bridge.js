/**
 * Virtual Office Sync - Discord Bridge
 * Connects Discord Bot to the sync server for bidirectional communication
 * 
 * This module adds VO sync capabilities to the Discord bot.
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'vo-config.json');

let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 3000;

let eventHandlers = {};
let voData = null;

// ==================== Connection Management ====================

function getConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (e) {}
  return { syncServerUrl: 'ws://localhost:18900/ws/discord' };
}

function connect() {
  const config = getConfig();
  const url = process.env.VO_SYNC_URL || config.syncServerUrl || 'ws://localhost:18900/ws/discord';

  console.log(`[VO-Bridge] Connecting to ${url}...`);

  try {
    ws = new WebSocket(url);

    ws.on('open', () => {
      console.log('[VO-Bridge] Connected to sync server');
      reconnectAttempts = 0;
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        handleMessage(msg);
      } catch (e) {
        console.error('[VO-Bridge] Error parsing message:', e.message);
      }
    });

    ws.on('close', () => {
      console.log('[VO-Bridge] Disconnected from sync server');
      ws = null;
      scheduleReconnect();
    });

    ws.on('error', (err) => {
      console.error('[VO-Bridge] WebSocket error:', err.message);
    });
  } catch (e) {
    console.error('[VO-Bridge] Failed to connect:', e.message);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    const delay = RECONNECT_DELAY * Math.min(reconnectAttempts, 5);
    console.log(`[VO-Bridge] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
    setTimeout(connect, delay);
  } else {
    console.log('[VO-Bridge] Max reconnection attempts reached');
  }
}

function send(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
    return true;
  }
  return false;
}

function isConnected() {
  return ws && ws.readyState === WebSocket.OPEN;
}

// ==================== Message Handling ====================

function handleMessage(msg) {
  const { _source, _action, type, data } = msg;

  // If message came from web, process it
  if (_source === 'web') {
    if (eventHandlers[_action]) {
      eventHandlers[_action](data);
    }
  }

  // Handle broadcast events
  if (type && data && eventHandlers[type]) {
    eventHandlers[type](data);
  }
}

// ==================== Event Registration ====================

function on(action, handler) {
  eventHandlers[action] = handler;
}

function off(action) {
  delete eventHandlers[action];
}

// ==================== Broadcast Functions (Discord → Web) ====================

// Status broadcast
function broadcastStatusUpdate(userId, status) {
  send({
    type: 'status_update',
    data: {
      userId,
      ...status,
      updatedAt: Date.now(),
    },
  });
}

// Poll broadcast
function broadcastPollCreated(poll) {
  send({
    type: 'poll_created',
    data: poll,
  });
}

function broadcastPollVote(poll) {
  send({
    type: 'poll_updated',
    data: poll,
  });
}

function broadcastPollClosed(poll) {
  send({
    type: 'poll_closed',
    data: poll,
  });
}

// Mood broadcast
function broadcastMoodEntry(entry) {
  send({
    type: 'mood_added',
    data: entry,
  });
}

// Pomodoro broadcast
function broadcastPomodoroStart(session) {
  send({
    type: 'pomodoro_started',
    data: session,
  });
}

function broadcastPomodoroStop(session) {
  send({
    type: 'pomodoro_stopped',
    data: session,
  });
}

function broadcastPomodoroTick(sessions) {
  send({
    type: 'pomodoro_tick',
    data: sessions,
  });
}

// Reminder broadcast
function broadcastReminderAdded(reminder) {
  send({
    type: 'reminder_added',
    data: reminder,
  });
}

function broadcastReminderTriggered(reminder) {
  send({
    type: 'reminder_triggered',
    data: reminder,
  });
}

// Points broadcast
function broadcastPointsUpdate(userId, points) {
  send({
    type: 'points_updated',
    data: { userId, points },
  });
}

function broadcastBadgeAwarded(userId, badge) {
  send({
    type: 'badge_awarded',
    data: { userId, badge },
  });
}

// Whiteboard broadcast
function broadcastWhiteboardUpdate(page) {
  send({
    type: 'whiteboard_updated',
    data: page,
  });
}

// Forum broadcast
function broadcastForumPost(post) {
  send({
    type: 'forum_post_created',
    data: post,
  });
}

function broadcastForumReply(post) {
  send({
    type: 'forum_reply_added',
    data: post,
  });
}

// Standup broadcast
function broadcastStandupSubmitted(standup) {
  send({
    type: 'standup_submitted',
    data: standup,
  });
}

// General broadcast
function broadcast(eventType, data) {
  send({
    type: eventType,
    data,
    timestamp: Date.now(),
  });
}

// ==================== Data Sync Functions ====================

// Request current state from web (when bot starts)
function requestSync() {
  send({
    type: 'sync_request',
    timestamp: Date.now(),
  });
}

// Send full state to web (when requested)
function sendFullState(state) {
  send({
    type: 'full_state',
    data: state,
    timestamp: Date.now(),
  });
}

// ==================== Integration with Discord Bot ====================

// This function should be called by the Discord bot to integrate the bridge
function integrateWithDiscordBot(bot) {
  console.log('[VO-Bridge] Integrating with Discord bot...');

  // Override/add bot methods to broadcast events

  const originalOn = bot.on.bind(bot);
  bot.on = function(...args) {
    // Capture messageCreate for command handling
    if (args[0] === 'messageCreate') {
      const originalHandler = args[1];
      args[1] = async (...msgArgs) => {
        await originalHandler(...msgArgs);
        // After message processing, sync state
        checkAndSyncState(msgArgs[0]);
      };
    }
    return originalOn(...args);
  };

  // Start connection
  connect();

  return {
    connect,
    disconnect: () => ws?.close(),
    isConnected,
    send,
    on,
    off,
    broadcast,
    broadcastStatusUpdate,
    broadcastPollCreated,
    broadcastPollVote,
    broadcastPollClosed,
    broadcastMoodEntry,
    broadcastPomodoroStart,
    broadcastPomodoroStop,
    broadcastPomodoroTick,
    broadcastReminderAdded,
    broadcastReminderTriggered,
    broadcastPointsUpdate,
    broadcastBadgeAwarded,
    broadcastWhiteboardUpdate,
    broadcastForumPost,
    broadcastForumReply,
    broadcastStandupSubmitted,
    requestSync,
    sendFullState,
  };
}

// Check state after message and sync if needed
let lastSyncTime = 0;
async function checkAndSyncState(message) {
  const now = Date.now();
  if (now - lastSyncTime < 5000) return; // Throttle to once per 5 seconds
  lastSyncTime = now;

  // The actual sync logic depends on the Discord bot's state
  // This is called after any message is processed
}

// ==================== Standalone Mode (without Discord bot) ====================

// For running as standalone that reads from discord-bot.js data files
function startStandalone(dataDir) {
  console.log('[VO-Bridge] Starting in standalone mode...');
  connect();

  // Poll data files and sync changes
  const dataFiles = [
    'status-db.json',
    'poll-db.json',
    'phase6-data.json',
    'phase-pomodoro.json',
    'vo-status-db.json',
  ];

  let lastStates = {};

  const pollInterval = setInterval(() => {
    if (!isConnected()) return;

    for (const file of dataFiles) {
      const filePath = path.join(dataDir || __dirname, '..', file);
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const state = JSON.stringify(content);
          
          if (state !== lastStates[file]) {
            lastStates[file] = state;
            // Parse and broadcast changes
            try {
              const data = JSON.parse(content);
              broadcast(file.replace('.json', '').replace(/-/g, '_') + '_update', data);
            } catch (e) {}
          }
        }
      } catch (e) {}
    }
  }, 3000);

  return {
    stop: () => {
      clearInterval(pollInterval);
      ws?.close();
    },
  };
}

// ==================== Module Exports ====================

module.exports = {
  connect,
  disconnect: () => ws?.close(),
  isConnected,
  send,
  on,
  off,
  broadcast,
  broadcastStatusUpdate,
  broadcastPollCreated,
  broadcastPollVote,
  broadcastPollClosed,
  broadcastMoodEntry,
  broadcastPomodoroStart,
  broadcastPomodoroStop,
  broadcastPomodoroTick,
  broadcastReminderAdded,
  broadcastReminderTriggered,
  broadcastPointsUpdate,
  broadcastBadgeAwarded,
  broadcastWhiteboardUpdate,
  broadcastForumPost,
  broadcastForumReply,
  broadcastStandupSubmitted,
  requestSync,
  sendFullState,
  integrateWithDiscordBot,
  startStandalone,
};
