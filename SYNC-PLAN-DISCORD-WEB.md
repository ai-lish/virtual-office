# Discord 與 網頁 Virtual Office 同步計劃

**目標:** Discord 有既功能 → 網頁都要有 | 網頁有既功能 → Discord 都要有
**創建日期:** 2026-03-22
**狀態:** 規劃中

---

## 📊 現況分析

### Discord 現有功能 (Phase 1-9)

| Phase | 功能 | 狀態 |
|-------|------|------|
| Phase 1 | 頻道架構、Thread 功能 | ✅ |
| Phase 2 | Standup、Status、Dashboard 捷徑 | ✅ |
| Phase 3 | Voice 頻道虛擬桌面、自動清理 | ✅ |
| Phase 4 | 關鍵詞訂閱、投票命令、Google Workspace 整合 | ✅ |
| Phase 5 | AI 任務助手、項目進度預測、智能日曆整合 | ✅ |
| Phase 6 | 協作白板、遊戲化系統、團隊心情指數、智能提醒、數據儀表板 | ✅ |
| Phase 7 | 10項新功能 (Webhook、Calendar增強、Poll增強等) | ✅ |
| Phase 8 | 6項新功能 (Notion同步、Jenkins通知、截止提醒、安靜時段、每月清理、Thread封存) | ✅ |
| Phase 9 | 10項新功能 (Thread Templates、Forum Channel、Slash Commands、Cron增強等) | ✅ |

### 網頁現有功能

| 功能 | 說明 | 狀態 |
|------|------|------|
| 書記浮動頭像 🦀 | 右側浮動顯示，可拖曳 | ✅ |
| 主題切換 🌙/☀️ | 5種自訂主題 | ✅ |
| 通知中心 🔔 | 通知列表、訂閱功能、任務倒數 | ✅ |
| 工作氣泡 💬 | 右上角浮動氣泡，每10秒更新 | ✅ |
| 項目時序 📊 | 左側邊欄顯示項目進度 | ✅ |
| 工作排程 📅 | 左側邊欄顯示定時任務 | ✅ |
| 項目詳情 | GitHub Stats、Commit歷史、PDF圖像庫、SVG比對 | ✅ |
| 統計圖表 📈 | 通過率、題目數據 | ✅ |
| Tab 狀態記憶 | localStorage 保存狀態 | ✅ |
| 手機優化 📱 | 響應式設計 | ✅ |
| 項目搜索 | 快速搜索項目 | ✅ |
| 數據緩存優化 | CacheManager | ✅ |
| 自動化備份 | AutoBackup | ✅ |
| 導出功能 | PDF/Markdown 報告 | ✅ |
| 權限管理 | admin/user/guest | ✅ |
| API 集成 | 統一 API 調用 | ✅ |
| 工作狀態文字 | 具體工作描述顯示 | ✅ |
| SVG深色優化 | 深色模式 SVG | ✅ |
| TEST狀態追蹤 | 最後測試時間顯示 | ✅ |
| 質量報告 | 每週SVG製作進度匯總 | ✅ |

---

## 🎯 同步計劃

### 第一部分：網頁需要對應既功能 (Discord → 網頁)

#### 1.1 Discord 命令面板 (需新增)

| Discord 命令 | 網頁對應功能 | 優先度 | 實現方式 |
|-------------|-------------|--------|---------|
| `!status set [任務]` | 狀態設定面板 | 🔴 高 | Web UI + WebSocket 推送 |
| `!standup` | Standup 填寫介面 | 🔴 高 | Modal/Form + 提交到 Discord |
| `!dashboard` | 儀表板視圖 | 🔴 高 | 整合現有 unified-dashboard.js |
| `!pomodoro start [任務]` | Pomodoro 計時器 UI | 🔴 高 | Timer UI + 狀態同步 |
| `!weather` / `!mood` | 心情天氣預報 | 🟡 中 | 網頁天氣心情面板 |
| `!poll [問題]` | 投票系統 UI | 🔴 高 | 投票創建 + 結果顯示 |
| `!remind [內容]` | 提醒設定 UI | 🟡 中 | 提醒管理介面 |
| `!cron` | Cron Job 管理 | 🟡 中 | 定時任務列表 |
| `!board` | 協作白板 UI | 🟡 中 | Canvas 白板介面 |
| `!points` / `!badges` | 遊戲化系統 | 🟢 低 | 積分排行榜 UI |
| `!template` | 範本選擇器 | 🟢 低 | 範本列表 + 複製 |
| `!forum` | 論壇頻道列表 | 🟢 低 | 論壇帖子列表 |
| `!gcal` | Google Calendar 整合 | 🟡 中 | 日曆視圖 |
| `!follow` | Channel Follow 管理 | 🟢 低 | 追蹤設定介面 |

