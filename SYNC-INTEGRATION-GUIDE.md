# Virtual Office Sync - Integration Guide

## Overview

This document explains how to integrate the Virtual Office Sync system with the existing Discord bot and website.

## System Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   Discord Bot    │◄───────►│   Sync Server   │
│ discord-bot.js  │  WS     │ vo-sync-server.js│
└────────┬────────┘         └────────┬────────┘
         │                           │
         │ WebSocket                  │ WebSocket / HTTP
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│  Discord Users  │         │   Website UI    │
│                 │         │ vo-sync-ui.html │
└─────────────────┘         └─────────────────┘
```

## Files Created

### Core Sync Infrastructure

1. **sync/vo-data-manager.js** - Shared data management
   - Manages all shared JSON databases
   - Provides CRUD operations for all features
   - Event system for data changes

2. **sync/vo-sync-server.js** - WebSocket + API server
   - Port 18900
   - Handles WebSocket connections from website
   - Discord bot connection endpoint
   - REST API endpoints
   - Broadcasts updates to all clients

3. **sync/vo-sync-client.js** - Frontend client library
   - WebSocket client for website
   - Event system for real-time updates
   - Convenience methods for all features

4. **sync/vo-discord-bridge.js** - Discord ↔ Server bridge
   - Connects Discord bot to sync server
   - Broadcasts Discord events to website
   - Handles commands from website

### UI

5. **ui/vo-sync-ui.html** - Complete VO sync dashboard
   - 10 feature panels (status, pomodoro, poll, mood, reminders, points, whiteboard, forum, calendar, stats)
   - WebSocket connection status
   - Modal dialogs for creating content
   - Responsive design

### Startup

6. **start-vo-sync.js** - Startup script
   - Initializes data files
   - Starts sync server
   - Optionally starts Discord bot

## Integration Steps

### Step 1: Start the Sync Server

```bash
cd /path/to/virtual-office
node start-vo-sync.js
```

Or manually:
```bash
node sync/vo-sync-server.js
```

### Step 2: Integrate Discord Bot (Optional)

Add to `discord-bot.js`:

```javascript
// At the top with other requires
const voBridge = require('./sync/vo-discord-bridge');

// After bot client is created
const bridge = voBridge.integrateWithDiscordBot(client);

// Example: Broadcast when status changes
bridge.broadcastStatusUpdate(userId, {
  status: 'busy',
  task: 'Working on feature X',
  emoji: '💻'
});

// Example: Broadcast when poll is created
bridge.broadcastPollCreated(pollData);
```

### Step 3: Open the Website UI

Navigate to: `http://localhost:18900/vo-sync-ui.html`

Or integrate into existing website by including:

```html
<script src="sync/vo-sync-client.js"></script>
<script>
  const voClient = new VOSyncClient({
    url: 'ws://your-server:18900/ws/vo',
    userId: 'user-123'
  });
  
  voClient.on('status_update', (data) => {
    console.log('Status updated:', data);
  });
  
  voClient.connect();
</script>
```

## API Reference

### WebSocket Messages

Connect to: `ws://localhost:18900/ws/vo`

**Actions (send):**

```javascript
// Status
{ action: 'status.update', userId: '...', status: 'online', task: 'Coding', emoji: '💻' }
{ action: 'status.get' }

// Poll
{ action: 'poll.create', question: '...', options: ['A', 'B', 'C'] }
{ action: 'poll.vote', pollId: '...', optionId: 0 }
{ action: 'poll.list' }

// Mood
{ action: 'mood.submit', score: 4, note: 'Great day!' }
{ action: 'mood.get' }

// Pomodoro
{ action: 'pomodoro.start', task: 'Coding', type: 'work', duration: 1500000 }
{ action: 'pomodoro.stop' }

// Reminders
{ action: 'reminder.add', content: 'Meeting at 3pm', remindAt: 1711100000000 }
{ action: 'reminder.list' }

// Points
{ action: 'points.get', userId: '...' }
{ action: 'points.leaderboard' }

// Whiteboard
{ action: 'whiteboard.add', pageId: 'default', itemType: 'text', text: 'Hello', color: '#fff' }
{ action: 'whiteboard.pages' }

// Forum
{ action: 'forum.create_post', title: '...', content: '...' }
{ action: 'forum.posts' }
```

**Events (receive):**

- `init` - Initial state on connect
- `status_update` - Member status changed
- `poll_created`, `poll_updated`, `poll_closed` - Poll events
- `mood_added` - New mood entry
- `pomodoro_started`, `pomodoro_stopped`, `pomodoro_tick` - Pomodoro events
- `reminder_added`, `reminder_triggered` - Reminder events
- `points_updated`, `badge_awarded` - Gamification events
- `whiteboard_updated` - Whiteboard change
- `forum_post_created`, `forum_reply_added` - Forum events

### REST API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/vo/status` | GET | Get all member statuses |
| `/api/vo/poll` | GET | Get all polls |
| `/api/vo/mood` | GET | Get mood history and stats |
| `/api/vo/pomodoro` | GET | Get active pomodoro sessions |
| `/api/vo/leaderboard` | GET | Get points leaderboard |
| `/api/vo/[action]` | POST | Execute action (same as WebSocket) |

## Configuration

Edit `vo-config.json`:

```json
{
  "syncEnabled": true,
  "websocketPort": 18900,
  "pollInterval": 5000,
  "maxHistory": 1000,
  "features": {
    "status": true,
    "standup": true,
    "poll": true,
    "mood": true,
    "pomodoro": true,
    "reminder": true,
    "points": true,
    "badges": true,
    "calendar": true,
    "whiteboard": true,
    "forum": true,
    "templates": true,
    "stats": true
  }
}
```

## Data Files

| File | Description |
|------|-------------|
| `vo-status-db.json` | Member statuses |
| `vo-standup-db.json` | Standup submissions |
| `vo-poll-db.json` | Polls and votes |
| `vo-mood-db.json` | Mood entries |
| `vo-pomodoro-db.json` | Pomodoro sessions |
| `vo-reminder-db.json` | Reminders |
| `vo-points-db.json` | Points and transactions |
| `vo-badges-db.json` | Badge definitions and awards |
| `vo-calendar-db.json` | Calendar events |
| `vo-whiteboard-db.json` | Whiteboard pages and content |
| `vo-forum-db.json` | Forum posts and replies |
| `vo-templates-db.json` | Reusable templates |
| `vo-stats-db.json` | Statistics |

## Troubleshooting

### Connection Issues

1. Check if port 18900 is available
2. Ensure firewall allows WebSocket connections
3. Check server logs for errors

### Discord Not Syncing

1. Verify Discord bot has VO bridge integrated
2. Check Discord bot is connected to `/ws/discord` endpoint
3. Verify `DISCORD_BOT_TOKEN` is set

### Website Not Updating

1. Check WebSocket connection status (green dot)
2. Verify browser console for errors
3. Try refreshing the page

## Next Steps

1. **Integrate with existing Discord commands** - Add `bridge.broadcast*()` calls to existing command handlers
2. **Customize UI** - Modify `vo-sync-ui.html` to match your website design
3. **Add authentication** - Implement user authentication for secure access
4. **Scale horizontally** - Deploy multiple sync servers behind a load balancer

## Support

For issues or questions, check:
- Server logs in console
- Browser developer tools (F12)
- Network tab for WebSocket frames
