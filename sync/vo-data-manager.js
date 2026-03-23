/**
 * Virtual Office Sync - Shared Data Manager
 * Manages the shared JSON database structure for Discord ↔ Website sync
 * 
 * All features read/write through this module for data consistency.
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = __dirname;

// Data file paths
const DATA_FILES = {
  status: path.join(BASE_DIR, 'vo-status-db.json'),
  standup: path.join(BASE_DIR, 'vo-standup-db.json'),
  poll: path.join(BASE_DIR, 'vo-poll-db.json'),
  mood: path.join(BASE_DIR, 'vo-mood-db.json'),
  pomodoro: path.join(BASE_DIR, 'vo-pomodoro-db.json'),
  reminder: path.join(BASE_DIR, 'vo-reminder-db.json'),
  points: path.join(BASE_DIR, 'vo-points-db.json'),
  badges: path.join(BASE_DIR, 'vo-badges-db.json'),
  calendar: path.join(BASE_DIR, 'vo-calendar-db.json'),
  whiteboard: path.join(BASE_DIR, 'vo-whiteboard-db.json'),
  forum: path.join(BASE_DIR, 'vo-forum-db.json'),
  templates: path.join(BASE_DIR, 'vo-templates-db.json'),
  stats: path.join(BASE_DIR, 'vo-stats-db.json'),
  config: path.join(BASE_DIR, 'vo-config.json'),
};

// Default data structures
const DEFAULTS = {
  status: {
    members: {},
    lastUpdated: null,
  },
  standup: {
    standups: [],
    currentWeek: null,
  },
  poll: {
    polls: [],
    votes: {},
  },
  mood: {
    entries: [],
    teamStats: { average: 3, count: 0, trend: 'stable' },
  },
  pomodoro: {
    activeSessions: {},
    history: [],
    stats: {},
  },
  reminder: {
    reminders: [],
    triggered: [],
  },
  points: {
    users: {},
    transactions: [],
  },
  badges: {
    badges: {},
    userBadges: {},
  },
  calendar: {
    events: [],
    lastSync: null,
  },
  whiteboard: {
    pages: { default: { id: 'default', name: '默認白板', content: [], createdAt: Date.now() } },
    currentPage: 'default',
  },
  forum: {
    categories: [],
    posts: [],
  },
  templates: {
    templates: [],
    recentUse: {},
  },
  stats: {
    daily: {},
    weekly: {},
    monthly: {},
    allTime: {},
  },
  config: {
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

// ==================== Data Layer ====================

class VODataManager {
  constructor() {
    this.data = {};
    this.listeners = {};
    this.init();
  }

  init() {
    // Ensure all data files exist
    for (const [key, filePath] of Object.entries(DATA_FILES)) {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(DEFAULTS[key] || {}, null, 2));
      }
      this.data[key] = this.load(key);
    }
    console.log('[VO-Data] Initialized with keys:', Object.keys(DATA_FILES).join(', '));
  }

  load(key) {
    try {
      return JSON.parse(fs.readFileSync(DATA_FILES[key], 'utf8'));
    } catch (e) {
      console.error(`[VO-Data] Error loading ${key}:`, e.message);
      return DEFAULTS[key] || {};
    }
  }

  save(key) {
    try {
      fs.writeFileSync(DATA_FILES[key], JSON.stringify(this.data[key], null, 2));
      this.emit(key, this.data[key]);
    } catch (e) {
      console.error(`[VO-Data] Error saving ${key}:`, e.message);
    }
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    this.data[key] = value;
    this.save(key);
    return value;
  }

  update(key, updater) {
    this.data[key] = updater(this.data[key]);
    this.save(key);
    return this.data[key];
  }

  // ==================== Listeners ====================

  on(key, callback) {
    if (!this.listeners[key]) this.listeners[key] = [];
    this.listeners[key].push(callback);
  }

  off(key, callback) {
    if (this.listeners[key]) {
      this.listeners[key] = this.listeners[key].filter(cb => cb !== callback);
    }
  }

  emit(key, data) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(cb => cb(data));
    }
  }

  // ==================== Helper Methods ====================

  // Status
  getStatus() {
    return this.data.status;
  }

  setMemberStatus(userId, status) {
    this.data.status.members[userId] = {
      ...status,
      updatedAt: Date.now(),
    };
    this.data.status.lastUpdated = Date.now();
    this.save('status');
    return this.data.status.members[userId];
  }

  getMemberStatus(userId) {
    return this.data.status.members[userId] || null;
  }

  getAllMemberStatuses() {
    return Object.entries(this.data.status.members).map(([id, data]) => ({
      id,
      ...data,
    }));
  }

  // Standup
  addStandup(standup) {
    this.data.standup.standups.push({
      ...standup,
      id: `standup-${Date.now()}`,
      createdAt: Date.now(),
    });
    this.save('standup');
    return this.data.standup.standups[this.data.standup.standups.length - 1];
  }

  getStandups(week = null) {
    if (!week) return this.data.standup.standups;
    return this.data.standup.standups.filter(s => s.week === week);
  }

  // Poll
  createPoll(poll) {
    const newPoll = {
      id: `poll-${Date.now()}`,
      question: poll.question,
      options: poll.options.map((text, i) => ({ id: i, text, votes: 0, voters: [] })),
      author: poll.author || 'system',
      channelId: poll.channelId || null,
      guildId: poll.guildId || null,
      createdAt: Date.now(),
      endsAt: poll.duration ? Date.now() + poll.duration : null,
      closed: false,
      anonymous: poll.anonymous || false,
      allowMultiple: poll.allowMultiple || false,
    };
    this.data.poll.polls.push(newPoll);
    this.save('poll');
    return newPoll;
  }

  vote(pollId, optionId, userId) {
    const poll = this.data.poll.polls.find(p => p.id === pollId);
    if (!poll || poll.closed) return null;

    // Remove previous vote if exists
    for (const opt of poll.options) {
      opt.voters = opt.voters.filter(v => v !== userId);
      opt.votes = opt.voters.length;
    }

    // Add new vote
    const option = poll.options.find(o => o.id === optionId);
    if (option) {
      if (!option.voters.includes(userId)) {
        option.voters.push(userId);
        option.votes = option.voters.length;
      }
    }

    this.save('poll');
    return poll;
  }

  closePoll(pollId) {
    const poll = this.data.poll.polls.find(p => p.id === pollId);
    if (poll) {
      poll.closed = true;
      this.save('poll');
    }
    return poll;
  }

  getPolls(includeClosed = false) {
    if (includeClosed) return this.data.poll.polls;
    return this.data.poll.polls.filter(p => !p.closed);
  }

  // Mood
  addMoodEntry(entry) {
    const moodEntry = {
      id: `mood-${Date.now()}`,
      userId: entry.userId,
      score: entry.score, // 1-5
      note: entry.note || '',
      weather: entry.weather || null,
      createdAt: Date.now(),
    };
    this.data.mood.entries.push(moodEntry);
    
    // Update team stats
    const today = new Date().toDateString();
    const todayEntries = this.data.mood.entries.filter(e => 
      new Date(e.createdAt).toDateString() === today
    );
    const avg = todayEntries.reduce((sum, e) => sum + e.score, 0) / todayEntries.length;
    this.data.mood.teamStats = {
      average: Math.round(avg * 10) / 10,
      count: todayEntries.length,
      trend: avg >= 3.5 ? 'up' : avg <= 2.5 ? 'down' : 'stable',
    };
    
    this.save('mood');
    return moodEntry;
  }

  getMoodHistory(days = 7) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.data.mood.entries.filter(e => e.createdAt > cutoff);
  }

  // Pomodoro
  startPomodoro(session) {
    const pomodoroSession = {
      id: `pomo-${Date.now()}`,
      userId: session.userId,
      task: session.task || '專注工作',
      type: session.type || 'work', // work, shortBreak, longBreak
      startedAt: Date.now(),
      endsAt: Date.now() + (session.duration || 25 * 60 * 1000),
      completed: false,
      pausedAt: null,
      remainingMs: session.duration || 25 * 60 * 1000,
    };
    this.data.pomodoro.activeSessions[session.userId] = pomodoroSession;
    this.save('pomodoro');
    return pomodoroSession;
  }

  stopPomodoro(userId) {
    if (this.data.pomodoro.activeSessions[userId]) {
      const session = this.data.pomodoro.activeSessions[userId];
      session.completed = true;
      this.data.pomodoro.history.push(session);
      delete this.data.pomodoro.activeSessions[userId];
      this.save('pomodoro');
      return session;
    }
    return null;
  }

  updatePomodoroProgress(userId, remainingMs) {
    if (this.data.pomodoro.activeSessions[userId]) {
      this.data.pomodoro.activeSessions[userId].remainingMs = remainingMs;
      this.save('pomodoro');
    }
  }

  getPomodoroSessions() {
    return Object.values(this.data.pomodoro.activeSessions);
  }

  // Reminders
  addReminder(reminder) {
    const newReminder = {
      id: `remind-${Date.now()}`,
      userId: reminder.userId,
      content: reminder.content,
      remindAt: reminder.remindAt || Date.now() + 60 * 60 * 1000, // Default 1 hour
      repeat: reminder.repeat || null, // null, 'hourly', 'daily', 'weekly'
      triggered: false,
      createdAt: Date.now(),
    };
    this.data.reminder.reminders.push(newReminder);
    this.save('reminder');
    return newReminder;
  }

  completeReminder(reminderId) {
    const reminder = this.data.reminder.reminders.find(r => r.id === reminderId);
    if (reminder) {
      reminder.triggered = true;
      this.data.reminder.triggered.push(reminder);
      this.data.reminder.reminders = this.data.reminder.reminders.filter(r => r.id !== reminderId);
      this.save('reminder');
    }
    return reminder;
  }

  getActiveReminders() {
    return this.data.reminder.reminders.filter(r => !r.triggered);
  }

  getDueReminders() {
    const now = Date.now();
    return this.data.reminder.reminders.filter(r => r.remindAt <= now && !r.triggered);
  }

  // Points
  addPoints(userId, amount, reason) {
    if (!this.data.points.users[userId]) {
      this.data.points.users[userId] = { points: 0, level: 1, history: [] };
    }
    this.data.points.users[userId].points += amount;
    this.data.points.transactions.push({
      id: `pt-${Date.now()}`,
      userId,
      amount,
      reason,
      createdAt: Date.now(),
    });
    this.save('points');
    return this.data.points.users[userId];
  }

  getPoints(userId) {
    return this.data.points.users[userId] || { points: 0, level: 1, history: [] };
  }

  getLeaderboard(limit = 10) {
    return Object.entries(this.data.points.users)
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
  }

  // Badges
  awardBadge(userId, badgeId) {
    if (!this.data.badges.userBadges[userId]) {
      this.data.badges.userBadges[userId] = [];
    }
    if (!this.data.badges.userBadges[userId].includes(badgeId)) {
      this.data.badges.userBadges[userId].push(badgeId);
      this.save('badges');
    }
    return this.data.badges.userBadges[userId];
  }

  getBadges(userId) {
    const userBadgeIds = this.data.badges.userBadges[userId] || [];
    return userBadgeIds.map(id => this.data.badges.badges[id] || null).filter(Boolean);
  }

  getAllBadges() {
    return Object.values(this.data.badges.badges);
  }

  // Whiteboard
  addWhiteboardContent(pageId, content) {
    const page = this.data.whiteboard.pages[pageId || 'default'];
    if (page) {
      page.content.push({
        id: `item-${Date.now()}`,
        ...content,
        createdAt: Date.now(),
      });
      this.save('whiteboard');
    }
    return page;
  }

  getWhiteboardPage(pageId = 'default') {
    return this.data.whiteboard.pages[pageId || 'default'] || null;
  }

  getAllWhiteboardPages() {
    return Object.values(this.data.whiteboard.pages);
  }

  createWhiteboardPage(name) {
    const id = `page-${Date.now()}`;
    this.data.whiteboard.pages[id] = {
      id,
      name,
      content: [],
      createdAt: Date.now(),
    };
    this.save('whiteboard');
    return this.data.whiteboard.pages[id];
  }

  // Forum
  createForumPost(post) {
    const newPost = {
      id: `post-${Date.now()}`,
      title: post.title,
      content: post.content,
      author: post.author || 'anonymous',
      categoryId: post.categoryId || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      replies: [],
      pinned: false,
      locked: false,
    };
    this.data.forum.posts.push(newPost);
    this.save('forum');
    return newPost;
  }

  addForumReply(postId, reply) {
    const post = this.data.forum.posts.find(p => p.id === postId);
    if (post) {
      post.replies.push({
        id: `reply-${Date.now()}`,
        content: reply.content,
        author: reply.author || 'anonymous',
        createdAt: Date.now(),
      });
      post.updatedAt = Date.now();
      this.save('forum');
    }
    return post;
  }

  getForumPosts(categoryId = null) {
    if (categoryId) {
      return this.data.forum.posts.filter(p => p.categoryId === categoryId);
    }
    return this.data.forum.posts;
  }

  // Templates
  getTemplates(category = null) {
    if (category) {
      return this.data.templates.templates.filter(t => t.category === category);
    }
    return this.data.templates.templates;
  }

  addTemplate(template) {
    const newTemplate = {
      id: `tmpl-${Date.now()}`,
      ...template,
      createdAt: Date.now(),
      useCount: 0,
    };
    this.data.templates.templates.push(newTemplate);
    this.save('templates');
    return newTemplate;
  }

  incrementTemplateUse(templateId) {
    const template = this.data.templates.templates.find(t => t.id === templateId);
    if (template) {
      template.useCount++;
      this.data.templates.recentUse[templateId] = Date.now();
      this.save('templates');
    }
    return template;
  }

  // Stats
  recordStat(type, key, value) {
    const today = new Date().toISOString().split('T')[0];
    if (!this.data.stats.daily[today]) this.data.stats.daily[today] = {};
    if (!this.data.stats.daily[today][type]) this.data.stats.daily[today][type] = {};
    this.data.stats.daily[today][type][key] = value;
    this.save('stats');
  }

  incrementStat(type, key, amount = 1) {
    const today = new Date().toISOString().split('T')[0];
    if (!this.data.stats.daily[today]) this.data.stats.daily[today] = {};
    if (!this.data.stats.daily[today][type]) this.data.stats.daily[today][type] = {};
    if (!this.data.stats.daily[today][type][key]) this.data.stats.daily[today][type][key] = 0;
    this.data.stats.daily[today][type][key] += amount;
    this.save('stats');
  }

  getStats(range = 'daily', type = null) {
    if (range === 'daily') {
      const today = new Date().toISOString().split('T')[0];
      return type ? this.data.stats.daily[today]?.[type] || {} : this.data.stats.daily[today] || {};
    }
    return this.data.stats;
  }

  // Config
  getConfig() {
    return this.data.config;
  }

  updateConfig(updates) {
    this.data.config = { ...this.data.config, ...updates };
    this.save('config');
    return this.data.config;
  }

  isFeatureEnabled(feature) {
    return this.data.config.features?.[feature] !== false;
  }
}

// Singleton instance
const voData = new VODataManager();

module.exports = voData;