#### 1.2 即時狀態同步 (需新增)

| 功能 | 說明 | 優先度 |
|------|------|--------|
| Agent 實時狀態 | Discord Bot 狀態 → 網頁浮動頭像 | 🔴 高 |
| Voice 頻道狀態 | Discord Voice 在崗人數 → 網頁顯示 | 🔴 高 |
| 心情指數 | Discord mood data → 網頁心情面板 | 🟡 中 |
| 積分/徽章 | Discord points data → 網頁排行榜 | 🟡 中 |
| Pomodoro 狀態 | Discord 衝刺狀態 → 網頁計時器 | 🟡 中 |
| 投票結果 | Discord poll data → 網頁投票顯示 | 🟡 中 |

---

### 第二部分：Discord Bot 需要對應既功能 (網頁 → Discord)

#### 2.1 網頁操作觸發 Discord 動作

| 網頁功能 | Discord 對應命令 | 優先度 | 實現方式 |
|---------|-----------------|--------|---------|
| 狀態更新 | Bot 接收 API 呼叫 | 🔴 高 | Webhook endpoint |
| Standup 提交 | `!standup reply` 自動觸發 | 🔴 高 | 網頁 → Bot API |
| 投票創建 | `!poll` 命令 | 🔴 高 | 網頁 → Bot API |
| 提醒設定 | `!remind` 命令 | 🟡 中 | 網頁 → Bot API |
| Pomodoro 開始/停止 | `!pomodoro` 命令 | 🟡 中 | 網頁 → Bot API |
| 心情匯報 | `!mood` 命令 | 🟡 中 | 網頁 → Bot API |
| 積分操作 | `!points` / `!task complete` | 🟡 中 | 網頁 → Bot API |
| 白板更新 | `!board add` 命令 | 🟢 低 | 網頁 → Bot API |

#### 2.2 指令同步需求

| 指令類型 | 同步方向 | 說明 |
|---------|---------|------|
| `!status` | Discord → 網頁 | 狀態改變時廣播到所有客戶端 |
| `!standup` | 雙向 | 網頁提交 → Discord，Discord 摘要 → 網頁 |
| `!poll` | 雙向 | 創建/投票/結束都要同步 |
| `!remind` | 雙向 | 提醒設定和觸發通知同步 |
| `!mood` | 雙向 | 心情數據同步 |
| `!pomodoro` | 雙向 | 衝刺狀態同步 |

---

## 🔄 數據同步方式

### 同步架構

```
┌─────────────────┐         ┌─────────────────┐
│  Discord Bot    │◄───────►│  共享數據庫      │
│  (Node.js)      │         │  (JSON Files)   │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │ WebSocket                  │ Polling/Push
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│  網頁前端        │◄───────►│  Web Server     │
│  (HTML/JS)      │         │  (server.js)   │
└─────────────────┘         └─────────────────┘
```

### 共享數據文件

| 文件 | 用途 | 同步頻率 |
|------|------|---------|
| `status-db.json` | 成員狀態 | 實時 |
| `standup-db.json` | Standup 記錄 | 按需 |
| `poll-db.json` | 投票數據 | 實時 |
| `keyword-db.json` | 關鍵詞訂閱 | 按需 |
| `phase6-data.json` | 心情/積分/徽章 | 實時 |
| `phase-pomodoro.json` | Pomodoro 狀態 | 實時 |
| `voice-status.json` | Voice 頻道狀態 | 實時 |
| `cron-config.json` | Cron Job 配置 | 按需 |

