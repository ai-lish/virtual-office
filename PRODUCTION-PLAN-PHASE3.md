# 虛擬辦公室 Phase 3 - Standup + Status + 儀表板

## 總覽

| # | 項目 | 優先度 | 預計時間 | 負責人 | 截止日期 | 狀態 |
|---|------|--------|----------|--------|----------|------|
| 1 | Status 頻道 | 🔴 高 | 2小時 | - | - | ⏳ 開發中 |
| 2 | Standup 自動化 | 🔴 高 | 3小時 | - | - | ⏳ 開發中 |
| 3 | 進度儀表板捷徑 | 🔴 中 | 2小時 | - | - | ⏳ 開發中 |
| 4 | AI 新功能規劃 | 🟡 中 | 2小時 | - | - | 📋 規劃中 |

---

## 項目 1: Status 頻道 📊

### 目標
團隊成員用短訊息更新當前工作狀態

### 功能需求
- [x] 設立 #status 頻道
- [x] 訊息格式：「🔵 正在處理 [任務] - 預計完成時間」
- [x] Reaction 表情表達進度：
  - ✅ 完成
  - ⏳ 進行中
  - 🚫 阻礙

### Bot 命令
- `!status` - 查看所有成員狀態
- `!status set [任務]` - 設定當前狀態
- `!status done` - 標記為完成
- `!status blocker [原因]` - 標記阻礙

### 相關檔案
- `discord-bot.js` - 新增 status 命令
- `status-db.json` - 狀態記錄資料庫

---

## 項目 2: Standup 自動化 🤖

### 目標
每日定時 Bot 發送問題模板，成員回覆後自動整理發佈

### 功能需求
- [x] 每日定時發送 Standup 問題
- [x] 問題模板：
  - 「今日完成？」
  - 「明日計劃？」
  - 「阻礙？」
- [x] 成員回覆後收集回應
- [x] 自動整理並發佈至 #standups-summary 頻道
- [x] 使用 threads 收集個別回覆

### 流程
1. Bot 在 #daily-standup 發送問題 (每日 09:00)
2. 成員回覆問題 (可使用 !standup 範本)
3. Bot 收集回覆並建立 thread
4. 自動整理成摘要發佈至 #standups-summary

### Bot 命令
- `!standup` - 獲取 Standup 範本
- `!standup reply` - 回覆今日 Standup
- `!standup list` - 查看今日 Standup

### 相關檔案
- `discord-bot.js` - 新增 standup 命令
- `standup-db.json` - Standup 記錄資料庫

---

## 項目 3: 進度儀表板捷徑 📈

### 目標
在固定訊息置頂專案進度連結，使用公告頻道發佈每週進度報告

### 功能需求
- [x] 置頂訊息包含專案進度連結
  - Google Sheets
  - Notion
  - Linear
- [x] 每週進度報告自動發佈至公告頻道
- [x] 報告格式：
  - 本週完成項目
  - 進行中項目
  - 下週計劃

### 配置
```json
{
  "dashboard": {
    "links": {
      "googleSheets": "https://docs.google.com/...",
      "notion": "https://notion.so/...",
      "linear": "https://linear.app/..."
    },
    "weeklyReport": {
      "channel": "weekly-updates",
      "day": "friday",
      "time": "17:00"
    }
  }
}
```

### 相關檔案
- `discord-bot.js` - 新增 dashboard 命令
- `dashboard-config.json` - 儀表板配置

---

## 項目 4: AI 新功能規劃 🧠

### 目標
規劃智能輔助功能

### 功能清單

#### 1. AI 任務助手
- 自然語言理解任務描述
- 自動拆分任務為 subtasks
- 建議優先級和截止日期

#### 2. 智能日曆整合
- 自動檢測日曆空檔
- 建議會議時間
- 衝突檢測和提醒

#### 3. 項目進度預測
- 基於歷史數據預測完成時間
- 識別延遲風險
- 提供改進建議

#### 4. 團隊心情指數
- 定期收集成員心情回饋
- 可視化趨勢圖
- 異常檢測和提醒

#### 5. 智能提醒系統
- 基於上下文的主動提醒
- 根據任務進度調整提醒頻率
- 學習用戶習慣優化提醒

### 實現方式
- Phase 4 先實現基礎框架
- 後續逐步加入 AI 模型整合
- 考慮使用 OpenAI / Claude API

---

## 快速開始

### 啟動 Discord Bot
```bash
cd /Users/zachli/.openclaw/workspace/virtual-office
export DISCORD_BOT_TOKEN=your_token
node discord-bot.js
```

### 使用 Status 功能
```
!status                    # 查看所有成員狀態
!status set 正在開發AI功能   # 設定狀態
!status done              # 標記完成
!status blocker 缺少API金鑰  # 標記阻礙
```

### 使用 Standup 功能
```
!standup                   # 獲取 Standup 範本
!standup reply            # 回覆今日 Standup
!standup list             # 查看今日 Standup
```

### 使用 Dashboard 功能
```
!dashboard                # 查看儀表板連結
!dashboard pin            # 置頂儀表板訊息
!dashboard weekly         # 測試每週報告
```

---

## 進度追蹤

### 2026-03-21
- 開始 Phase 3 開發
- Status 頻道功能開發中
- Standup 自動化功能開發中
- 進度儀表板功能開發中
- AI 新功能規劃中

---

## 技術架構

### 資料庫結構 (JSON)

#### status-db.json
```json
{
  "members": {
    "userId": {
      "status": "working|blocked|done",
      "task": "任務描述",
      "timestamp": 1234567890,
      "updatedAt": "2026-03-21T09:00:00Z"
    }
  }
}
```

#### standup-db.json
```json
{
  "standups": [
    {
      "date": "2026-03-21",
      "userId": "user123",
      "yesterday": "完成的任務",
      "today": "計劃任務",
      "blockers": "阻礙",
      "timestamp": 1234567890
    }
  ]
}
```

### Discord 頻道結構

| 類別 | 頻道名稱 | 用途 |
|------|----------|------|
| 📊 狀態 | #status | 成員狀態更新 |
| 📊 狀態 | #standups-summary | Standup 摘要 |
| 📈 儀表板 | #project-dashboard | 儀表板連結 |

---

## 備註

- 頻道 ID 需要手動配置才能使用
- AI 功能需要後續接入 AI API
- 考慮長期使用 SQLite 取代 JSON 資料庫
