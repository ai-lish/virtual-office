# Discord ↔ 網頁 同步實施計劃 (SYNC-PLAN)

> 目標：網頁實現所有 Discord 主要功能，達成跨平台一致體驗

---

## 📋 總覽

| 階段 | 目標 | 狀態 |
|------|------|------|
| Week 1 | 基礎同步架構 (用戶列表、頻道結構、基本 UI) | ✅ 完成 |
| Week 2 | 核心功能同步 (狀態、投票、Pomodoro、心情) | 🔄 進行中 |
| Week 3 | 高級功能同步 (遊戲化、提醒、協作白板) | 📋 規劃中 |
| Week 4 | AI 功能整合 + 雙向同步優化 | 📋 規劃中 |

---

## Week 1 ✅ (已完成)

### 已實現功能
- Discord 用戶列表 → 網頁顯示
- 頻道結構同步 → 網頁側邊欄
- 基本狀態指示 (線上/離開/忙碌)
- Discord embed 卡片 → 網頁組件

### 數據流
```
Discord Bot (Node.js) → REST API (Express) → 網頁 Client
                         ↓
                   JSON Files (poll-db.json, etc.)
```

---

## Week 2 🔄 (進行中)

**目標：** 實現四大核心系統的網頁端功能

---

### 1. 狀態系統 (Status System)

#### 詳細任務分解

| Task ID | 任務 | 預計工時 | 負責人 |
|---------|------|---------|--------|
| S-01 | 網頁 `!status` 面板 UI | 2h | 師弟 |
| S-02 | Discord → 網頁 狀態同步 API | 2h | 師弟 |
| S-03 | 網頁 → Discord 操作 (set status) | 2h | 師弟 |
| S-04 | 狀態歷史記錄 | 1h | 師弟 |
| S-05 | 狀態面板組件測試 | 1h | T仔 |

#### 技術實現步驟

1. **Phase 1: UI 組件**
   ```
   src/components/StatusPanel.vue
   ├── StatusIndicator (在線/離開/忙碌/隱身)
   ├── StatusSelector (下拉選單)
   ├── CustomMessageInput (自訂狀態訊息)
   └── StatusHistoryList (歷史記錄)
   ```

2. **Phase 2: API 端點**
   ```
   GET  /api/status              → 獲取所有成員狀態
   GET  /api/status/:userId      → 獲取特定成員狀態
   POST /api/status              → 更新自己的狀態 (Discord → API)
   PUT  /api/status/:userId      → 網頁操作更新 Discord 狀態
   
   WebSocket: /ws/status         → 實時狀態更新推送
   ```

3. **Phase 3: Discord Bot 整合**
   - 監聽 `presenceUpdate` 事件
   - 狀態變化時廣播到 WebSocket clients
   - 處理來自網頁的狀態更新請求

4. **Phase 4: 雙向同步**
   ```
   [Discord 改變狀態] → Bot 監聽 → API 廣播 → 網頁更新 (≤ 3秒)
   [網頁 改變狀態]   → API 接收 → Bot 調用 → Discord 更新 (≤ 5秒)
   ```

#### 驗收標準

- [ ] 網頁顯示所有 Discord 成員狀態 (誤差 ≤ 3秒)
- [ ] 網頁可查看成員自訂狀態訊息
- [ ] 網頁操作可即時更新 Discord 顯示
- [ ] 狀態變化有視覺通知動畫
- [ ] 離線成員顯示最後已知狀態
- [ ] 通過 T仔 測試 (功能覆蓋率 ≥ 95%)

---

### 2. 投票系統 (Poll System)

#### 詳細任務分解

| Task ID | 任務 | 預計工時 | 負責人 |
|---------|------|---------|--------|
| P-01 | 投票列表 UI 組件 | 2h | 師弟 |
| P-02 | 投票創建表單 UI | 2h | 師弟 |
| P-03 | 投票結果顯示組件 | 1h | 師弟 |
| P-04 | 即時票數更新 (WebSocket) | 2h | 師弟 |
| P-05 | Discord ↔ 網頁 投票同步 | 2h | 師弟 |
| P-06 | 投票系統 End-to-End 測試 | 1h | T仔 |

#### 技術實現步驟

1. **Phase 1: 數據模型**
   ```javascript
   // poll-db.json (現有)
   {
     "polls": [{
       "id": "poll_xxx",
       "question": "午飯去哪？",
       "options": [
         { "id": "opt_1", "text": "麥當勞", "votes": ["user1", "user2"] },
         { "id": "opt_2", "text": "大家樂", "votes": ["user3"] }
       ],
       "authorId": "user1",
       "authorName": "小明",
       "createdAt": "2026-03-23T10:00:00Z",
       "expiresAt": "2026-03-24T10:00:00Z",
       "isActive": true,
       "isAnonymous": false,
       "isUrgent": false
     }]
   }
   ```