### API Endpoints (需擴展)

| Endpoint | 方法 | 功能 |
|----------|------|------|
| `/api/vo/action` | POST | 網頁操作觸發 Discord 命令 |
| `/api/vo/status` | GET | 獲取所有成員狀態 |
| `/api/vo/mood` | GET/POST | 心情數據 |
| `/api/vo/poll` | GET/POST | 投票操作 |
| `/api/vo/remind` | GET/POST | 提醒管理 |
| `/api/vo/pomodoro` | GET/POST | Pomodoro 狀態 |
| `/api/vo/points` | GET | 積分查詢 |
| `/api/vo/board` | GET/POST | 白板內容 |
| `/api/vo/templates` | GET | 獲取範本列表 |
| `/api/vo/calendar` | GET | 日曆事件 |
| `/ws/vo` | WebSocket | 實時雙向同步 |

---

## ⚡ 實時更新方案

### 方案 A: WebSocket 雙向同步 (推薦)

**優點:**
- 真正的實時更新
- 伺服器推送，無需輪詢
- 支持雙向通信

**實現:**
```javascript
// server.js 新增 WebSocket endpoint
const voClients = new Set();

wss.on('connection', (ws) => {
  voClients.add(ws);
  ws.on('message', (msg) => {
    // 處理網頁發來的消息
    const data = JSON.parse(msg);
    if (data.type === 'action') {
      // 執行 Discord 命令
      executeDiscordCommand(data.command, data.params);
    }
  });
});

// 廣播 Discord 狀態到所有網頁客戶端
function broadcastToWeb(data) {
  voClients.forEach(client => {
    client.send(JSON.stringify(data));
  });
}
```

### 方案 B: Polling + Webhook 混合

**優點:**
- 實現簡單
- 兼容性強

**缺點:**
- 有延遲
- 資源消耗較高

**實現:**
```javascript
// 網頁每 5 秒輪詢
setInterval(async () => {
  const status = await fetch('/api/vo/status').then(r => r.json());
  updateUI(status);
}, 5000);

// Discord Bot 狀態改變時呼叫 Webhook
async function notifyWebhook(data) {
  await fetch('https://website.com/api/webhook/discord', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
```

### 方案 C: Server-Sent Events (SSE)

**適用場景:**
- 單向推送（Discord → 網頁）
- 實現比 WebSocket 簡單

