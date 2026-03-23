/**
 * Virtual Office Sync - Frontend WebSocket Client
 * Website-side client for connecting to the VO sync server
 * 
 * Usage:
 *   const voClient = new VOSyncClient();
 *   voClient.connect('ws://localhost:18900/ws/vo');
 *   
 *   voClient.on('status_update', (data) => updateStatusUI(data));
 *   voClient.on('poll_created', (data) => showNewPoll(data));
 *   
 *   voClient.send({ action: 'status.update', userId: '123', status: 'working', task: 'Coding' });
 */

class VOSyncClient {
  constructor(options = {}) {
    this.ws = null;
    this.url = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.reconnectDelay = options.reconnectDelay || 3000;
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.listeners = {};
    this.connected = false;
    this.initialData = null;
    this.pendingMessages = [];
    this.userId = options.userId || 'web-user';
    this._lastPong = 0;

    // Auto-connect if URL provided
    if (options.url) {
      this.connect(options.url);
    }
  }

  // ==================== Connection ====================

  connect(url) {
    this.url = url || 'ws://localhost:18900/ws/vo';
    console.log('[VO-Client] Connecting to', this.url);
    
    try {
      this.ws = new WebSocket(this.url, [], {
        headers: {
          'X-Client-Type': 'web',
        }
      });

      this.ws.onopen = () => {
        console.log('[VO-Client] Connected');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        this.startPing();
        
        // Send pending messages
        while (this.pendingMessages.length > 0) {
          const msg = this.pendingMessages.shift();
          this.send(msg);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error('[VO-Client] Error parsing message:', e);
        }
      };

      this.ws.onclose = (event) => {
        console.log('[VO-Client] Disconnected', event.code, event.reason);
        this.connected = false;
        this.emit('disconnected', { code: event.code, reason: event.reason });
        this.stopPing();
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[VO-Client] WebSocket error:', error);
        this.emit('error', error);
      };
    } catch (e) {
      console.error('[VO-Client] Connection error:', e);
      this.scheduleReconnect();
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPing();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.connected = false;
  }

  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 5);
      console.log(`[VO-Client] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      this.reconnectTimer = setTimeout(() => this.connect(this.url), delay);
    } else {
      console.log('[VO-Client] Max reconnection attempts reached');
      this.emit('reconnect_failed');
    }
  }

  // ==================== Messaging ====================

  send(data) {
    const message = { ...data, _from: this.userId };
    
    if (!this.connected || this.ws.readyState !== WebSocket.OPEN) {
      console.log('[VO-Client] Not connected, queuing message');
      this.pendingMessages.push(message);
      return false;
    }

    this.ws.send(JSON.stringify(message));
    return true;
  }

  handleMessage(data) {
    // Store initial data on first message
    if (data.type === 'init' && data.data) {
      this.initialData = data.data;
      this.emit('init', data.data);
    }

    // Emit specific event
    if (data.type) {
      this.emit(data.type, data);
    }

    // Emit action-specific event
    if (data._action) {
      this.emit(data._action, data);
    }

    // Emit pong
    if (data.type === 'pong') {
      this._lastPong = Date.now();
      this.emit('pong', data);
    }

    // Generic message event
    this.emit('message', data);
  }

  // ==================== Ping/Pong ====================

  startPing() {
    this.pingTimer = setInterval(() => {
      if (this.connected) {
        this.send({ action: 'ping' });
      }
    }, 30000);
  }

  stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  // ==================== Event System ====================

  on(event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
    return this;
  }

  off(event, handler) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(h => h !== handler);
    }
    return this;
  }

  once(event, handler) {
    const wrapper = (data) => {
      handler(data);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(handler => {
        try {
          handler(data);
        } catch (e) {
          console.error(`[VO-Client] Error in ${event} handler:`, e);
        }
      });
    }
  }

  // ==================== Convenience Methods ====================

  // Status
  updateStatus(status, task, emoji) {
    return this.send({
      action: 'status.update',
      userId: this.userId,
      status,
      task,
      emoji,
    });
  }

  getStatus() {
    return this.send({ action: 'status.get' });
  }

  // Standup
  submitStandup(yesterday, today, blockers, week = null) {
    return this.send({
      action: 'standup.submit',
      userId: this.userId,
      yesterday,
      today,
      blockers,
      week: week || this.getWeekString(),
    });
  }

  getStandups(week = null) {
    return this.send({
      action: 'standup.get',
      week: week || this.getWeekString(),
    });
  }

  // Poll
  createPoll(question, options, duration = null, anonymous = false, allowMultiple = false) {
    return this.send({
      action: 'poll.create',
      question,
      options,
      duration,
      anonymous,
      allowMultiple,
      author: this.userId,
    });
  }

  vote(pollId, optionId) {
    return this.send({
      action: 'poll.vote',
      pollId,
      optionId,
      userId: this.userId,
    });
  }

  closePoll(pollId) {
    return this.send({
      action: 'poll.close',
      pollId,
    });
  }

  getPolls() {
    return this.send({ action: 'poll.list' });
  }

  // Mood
  submitMood(score, note = '', weather = null) {
    return this.send({
      action: 'mood.submit',
      userId: this.userId,
      score,
      note,
      weather,
    });
  }

  getMood() {
    return this.send({ action: 'mood.get' });
  }

  // Pomodoro
  startPomodoro(task, type = 'work', duration = 25 * 60 * 1000) {
    return this.send({
      action: 'pomodoro.start',
      userId: this.userId,
      task,
      type,
      duration,
    });
  }

  stopPomodoro() {
    return this.send({
      action: 'pomodoro.stop',
      userId: this.userId,
    });
  }

  updatePomodoroProgress(remainingMs) {
    return this.send({
      action: 'pomodoro.update',
      userId: this.userId,
      remainingMs,
    });
  }

  getPomodoroSessions() {
    return this.send({ action: 'pomodoro.list' });
  }

  // Reminders
  addReminder(content, remindAt = null, repeat = null) {
    return this.send({
      action: 'reminder.add',
      userId: this.userId,
      content,
      remindAt: remindAt || Date.now() + 60 * 60 * 1000,
      repeat,
    });
  }

  completeReminder(reminderId) {
    return this.send({
      action: 'reminder.complete',
      reminderId,
    });
  }

  getReminders() {
    return this.send({ action: 'reminder.list' });
  }

  // Points
  getPoints() {
    return this.send({
      action: 'points.get',
      userId: this.userId,
    });
  }

  getLeaderboard() {
    return this.send({ action: 'points.leaderboard' });
  }

  // Badges
  getBadges() {
    return this.send({
      action: 'badges.get',
      userId: this.userId,
    });
  }

  // Whiteboard
  getWhiteboardPage(pageId = 'default') {
    return this.send({
      action: 'whiteboard.get',
      pageId,
    });
  }

  addWhiteboardItem(itemType, text, color = '#ffffff', x = 0, y = 0, pageId = 'default') {
    return this.send({
      action: 'whiteboard.add',
      pageId,
      itemType,
      text,
      color,
      x,
      y,
    });
  }

  getWhiteboardPages() {
    return this.send({ action: 'whiteboard.pages' });
  }

  createWhiteboardPage(name) {
    return this.send({
      action: 'whiteboard.create_page',
      name,
    });
  }

  // Forum
  getForumPosts(categoryId = null) {
    return this.send({
      action: 'forum.posts',
      categoryId,
    });
  }

  createForumPost(title, content, categoryId = null) {
    return this.send({
      action: 'forum.create_post',
      title,
      content,
      categoryId,
      author: this.userId,
    });
  }

  replyToForumPost(postId, content) {
    return this.send({
      action: 'forum.reply',
      postId,
      content,
      author: this.userId,
    });
  }

  // Templates
  getTemplates(category = null) {
    return this.send({
      action: 'templates.get',
      category,
    });
  }

  useTemplate(templateId) {
    return this.send({
      action: 'templates.use',
      templateId,
    });
  }

  // Stats
  getStats(range = 'daily', type = null) {
    return this.send({
      action: 'stats.get',
      range,
      type,
    });
  }

  // Calendar
  getCalendar() {
    return this.send({ action: 'calendar.get' });
  }

  addCalendarEvent(event) {
    return this.send({
      action: 'calendar.add',
      ...event,
    });
  }

  // Config
  getConfig() {
    return this.send({ action: 'config.get' });
  }

  // ==================== Utilities ====================

  getWeekString(date = new Date()) {
    const yearStart = new Date(date.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((date - yearStart) / 86400000 + yearStart.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
  }

  getInitialData() {
    return this.initialData;
  }

  isConnected() {
    return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  getLatency() {
    if (this._lastPong) {
      return Date.now() - this._lastPong;
    }
    return null;
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VOSyncClient;
} else if (typeof window !== 'undefined') {
  window.VOSyncClient = VOSyncClient;
}