2. **Phase 2: API 端點**
   ```
   GET    /api/polls              → 獲取所有投票 (含狀態)
   GET    /api/polls/active       → 僅獲取進行中投票
   GET    /api/polls/:id          → 獲取特定投票詳情
   POST   /api/polls              → 創建新投票
   POST   /api/polls/:id/vote     → 投票 (optionId)
   DELETE /api/polls/:id/vote     → 取消投票
   POST   /api/polls/:id/close    → 結束投票
   
   WebSocket: /ws/polls            → 即時票數更新
   ```

3. **Phase 3: UI 組件**
   ```
   src/components/PollPanel.vue
   ├── PollListView (投票列表)
   │   ├── PollCard (投票卡片)
   │   └── PollFilter (filter: all/active/closed)
   ├── PollCreateForm (創建表單)
   │   ├── QuestionInput
   │   ├── OptionsInput (動態增減)
   │   ├── DurationSelector
   │   └── SettingsToggle (匿名/緊急)
   ├── PollDetailView (投票詳情)
   │   ├── QuestionHeader
   │   ├── OptionList (含進度條)
   │   ├── VoteButton
   │   └── ResultChart (圓餅/柱狀)
   └── PollTimer (倒計時顯示)
   ```

4. **Phase 4: Discord ↔ 網頁 同步**
   ```
   [Discord 創建投票] → Bot 寫入 poll-db.json → 廣播 WebSocket → 網頁更新
   [網頁 投票]       → API 更新 → Bot 監聽 → Discord embed 更新
   [投票結束]       → Bot 通知 → 移除 active 狀態 → 雙方同步關閉
   ```

#### 驗收標準

- [ ] 網頁顯示所有 Discord 投票 (進行中/已結束)
- [ ] 網頁可創建投票並即時同步到 Discord
- [ ] 投票時 Discord embed 即時更新票數
- [ ] 投票進度條視覺化顯示
- [ ] 即時票數更新延遲 ≤ 2秒
- [ ] 匿名投票不顯示投票者名稱
- [ ] 緊急投票有特別標識
- [ ] 通過 T仔 測試 (功能覆蓋率 ≥ 95%)

---

### 3. Pomodoro 系統 (Pomodoro System)

#### 詳細任務分解

| Task ID | 任務 | 預計工時 | 負責人 |
|---------|------|---------|--------|
| D-01 | 網頁計時器 UI 組件 | 2h | 師弟 |
| D-02 | 衝刺狀態顯示面板 | 1h | 師弟 |
| D-03 | 進度通知系統 (WebSocket) | 2h | 師弟 |
| D-04 | Discord ↔ 網頁 衝刺同步 | 2h | 師弟 |
| D-05 | Pomodoro 統計面板 | 1h | 師弟 |
| D-06 | Pomodoro End-to-End 測試 | 1h | T仔 |

#### 技術實現步驟

1. **Phase 1: 數據模型**
   ```javascript
   // pomodoro-data.json (現有)
   {
     "activeSprints": [{
       "id": "sprint_xxx",
       "userId": "user1",
       "userName": "小明",
       "task": "撰寫報告",
       "type": "work",          // work | short-break | long-break
       "startedAt": "2026-03-23T10:00:00Z",
       "duration": 25,           // 分鐘
       "remainingSeconds": 1500,
       "isPaused": false
     }],
     "config": {
       "workDuration": 25,
       "shortBreakDuration": 5,
       "longBreakDuration": 15,
       "sprintsBeforeLongBreak": 4
     },
     "stats": {
       "user1": {
         "totalSprints": 12,
         "totalMinutes": 300,
         "todaySprints": 4,
         "currentStreak": 3
       }
     }
   }
   ```

2. **Phase 2: API 端點**
   ```
   GET    /api/pomodoro              → 獲取所有進行中衝刺
   GET    /api/pomodoro/active       → 獲取自己當前衝刺
   GET    /api/pomodoro/stats/:userId → 獲取用戶統計
   POST   /api/pomodoro/start        → 開始新衝刺
   POST   /api/pomodoro/pause        → 暫停
   POST   /api/pomodoro/resume       → 繼續
   POST   /api/pomodoro/stop         → 停止
   POST   /api/pomodoro/complete     → 標記完成
   
   WebSocket: /ws/pomodoro           → 進度更新推送 (每30秒)
   ```