**實現:**
```javascript
// server.js
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify(getStatus())}\n\n`);
  }, 5000);
  
  req.on('close', () => clearInterval(interval));
});
```

---

## 📋 功能對照表

### Discord 命令 ↔ 網頁功能

| # | Discord 功能 | 網頁需要 | 技術方案 | 優先度 |
|---|-------------|---------|---------|--------|
| 1 | `!status set [任務]` | 狀態設定 UI | WebSocket → Bot | 🔴 高 |
| 2 | `!standup reply` | Standup 填寫表單 | API → Bot | 🔴 高 |
| 3 | `!dashboard` | 儀表板視圖 | 整合現有代碼 | 🔴 高 |
| 4 | `!pomodoro start/stop` | 計時器 UI | 同步狀態 | 🔴 高 |
| 5 | `!mood [1-5]` | 心情匯報 UI | API → Bot | 🟡 中 |
| 6 | `!poll create/vote` | 投票 UI | API → Bot | 🔴 高 |
| 7 | `!remind add/list` | 提醒管理 UI | API → Bot | 🟡 中 |
| 8 | `!points/badges` | 積分排行榜 | 同步顯示 | 🟡 中 |
| 9 | `!board add/list` | 白板介面 | API → Bot | 🟢 低 |
| 10 | `!gcal` | 日曆視圖 | API → Calendar | 🟡 中 |
| 11 | `!template` | 範本選擇器 | 純前端 | 🟢 低 |
| 12 | `!forum post/list` | 論壇列表 | API → Forum | 🟢 低 |
| 13 | `!follow add/list` | 追蹤管理 | API → Bot | 🟢 低 |
| 14 | `!cron add/list` | Cron 管理 | API → Bot | 🟡 中 |
| 15 | `!weather` | 天氣面板 | 整合 phase-team-weather.js | 🟡 中 |

### 缺失功能 (Discord 有，網頁無)

| 功能 | Discord 命令 | 網頁實現方式 |
|------|-------------|-------------|
| Thread Templates | `!thread dailyLog` 等 | 網頁側邊欄範本列表 |
| Forum Channel | `!forum create/post` | 網頁討論區頁面 |
| Slash Commands | `/standup`, `/poll` 等 | 網頁快捷按鈕 |
| Channel Follow | `!follow add` | 網頁追蹤設定 |
| Keyword Subscription | `!keyword add` | 網頁關鍵詞管理 |
| Quiet Hours | `!quiet` | 網頁通知設定 |
| Archive | `!archive` | 網頁歸檔列表 |
| Notion/Airtable Sync | `!notion` | 網頁整合面板 |
| Jenkins/CI Notify | `!ci` | 網頁 Build 狀態 |
| Deadline Reminder | `!deadline` | 網頁截止日視圖 |

### 缺失功能 (網頁有，Discord 無)

| 功能 | 網頁實現 | Discord 實現方式 |
|------|---------|-----------------|
| 項目時序視圖 | 左側邊欄 | Bot 命令 `!timeline [項目]` |
| 工作排程日曆 | 日曆視圖 | Bot 命令 `!schedule` |
| 統計圖表 | 圖表顯示 | Bot 命令 `!stats` |
| 導出 PDF/MD | 導出功能 | `!export [格式]` |
| 項目搜索 | 搜索功能 | `!search [關鍵詞]` |
| 自訂主題 | 主題切換 | 現有 `/toggle theme` |
| 書記浮動頭像 | 網頁特有 | N/A (純視覺) |

---

## 🛠️ 實施計劃

### Phase 1: 核心同步 (Week 1)

**目標:** 實現最基本的雙向同步

1. **擴展 server.js API endpoints**
   - 新增 `/api/vo/action` - 接收網頁操作
   - 新增 `/api/vo/status` - 狀態同步
   - 新增 `/api/vo/poll` - 投票同步
   - 新增 `/api/vo/mood` - 心情同步
   - 新增 `/api/vo/pomodoro` - Pomodoro 同步

2. **新增 WebSocket endpoint `/ws/vo`**
   - 雙向即時通信
   - 自動重連機制

3. **Discord Bot 改造**
   - 新增 API handler 處理網頁請求
   - 狀態變化時廣播到 WebSocket

4. **網頁前端改造**
   - 連接 WebSocket
   - 新增狀態同步邏輯

### Phase 2: 功能對應 (Week 2)

**目標:** 網頁實現所有 Discord 主要功能

1. **狀態系統**
   - 網頁 `!status` 面板
   - Discord → 網頁 實時同步
   - 網頁 → Discord 操作

2. **投票系統**
   - 網頁投票列表
   - 投票創建 UI
   - 投票結果顯示
   - 即時票數更新

3. **Pomodoro 系統**
   - 網頁計時器 UI
   - 衝刺狀態顯示
   - 進度通知

4. **心情系統**
   - 心情匯報表單
   - 心情趨勢圖表
   - 團隊平均心情

### Phase 3: 完善功能 (Week 3)

**目標:** 實現所有次要功能

1. **提醒系統**
   - 提醒設定 UI
   - 提醒列表
   - 到期通知

2. **積分系統**
   - 積分排行榜
   - 徽章展示
   - 任務完成按鈕

3. **日曆整合**
   - Google Calendar 視圖
   - 會議列表
   - 快速加入連結

4. **白板系統**
   - 白板介面
   - 內容同步

### Phase 4: 高級功能 (Week 4)

**目標:** 實現所有進階功能

1. **Forum 系統**
   - 討論區列表
   - 帖子顯示
   - 新帖發布

2. **範本系統**
   - 範本選擇器
   - 範本預覽
   - 一鍵複製

3. **Channel Follow**
   - 追蹤設定
   - 訊息同步

4. **統計報表**
   - 導出功能
   - 統計圖表
   - 質量報告

---

## 📁 文件結構

```
virtual-office/
├── server.js                 # Web Server + WebSocket + API
├── discord-bot.js           # Discord Bot
├── index.html               # 網頁前端
│
├── api/                     # API 路由
│   └── vo.js               # Virtual Office API handlers
│
├── sync/                    # 同步相關
│   ├── websocket-handler.js
│   ├── discord-bridge.js
│   └── data-mapper.js
│
├── ui/                      # 網頁 UI 組件
│   ├── status-panel.html
│   ├── poll-panel.html
│   ├── pomodoro-panel.html
│   ├── mood-panel.html
│   ├── reminder-panel.html
│   ├── points-panel.html
│   ├── calendar-panel.html
│   └── board-panel.html
│
└── data/                    # 共享數據 (可選)
    └── (使用現有 JSON files)
```

---

## 🔧 技術細節

### Discord Bot → 網頁同步流程

```javascript
// 1. Discord Bot 狀態改變
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!status set')) {
    const task = message.content.replace('!status set ', '');
    const user = message.author.id;
    
    // 2. 更新數據庫
    await updateStatusDB(user, task);
    
    // 3. 廣播到 WebSocket
    broadcast({
      type: 'status_update',
      user: user,
      task: task,
      timestamp: Date.now()
    });
  }
});
```

### 網頁 → Discord Bot 同步流程

```javascript
// 1. 網頁用戶操作
async function submitStandup(data) {
  // 2. 發送到 server.js API
  const response = await fetch('/api/vo/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'standup',
      userId: 'web-user',
      data: data
    })
  });
  
  // 3. server.js 轉發到 Discord Bot
  // 4. Discord Bot 執行命令
  // 5. Discord Bot 廣播結果
}

// 6. 網頁接收結果
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'standup_result') {
    showNotification('Standup 已提交!');
  }
};
```

---

## ✅ 驗收標準

### 必須功能 (Must Have)

- [ ] 網頁可以查看所有成員狀態
- [ ] 網頁可以設定自己的狀態
- [ ] 網頁可以查看投票列表
- [ ] 網頁可以創建投票
- [ ] 網頁可以投票
- [ ] 網頁可以查看 Pomodoro 狀態
- [ ] 網頁可以開始/停止 Pomodoro
- [ ] 網頁可以匯報心情
- [ ] 網頁可以查看心情統計
- [ ] 實時更新延遲 < 3 秒

### 應該功能 (Should Have)

- [ ] 網頁可以設定提醒
- [ ] 網頁可以查看積分排行榜
- [ ] 網頁可以查看日曆
- [ ] 網頁可以查看白板內容
- [ ] 網頁可以獲取範本
- [ ] 實時更新延遲 < 1 秒

### 可選功能 (Nice to Have)

- [ ] 網頁可以發布 Forum 帖子
- [ ] 網頁可以管理 Channel Follow
- [ ] 網頁可以查看統計圖表
- [ ] 網頁可以導出報告

---

## 🚨 風險與對策

| 風險 | 影響 | 對策 |
|------|------|------|
| WebSocket 連接不穩定 | 實時更新失效 | 自動重連機制 + Polling fallback |
| Discord Rate Limits | 操作失敗 | 限流 + 重試機制 |
| 數據一致性 | 兩邊數據不同步 | 最終一致性模型 + 時間戳 |
| Bot 離線 | 功能完全失效 | Bot 狀態監控 + 通知 |
| 大量客戶端 | 性能下降 | WebSocket 分片 + 負載均衡 |

---

*最後更新: 2026-03-22*
*規劃人: BOSS (Subagent)*