3. **Phase 3: UI 組件**
   ```
   src/components/PomodoroPanel.vue
   ├── PomodoroTimer (計時器核心)
   │   ├── CircularProgress (圓形進度)
   │   ├── TimeDisplay (分:秒)
   │   └── ControlButtons (開始/暫停/停止)
   ├── SprintList (進行中衝刺列表)
   │   └── SprintCard (成員 + 任務 + 倒計時)
   ├── PomodoroForm (開始新衝刺)
   │   ├── TaskInput
   │   └── DurationSelector
   └── PomodoroStats (統計面板)
       ├── TodaySummary
       └── WeeklyChart
   ```

4. **Phase 4: Discord ↔ 網頁 同步**
   ```
   [Discord 開始衝刺] → Bot 寫入 → 廣播 → 網頁顯示計時器
   [衝刺完成通知]    → Bot DM 用戶 → WebSocket 推送 → 網頁通知
   [網頁開始衝刺]    → API → Bot → Discord 頻道公告
   [每30秒]          → WebSocket 推送剩餘時間 → 網頁同步更新
   ```

#### 驗收標準

- [ ] 網頁計時器顯示所有 Discord 成員的進行中衝刺
- [ ] 倒計時精確到秒，誤差 ≤ 1秒
- [ ] 衝刺開始/完成時雙平台同時通知
- [ ] 網頁開始衝刺時 Discord 頻道有公告
- [ ] 統計面板顯示今日/本週衝刺數據
- [ ] 圓形進度條平滑動畫
- [ ] 通過 T仔 測試 (功能覆蓋率 ≥ 95%)

---

### 4. 心情系統 (Mood System)

#### 詳細任務分解

| Task ID | 任務 | 預計工時 | 負責人 |
|---------|------|---------|--------|
| M-01 | 心情匯報表單 UI | 1h | 師弟 |
| M-02 | 心情趨勢圖表 (Chart.js) | 2h | 師弟 |
| M-03 | 團隊平均心情顯示 | 1h | 師弟 |
| M-04 | Discord ↔ 網頁 心情同步 | 2h | 師弟 |
| M-05 | 心情歷史數據分析 | 1h | 師弟 |
| M-06 | 心情系統 End-to-End 測試 | 1h | T仔 |

#### 技術實現步驟

1. **Phase 1: 數據模型**
   ```javascript
   // mood-data.json (新創建)
   {
     "entries": [{
       "id": "mood_xxx",
       "userId": "user1",
       "userName": "小明",
       "score": 4,              // 1-5 (1=辛苦, 5=開心)
       "note": "今天進度順利",
       "timestamp": "2026-03-23T10:00:00Z",
       "emoji": "😊"
     }],
     "aggregates": {
       "daily": {
         "2026-03-23": {
           "average": 4.2,
           "count": 8,
           "distribution": { "1": 0, "2": 1, "3": 2, "4": 3, "5": 2 }
         }
       },
       "weekly": {
         "2026-W12": {
           "average": 4.0,
           "totalEntries": 45
         }
       }
     }
   }
   ```

2. **Phase 2: API 端點**
   ```
   GET    /api/mood                   → 獲取所有心情記錄 (今日)
   GET    /api/mood/today             → 今日心情
   GET    /api/mood/stats             → 團隊統計
   GET    /api/mood/stats/weekly      → 本週趨勢
   GET    /api/mood/history/:userId   → 個人歷史
   POST   /api/mood                   → 匯報心情 (score + note)
   
   WebSocket: /ws/mood                → 新心情即時推送
   ```

3. **Phase 3: UI 組件**
   ```
   src/components/MoodPanel.vue
   ├── MoodReportForm (心情匯報)
   │   ├── EmojiSelector (5個表情選擇)
   │   ├── NoteInput (可選備註)
   │   └── SubmitButton
   ├── TeamMoodDisplay (團隊心情)
   │   ├── AverageScore (大數字顯示)
   │   ├── MoodEmoji (對應emoji)
   │   └── MemberList (今日已匯報成員)
   ├── MoodTrendChart (趨勢圖)
   │   ├── LineChart (7日趨勢)
   │   ├── BarChart (分佈柱狀圖)
   │   └── TimeRangeSelector (日/週/月)
   └── MoodHistoryTable (歷史記錄)
       └── UserMoodRow
   ```

4. **Phase 4: Discord ↔ 網頁 同步**
   ```
   [Discord 匯報心情] → Bot → API → WebSocket → 網頁更新
   [網頁匯報心情]    → API → Bot → Discord 確認訊息
   [每日統計]        → Bot 08:00 發佈 → 網頁同步顯示
   [心情趨勢]        → 雙平台共享同一數據源
   ```

#### 驗收標準

- [ ] 心情匯報表單支援 1-5 分 + 可選備註
- [ ] 團隊平均心情即時計算顯示
- [ ] 7日趨勢圖正確顯示
- [ ] Discord 心情匯報即時同步到網頁
- [ ] 網頁心情匯報即時同步到 Discord
- [ ] 未匯報成員顯示為灰色
- [ ] 表情 emoji 對應心情分數
- [ ] 通過 T仔 測試 (功能覆蓋率 ≥ 95%)

---

## Week 2 技術架構

### 共享數據層

所有功能共用同一套 JSON 數據文件，位於 Discord Bot 目錄：

```
virtual-office/
├── poll-db.json          # 投票數據 (現有)
├── pomodoro-data.json    # Pomodoro 數據 (現有)
├── mood-data.json        # 心情數據 (新建)
├── keyword-db.json       # 關鍵詞數據 (現有)
└── status-cache.json     # 狀態緩存 (新建)
```

### API 服務器

新增獨立 API 服務器，讀取同一目錄的 JSON 文件：

```javascript
// api-server.js
const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// 讀取 shared data directory
const DATA_DIR = path.join(__dirname, '../discord-bot-data');

// REST API routes...
// WebSocket server for real-time updates...
```

### 同步策略

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Discord   │ ←─────→│  API Server │ ←─────→│    網頁     │
│    Bot      │         │  (Express)  │         │  (Vue.js)   │
└─────────────┘         └─────────────┘         └─────────────┘
      │                       │                        │
      │                       │                        │
      ↓                       ↓                        ↓
┌─────────────────────────────────────────────────────────────┐
│                    共享 JSON 文件                            │
│  poll-db.json | pomodoro-data.json | mood-data.json         │
└─────────────────────────────────────────────────────────────┘
```

### 實時更新流程

| 功能 | 觸發時機 | 更新方式 | 目標延遲 |
|------|---------|---------|---------|
| 狀態 | presence 變化 | WebSocket broadcast | ≤ 3秒 |
| 投票 | 用戶投票 | WebSocket + Discord embed edit | ≤ 2秒 |
| Pomodoro | 每 30 秒 | WebSocket | ≤ 1秒 |
| 心情 | 新匯報 | WebSocket + Discord 確認 | ≤ 3秒 |

---

## Week 2 責任分配

| 負責人 | 職責 | 主要任務 |
|--------|------|---------|
| 師弟 | 全端開發 | 所有 UI + API + 同步邏輯 |
| T仔 | 測試 | 各系統 End-to-End 測試 |
| 大腦 (主 Agent) | 協調 | 任務分配、進度追蹤、整合檢查 |

---

## Week 2 驗收總表

### 狀態系統
- [ ] 網頁顯示所有成員狀態 (誤差 ≤ 3秒)
- [ ] 支援查看自訂狀態訊息
- [ ] 網頁操作即時更新 Discord
- [ ] 狀態變化有視覺動畫
- [ ] 離線成員顯示最後狀態

### 投票系統
- [ ] 顯示所有 Discord 投票
- [ ] 支援創建投票
- [ ] 即時票數更新 (≤ 2秒)
- [ ] 進度條視覺化
- [ ] 匿名/緊急投票支援

### Pomodoro 系統
- [ ] 顯示所有進行中衝刺
- [ ] 倒計時精確到秒
- [ ] 開始/完成雙平台通知
- [ ] 統計面板正常
- [ ] 圓形進度條動畫

### 心情系統
- [ ] 心情匯報表單正常
- [ ] 團隊平均即時計算
- [ ] 7日趨勢圖正確
- [ ] 雙向同步正常
- [ ] 未匯報成員灰色顯示

---

## Week 2 風險評估

| 風險 | 可能性 | 影響 | 應對方案 |
|------|--------|------|---------|
| WebSocket 連接不穩定 | 中 | 高 | 實現自動重連 + 輪詢降級 |
| Discord Rate Limit | 低 | 中 | 請求批次處理 + 緩存 |
| JSON 文件併發寫入 | 中 | 中 | 實現文件鎖或使用 SQLite |
| 跨域 CORS 問題 | 低 | 中 | API Server 配置 CORS middleware |
| 大量 WebSocket clients | 中 | 中 | 實現 client 数量限制 + 分流 |

---

*最後更新: 2026-03-23*
*負責人: 大腦 (主 Agent) / 師弟 (開發) / T仔 (測試)*
