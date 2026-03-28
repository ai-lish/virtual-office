# 虛擬辦公室 (Virtual Office)

> Discord 虛擬辦公室改進計劃 - 100% 完成
> 基於 MacD 提出既 10 項建議 + AI 新提議 10 項

---

## 📌 總覽

本項目旨在優化 Discord 虛擬辦公室既運作效率，通過系統化既頻道架構、自動化工具同日常運作流程，提升團隊協作體驗。

**項目狀態**: ✅ Phase 1-7 完成 | 🔄 Phase 8 開發中 | 🔄 Phase 9 開發中 | 🔄 Phase 10 開發中

---

## ⚙️ 需要用戶設置既項目

在使用本項目前，需要完成以下配置：

### 必要配置

| 項目 | 環境變數 | 說明 |
|------|---------|------|
| Discord Bot Token | `DISCORD_BOT_TOKEN` | [Discord Developer Portal](https://discord.com/developers/applications) 創建應用並獲取 Token |
| Discord Server ID | `DISCORD_GUILD_ID` | 伺服器設定 → 右上角 ⋯ → 顯示 ID |

### Google Workspace 整合 (可選)

| 項目 | 環境變數 | 說明 |
|------|---------|------|
| Google Calendar API | `GOOGLE_CALENDAR_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/) 啟用 Calendar API |
| Google Drive API | `GOOGLE_DRIVE_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/) 啟用 Drive API |
| Notion API Key | `NOTION_API_KEY` | [Notion Developers](https://www.notion.so/my-integrations) 創建 Integration |

### GitHub 整合 (可選)

| 項目 | 環境變數 | 說明 |
|------|---------|------|
| GitHub Webhook Secret | `GITHUB_WEBHOOK_SECRET` | 用於驗證 GitHub Webhook 请求 |
| GitHub Personal Access Token | `GITHUB_TOKEN` | [GitHub Settings](https://github.com/settings/tokens) 創建 PAT |

### Phase 7 額外配置 (可選)

| 項目 | 環境變數 | 說明 |
|------|---------|------|
| RSS Feed URL | Phase 7 數據庫配置 | 要監控既 RSS Feed URL |
| GitHub Repo | Phase 7 數據庫配置 | 要監控既 GitHub Repository (owner/repo) |
| PyPI Package | Phase 7 數據庫配置 | 要監控既 PyPI 包名 |

### Voice 頻道配置

需要在 Discord 中創建以下 Voice 頻道並配置權限：
- XXX 研發室 (研發相關語音頻道)
- XXX 會議室 (會議專用頻道)

---

## 📋 Phase 1-7 全部完成既功能列表

### Phase 1: 基礎架構 ✅

| # | 功能 | 描述 | 狀態 |
|---|------|------|------|
| 1 | 專案頻道架構 | 設立明確既類別結構（籌備中/進行中/已完成/資源） | ✅ Done |
| 2 | 項目 Thread 活用 | 每個大任務建立專屬 Thread | ✅ Done |

### Phase 2: 範本與自動化 ✅

| # | 功能 | 描述 | 狀態 |
|---|------|------|------|
| 3 | 範本訊息 | 常見回報格式範本（任務更新/阻礙報告/程式碼審查請求） | ✅ Done |
| 4 | 自動化 Bot 整合 | Cron Bot（每日standup、週報催交）/ GitHub Bot（PR/Issue 更新） | ✅ Done |

**範本命令**:
```
!template task       - 任務更新範本
!template blocker    - 阻礙報告範本  
!template review     - 程式碼審查請求範本
!template standup    - 每日 Standup 範本
!template weekly     - 週報範本
!templates           - 列出所有範本
```

### Phase 3: 日常運作 ✅

| # | 功能 | 描述 | 狀態 |
|---|------|------|------|
| 5 | Standup 自動化 | 每日定時發送問題模板（昨日完成/今日計劃/障礙） | ✅ Done |
| 6 | Status 頻道 | 團隊成員更新當前工作狀態既頻道 | ✅ Done |
| 7 | 進度儀表板捷徑 | 固定訊息置頂進度連結 | ✅ Done |

**命令**:
```
!standup              - 獲取 Standup 範本
!standup reply        - 回覆今日 Standup
!standup list         - 查看今日 Standup
!standup summary      - 生成摘要

!status               - 查看所有成員狀態
!status set [任務]    - 設定當前狀態
!status done          - 標記為完成
!status blocker [原因] - 標記阻礙

!dashboard            - 查看儀表板連結
!dashboard set [type] [URL] - 設定連結
!dashboard pin        - 置頂訊息
```

### Phase 4: 進階協作 ✅

| # | 功能 | 描述 | 狀態 |
|---|------|------|------|
| 8 | 關鍵詞訂閱 | 成員自訂關鍵詞提醒機制 | ✅ Done |
| 9 | 任務指派鉤子 | Poll 投票功能用於任務指派 | ✅ Done |
| 10 | Google/Notion 整合 | /gcal, /notion 指令 | ✅ Done |

**命令**:
```
!keyword add [關鍵詞]     - 訂閱關鍵詞
!keyword remove [關鍵詞]  - 取消訂閱
!keyword list            - 查看已訂閱關鍵詞
!keyword formats         - 查看公告格式

!poll [問題]              - 創建投票
!poll quick [類型]       - 快速投票 (yesno/priority/status)
!poll urgent [問題]      - 緊急投票 (24小時)
!poll list               - 查看進行中投票
!poll close [ID]         - 結束投票

!gcal                    - 查看今日會議
!gcal week              - 查看本週會議
!notion [頁面]          - 查看 Notion 頁面
!drive                   - 查看 Drive 資料夾
!workspace config        - 設定整合
```

### Phase 5: AI 賦能 ✅

| # | 功能 | 描述 | 狀態 |
|---|------|------|------|
| 11 | AI 任務助手 | AI 輔助任務分解、進度追蹤建議 | ✅ Done |
| 12 | 智能日曆整合 | AI 驅動既會議安排、最佳時間建議 | ✅ Done |
| 13 | 項目進度預測 | AI 分析歷史數據，預測項目完成時間 | ✅ Done |

**命令**:
```
!ai analyze              - 分析所有項目進度
!ai analyze [項目名]     - 分析特定項目
!ai predict             - 預測項目完成時間
!ai calendar            - 查看今日會議
!ai calendar tomorrow   - 查看明日會議
!ai status              - 查看 AI 狀態
!analyze                - 快速分析（捷徑）
!predict                - 快速預測（捷徑）
```

### Phase 6: 高級功能 ✅

| # | 功能 | 描述 | 狀態 |
|---|------|------|------|
| 14 | 實時協作白板 | Discord 內建協作白板功能 | ✅ Done |
| 15 | 遊戲化系統 | 積分、等級、成就系統 | ✅ Done |
| 16 | 團隊心情指數 | 定期心情調查與趨勢分析 | ✅ Done |
| 17 | 智能提醒系統 | AI 驅動既智能提醒與跟進 | ✅ Done |
| 18 | 自訂義數據儀表板 | 可定制既 KPI 儀表板 | ✅ Done |

**命令**:
```
!board                   - 查看白板內容
!board add [內容]        - 添加內容到白板
!board clear             - 清除白板
!board pages             - 查看所有頁面
!board page [名稱]       - 切換頁面
!board new [名稱]        - 創建新頁面

!points                  - 查看自己既積分
!points @[人]            - 查看其他人既積分
!badges                  - 查看所有徽章
!badges @[人]            - 查看某人既徽章
!leaderboard             - 積分排行榜
!task complete [任務]    - 完成任務賺積分

!mood                    - 查看今日心情
!mood [1-5]              - 匯報今日心情 (1=幾辛苦, 5=超開心)
!mood [1-5] [備註]       - 匯報心情並備註
!mood stats              - 查看團隊心情統計
!mood chart              - 查看心情趨勢圖

!remind [內容]           - 添加提醒
!remind [小時] [內容]    - 幾小時後提醒
!reminders               - 查看所有提醒
!remind done [ID]        - 完成提醒
!remind delete [ID]      - 刪除提醒

!dashboard               - 查看完整儀表板
!dashboard tasks         - 只看任務
!dashboard points        - 只看積分
!dashboard mood          - 只看心情
!dashboard activity      - 只看活動
```

**徽章一覽**:
| 徽章 | 條件 | 獎勵 |
|------|------|------|
| 🌟 初試身手 | 完成第一個任務 | +10分 |
| ⚡ 閃電俠 | 24小時內完成任務 | +20分 |
| 🤝 團隊精神 | 協助隊友完成任務 | +15分 |
| 😊 心情大使 | 連續7天匯報心情 | +50分 |
| 🔥 持續的力量 | 連續3天完成任務 | +30分 |
| 🏆 一週冠軍 | 連續7天完成任務 | +100分 |
| 💯 百分達人 | 累積100積分 | +25分 |
| 🥇 五百強 | 累積500積分 | +100分 |
| ⏰ 提醒英雄 | 設置10個提醒 | +20分 |

### Phase 7: 日常體驗優化 ✅

| # | 功能 | 描述 | 狀態 |
|---|------|------|------|
| 19 | Webhooks 自動化 | RSS feed 更新、GitHub stars、PyPI 版本自動推送到頻道 | ✅ Done |
| 20 | 自定義開工儀式 | 每日早上 9:00 Bot 問「今日點呀？」，團隊用 emoji 回覆心情 | ✅ Done |
| 21 | Voice 頻道視覺化 | 成員加入 Voice 時自動發送「[名字] 加入左 XXX 研發室」 | ✅ Done |
| 22 | 「喺度」狀態 | 離開時打「🚪 我走先」tag Bot 記錄 | ✅ Done |
| 23 | 每週主題頻道 | 週一「問答」、週三「分享」、週五「吹水」 | ✅ Done |
| 24 | AI Summaries | 用 AI 將長對話總結成 bullet points | ✅ Done |
| 25 | Google Calendar / Outlook | 會議開始時自動推播 | ✅ Done |
| 26 | Notion / Linear 同步 | 狀態更新同步到 Discord | ✅ Done |
| 27 | Poll + Slash Commands | 快速投票決定事項、自訂 slash commands 查詢專案狀態 | ✅ Done |
| 28 | Analytics + 行為規範 | 定期查看 Channel/Thread 使用統計、制定「溝通公約」 | ✅ Done |

**命令**:
```
!phase7                         - Phase 7 幫助
!phase7 webhook add [類型]     - 添加 Webhook (rss/github/pypi)
!phase7 webhook list           - 查看 Webhook 列表
!phase7 greeting set [#channel] - 設定每日問候頻道
!phase7 voice join [#channel]  - 設定 Voice 加入通知
!phase7 voice leave [#channel] - 設定 Voice 離開通知
!phase7 ondi set [#channel]    - 設定「喺度」狀態頻道
!phase7 ondi history           - 查看「喺度」歷史
!phase7 theme                  - 查看今日主題
!phase7 theme set [#channel]   - 設定主題頻道
!phase7 stats                  - 查看使用統計
!stats                         - 快速查看統計 (捷徑)
!summarize                     - 手動觸發對話總結
!sync notion                   - 同步到 Notion
!sync linear                   - 同步到 Linear
```

---

## 📋 Phase 8: MacD 的 10 項建議 🔄 開發中

### 🧵 Threads 功能 (2項)

| # | 功能 | 優先度 | 負責人 | 截止日期 | 狀態 |
|---|------|--------|--------|----------|------|
| T1 | Thread Templates - 統一團隊工作日誌格式 | P2 | 書記 | 2026-04-08 | 🔄 開發中 |
| T2 | Forum Channel - 每個項目一個討論串 | P2 | 師弟 | 2026-04-10 | 🔄 開發中 |

### 🤖 Bot 指令優化 (2項)

| # | 功能 | 優先度 | 負責人 | 截止日期 | 狀態 |
|---|------|--------|--------|----------|------|
| B1 | 指令分類目錄 - Select Menu 選擇不同功能模組 | P2 | 師弟 | 2026-04-12 | 🔄 開發中 |
| B2 | 斜線指令自動完成 - (/) 提升指令輸入效率 | P3 | 師弟 | 2026-04-18 | 🔄 開發中 |

### 🔗 Integrations 整合 (2項)

| # | 功能 | 優先度 | 負責人 | 截止日期 | 狀態 |
|---|------|--------|--------|----------|------|
| I1 | GitHub Webhook - commit 和 PR 更新 | P2 | 師弟 | 2026-04-08 | 🔄 開發中 |
| I2 | Google Calendar - 新會議自動提醒 | P2 | 師弟 | 2026-04-10 | 🔄 開發中 |

### 📊 狀態追蹤系統 (2項)

| # | 功能 | 優先度 | 負責人 | 截止日期 | 狀態 |
|---|------|--------|--------|----------|------|
| S1 | 狀態追蹤系統 - Embed 消息格式展示項目狀態卡片 | P2 | T仔 | 2026-04-15 | 🔄 開發中 |
| S2 | 統計報告 - 追蹤任務完成率、頻道活躍度 | P2 | T仔 | 2026-04-20 | 🔄 開發中 |

### 🔔 通知與提醒 (2項)

| # | 功能 | 優先度 | 負責人 | 截止日期 | 狀態 |
|---|------|--------|--------|----------|------|
| N1 | Cron Job 提醒 - 指定時間發送任務提醒 | P3 | 書記 | 2026-04-15 | 🔄 開發中 |
| N2 | 自動化工作流 - 根據關鍵詞觸發自動工作流 | P3 | 師弟 | 2026-04-22 | 🔄 開發中 |

---

### 📋 N1: Cron Job 提醒 Bot 詳細實施計劃

**功能需求：**
- `!cron add [HH:MM] [message]` - 添加定時提醒
- `!cron list` - 查看所有提醒
- `!cron delete [ID]` - 刪除提醒
- Bot 在指定時間自動發送到頻道

#### 1. 數據結構設計

**文件：`cron-db.json`**

```json
{
  "reminders": [
    {
      "id": "crn_001",
      "time": "09:00",
      "message": "今日 standup 提醒",
      "channelId": "1483436247618682900",
      "createdBy": "user_123",
      "createdAt": "2026-03-23T13:00:00Z",
      "repeat": "daily",
      "priority": "normal",
      "deadline": null,
      "active": true
    }
  ],
  "lastId": 1
}
```

**欄位說明：**

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | string | 唯一識別碼 (格式: `crn_XXX`) |
| `time` | string | 提醒時間 (HH:MM 格式) |
| `message` | string | 提醒訊息內容 |
| `channelId` | string | 發送目標頻道 ID |
| `createdBy` | string | 創建者用戶 ID |
| `createdAt` | string | ISO 8601 創建時間 |
| `repeat` | string | 重複模式: `none` / `daily` / `weekly` / `monthly` |
| `priority` | string | 優先度: `low` / `normal` / `high` / `urgent` |
| `deadline` | string? | 截止日期 (可選, ISO 8601) |
| `active` | boolean | 是否啟用 |

**優先度定義：**

| 等級 | 顏色 | 使用場景 |
|------|------|----------|
| `urgent` | 🔴 紅色 | 緊急任務 |
| `high` | 🟠 橙色 | 重要任務 |
| `normal` | 🟡 黃色 | 一般提醒 |
| `low` | ⚪ 灰色 | 低優先度 |

#### 2. 命令設計

| 命令 | 說明 | 範例 |
|------|------|------|
| `!cron add [HH:MM] [message]` | 添加定時提醒 | `!cron add 09:00 今日 standup` |
| `!cron add [HH:MM] [message] --repeat daily` | 添加每日重複提醒 | `!cron add 10:00 團隊會議 --repeat daily` |
| `!cron add [HH:MM] [message] --priority high` | 指定優先度 | `!cron add 14:00 截止 --priority high` |
| `!cron add [HH:MM] [message] --deadline [YYYY-MM-DD]` | 設定截止日期 | `!cron add 18:00 提交報告 --deadline 2026-04-15` |
| `!cron list` | 查看所有提醒 | `!cron list` |
| `!cron list --active` | 只看啟用中的提醒 | `!cron list --active` |
| `!cron list --by @[用戶]` | 查看特定用戶的提醒 | `!cron list --by @John` |
| `!cron delete [ID]` | 刪除提醒 | `!cron delete crn_001` |
| `!cron edit [ID] [new time/message]` | 編輯提醒 | `!cron edit crn_001 10:00 新訊息` |
| `!cron toggle [ID]` | 啟用/停用提醒 | `!cron toggle crn_001` |
| `!cron help` | 查看幫助 | `!cron help` |

#### 3. 定時執行機制

**核心邏輯 (`cron-scheduler.js`)：**

```
每分鐘檢查一次 (setInterval 60秒)
  └─ 獲取當前時間 (HH:MM)
  └─ 查詢 cron-db.json 中 matching reminders
  └─ 過濾條件: time === currentTime && active === true
  └─ 發送訊息到對應頻道
  └─ 若 repeat !== 'none', 更新下次觸發時間
  └─ 若有 deadline 且已過期, 標記為過期或刪除
```

**系統架構：**

```
┌──────────────────────────────────────────────┐
│              Cron Scheduler                   │
│  ┌─────────────┐  ┌────────────────────────┐ │
│  │ Time Checker │─▶│ Reminder Matcher       │ │
│  │ (每分鐘)     │  │ (比對 HH:MM + active)  │ │
│  └─────────────┘  └────────────────────────┘ │
│           │                    │            │
│           ▼                    ▼            │
│  ┌─────────────┐  ┌────────────────────────┐ │
│  │ Message     │  │ Discord Channel        │ │
│  │ Formatter   │─▶│ Sender                 │ │
│  └─────────────┘  └────────────────────────┘ │
└──────────────────────────────────────────────┘
```

**重複邏輯：**

| 模式 | 行為 |
|------|------|
| `none` | 觸發後自動刪除 |
| `daily` | 每天同一時間觸發 |
| `weekly` | 每週同一天觸發 (需存儲星期幾) |
| `monthly` | 每月同一天觸發 |

#### 4. Discord 訊息格式

**普通提醒 Embed：**

```
┌─────────────────────────────────────────────┐
│  ⏰ 定時提醒                                 │
├─────────────────────────────────────────────┤
│  📌 訊息：今日 standup 提醒                  │
│  📅 日期：2026-03-23                        │
│  ⏰ 時間：09:00                             │
│  👤 建立者：@用戶                            │
│  🔄 重複：每日                              │
│  🏷️ 優先度：普通 (🟡)                        │
├─────────────────────────────────────────────┤
│  🆔 ID: crn_001 | 狀態：啟用中              │
└─────────────────────────────────────────────┘
```

**緊急提醒 (priority: urgent)：**

```
┌─────────────────────────────────────────────┐
│  🔴 URGENT - 緊急提醒                        │
├─────────────────────────────────────────────┤
│  🚨 訊息：[緊急任務內容]                      │
│  ⏰ 觸發時間：14:00                          │
│  🏷️ 優先度：緊急 (🔴)                        │
├─────────────────────────────────────────────┤
│  🆔 ID: crn_002 | 截止：2026-03-25          │
└─────────────────────────────────────────────┘
```

**列表顯示 (compact 格式)：**

```
📋 定時提醒列表
━━━━━━━━━━━━━━━━━━━━━━
1. 🟡 [09:00] 今日 standup - daily
2. 🟠 [10:00] 團隊會議 - weekly  
3. 🔴 [14:00] [URGENT] 緊急任務 - none
━━━━━━━━━━━━━━━━━━━━━━
共 3 個提醒 | 使用 !cron delete [ID] 刪除
```

#### 5. 優先度與截止日期

**優先度系統：**

| 等級 | 關鍵詞 | 顏色 | DM 通知 |
|------|--------|------|---------|
| `urgent` | `--priority urgent` | 0xFF0000 (紅) | 是 (立即) |
| `high` | `--priority high` | 0xFFA500 (橙) | 是 |
| `normal` | `--priority normal` | 0xFFFF00 (黃) | 否 |
| `low` | `--priority low` | 0x808080 (灰) | 否 |

**截止日期功能：**

- 設定方式：`--deadline YYYY-MM-DD` 或 `--deadline YYYY-MM-DD HH:MM`
- 截止前 24 小時：自動 DM 提醒
- 截止前 1 小時：再次 DM 提醒
- 截止時：Bot 發送「已截止」提示
- 逾期未完成：自動停用該提醒或刪除

**截止日期觸發流程：**

```
到期前 24 小時
  └─ DM 創建者：「提醒：明天截止 - [任務]」
  └─ 更新 reminder.deadlineNotified24h = true

到期前 1 小時
  └─ DM 創建者：「提醒：1小時後截止 - [任務]」
  └─ 更新 reminder.deadlineNotified1h = true

到期時 (HH:MM)
  └─ 發送到頻道：「⏰ [任務] 已到截止時間！」
  └─ 發送 DM：「[任務] 已截止，請確認完成狀態」

逾期後 (額外 1 小時)
  └─ 發送 DM：「[任務] 已逾期，請處理或刪除」
  └─ 自動停用或標記為過期
```

#### 6. 實作檔案

| 檔案 | 說明 |
|------|------|
| `cron-db.json` | 提醒數據庫 |
| `phase-cron.js` | Cron Job 功能模組 |
| `cron-scheduler.js` | 定時執行器 |

#### 7. 整合 Phase 6 提醒系統

現有 `!remind` 指令與新 `!cron` 系統整合：

| 現有 (!remind) | 新增 (!cron) |
|----------------|--------------|
| 相對時間 (X 小時後) | 絕對時間 (HH:MM) |
| 單次觸發 | 可重複 |
| 簡單訊息 | 含優先度/截止日期 |
| 一次性 | 持久化 |

---

### 📋 Phase 8 完整實施計劃（MacD 10 項 + AI 10 項）

> 基於 MacD 既 10 項建議 + AI 新提議 10 項，整合為 Phase 8 統一實施計劃

### 🧵 Thread & Forum 功能

| # | 功能 | 優先度 | 負責人 | 截止日期 | 狀態 |
|---|------|--------|--------|----------|------|
| T1 | Thread Templates - 統一團隊工作日誌格式 | P2 | 書記 | 2026-04-08 | 🔄 開發中 |
| T2 | Forum Channel - 每個項目一個討論串 | P2 | 師弟 | 2026-04-10 | 🔄 開發中 |
| T3 | 每週進度 Thread - 團隊成員在獨立空間更新進展 | P3 | 書記 | 2026-04-15 | 🔄 開發中 |
| T4 | Thread 封存（重要訊息歸檔） | P6 | T仔 | 2026-05-04 | 🔄 開發中 |

### 🤖 Bot 指令優化

| # | 功能 | 優先度 | 負責人 | 截止日期 | 狀態 |
|---|------|--------|--------|----------|------|
| B1 | 指令分類目錄 - Select Menu 選擇不同功能模組 | P2 | 師弟 | 2026-04-12 | 🔄 開發中 |
| B2 | 斜線指令自動完成 - (/) 提升指令輸入效率 | P3 | 師弟 | 2026-04-18 | 🔄 開發中 |
| B3 | Button Components - 指令回覆變得互動式 | P3 | T仔 | 2026-04-20 | 🔄 開發中 |
| B4 | 自定義指令功能 - 用戶建立自己的指令 | P4 | 師弟 | 2026-04-25 | 🔄 開發中 |

### 🔗 Integrations 整合

| # | 功能 | 優先度 | 負責人 | 截止日期 | 狀態 |
|---|------|--------|--------|----------|------|
| I1 | GitHub Webhook - commit 和 PR 更新 | P2 | 師弟 | 2026-04-08 | 🔄 開發中 |
| I2 | Google Calendar - 新會議自動提醒 | P2 | 師弟 | 2026-04-10 | 🔄 開發中 |
| I3 | Notion/Airtable → 任務更新同步 | P1 | 師弟 | 2026-04-04 | 🔄 開發中 |
| I4 | Jenkins/CI → 建置狀態即時通知 | P2 | 師弟 | 2026-04-11 | 🔄 開發中 |
| I5 | Linear 同步 - 狀態更新同步到 Discord | P3 | 師弟 | 2026-04-15 | 🔄 開發中 |

### 📊 狀態追蹤系統

| # | 功能 | 優先度 | 負責人 | 截止日期 | 狀態 |
|---|------|--------|--------|----------|------|
| S1 | Embed 消息格式 - 項目狀態卡片展示 | P2 | T仔 | 2026-04-15 | 🔄 開發中 |
| S2 | 統計報告 - 任務完成率、頻道活躍度追蹤 | P2 | T仔 | 2026-04-20 | 🔄 開發中 |
| S3 | 番茄工作法機器人 - 定時詢問工作進展 | P3 | 書記 | 2026-04-18 | 🔄 開發中 |
| S4 | 機器人驅動的狀態儀表板 - 實時顯示團隊工作進度 | P2 | T仔 | 2026-04-12 | 🔄 開發中 |

### 🔔 通知與提醒

| # | 功能 | 優先度 | 負責人 | 截止日期 | 狀態 |
|---|------|--------|--------|----------|------|
| N1 | Cron Job 提醒 - 指定時間發送任務提醒 | P3 | 書記 | 2026-04-15 | 🔄 開發中 |
| N2 | 自動化工作流 - 根據關鍵詞觸發自動工作流 | P3 | 師弟 | 2026-04-22 | 🔄 開發中 |
| N3 | Channel Follow - 重要頻道消息跨伺服器共享 | P4 | 師弟 | 2026-04-20 | 🔄 開發中 |
| N4 | 截止前自動 DM 負責人提醒 | P3 | 書記 | 2026-04-18 | 🔄 開發中 |
| N5 | 安靜時段設定（晚上11點後禁聲） | P4 | 師弟 | 2026-04-18 | 🔄 開發中 |
| N6 | 每月清理閒置頻道/threads | P5 | 書記 | 2026-04-25 | 🔄 開發中 |

| # | 功能 | 優先度 | 負責人 | 截止日期 | 狀態 |
|---|------|--------|--------|----------|------|
| 1 | Notion/Airtable → 任務更新同步 | P1 | 師弟 | 2026-04-04 | ⏳ 籌備中 |
| 2 | Jenkins/CI → 建置狀態即時通知 | P2 | 師弟 | 2026-04-11 | ⏳ 籌備中 |
| 3 | 截止前自動 DM 負責人提醒 | P3 | 書記 | 2026-04-18 | ⏳ 籌備中 |
| 4 | 設定安靜時段（晚上 11 點後禁聲） | P4 | 師弟 | 2026-04-18 | ⏳ 籌備中 |
| 5 | 每月清理閒置頻道/threads | P5 | 書記 | 2026-04-25 | ⏳ 籌備中 |
| 6 | Thread 封存（重要訊息歸檔） | P6 | T仔 | 2026-05-04 | ⏳ 籌備中 |

### 功能詳情

**1. Notion/Airtable → 任務更新同步**
- 當 Notion 或 Airtable 中既任務狀態更新時，自動同步到 Discord
- 支援狀態變更、截止日期更新、負責人異動
- 需要整合 Notion API / Airtable API

**2. Jenkins/CI → 建置狀態即時通知**
- 建置開始/成功/失敗時自動推送到指定頻道
- 支援自定義通知條件（如只通知失敗）
- 需要 Jenkins Webhook 或 API 輪詢

**3. 截止前自動 DM 負責人提醒**
- 任務截止前 24 小時/1 小時自動 DM 負責人提醒
- 可自定義提醒時間間隔
- 需要任務數據庫支持

**4. 設定安靜時段（晚上 11 點後禁聲）**
- 自動識別安靜時段，暫停非緊急通知
- 緊急訊息（如 @here、@everyone）仍正常推送
- 可自定義安靜時段時間

**5. 每月清理閒置頻道/threads**
- 每月自動識別並歸檔/刪除長期無活動既頻道或 threads
- 預設 30 日無活動視為閒置
- 需要記錄最後活動時間

**6. Thread 封存（重要訊息歸檔）**
- 為重要討論串啟用封存功能
- 保留記錄但從主頻道隱藏
- 需要手動觸發或關鍵詞自動觸發

---

## 📋 第1-5組建議完整實施計劃 (Implementation Master Plan)

基於第1-5組生成的所有建議，按類別整理如下：

### 🧵 Threads & Forum

| # | 建議 | 優先度 | 負責人 | 截止日期 | 狀態 |
|---|------|--------|--------|----------|------|
| T1 | Thread Templates - 統一團隊工作日誌格式 | P2 | 書記 | 2026-04-08 | 🔄 開發中 |
| T2 | Forum Channel - 每個項目一個討論串 | P2 | 師弟 | 2026-04-10 | 🔄 開發中 |
| T3 | 每週進度 Thread - 團隊成員在獨立空間更新進展 | P3 | 書記 | 2026-04-15 | 🔄 開發中 |
| T4 | Thread 封存（重要訊息歸檔） | P6 | T仔 | 2026-05-04 | 🔄 開發中 |

### 🤖 Bot Commands

| # | 建議 | 優先度 | 負責人 | 截止日期 | 狀態 |
|---|------|--------|--------|----------|------|
| B1 | 指令分類目錄 - Select Menu 選擇不同功能模組 | P2 | 師弟 | 2026-04-12 | 🔄 開發中 |
| B2 | 斜線指令自動完成 - (/) 提升指令輸入效率 | P3 | 師弟 | 2026-04-18 | 🔄 開發中 |
| B3 | Button Components - 指令回覆變得互動式 | P3 | T仔 | 2026-04-20 | 🔄 開發中 |
| B4 | 自定義指令功能 - 用戶建立自己的指令 | P4 | 師弟 | 2026-04-25 | 🔄 開發中 |

### 🔗 Integrations (Notion/GitHub)

| # | 建議 | 優先度 | 負責人 | 截止日期 | 狀態 |
|---|------|--------|--------|----------|------|
| I1 | GitHub Webhook - commit 和 PR 更新 | P2 | 師弟 | 2026-04-08 | 🔄 開發中 |
| I2 | Google Calendar - 新會議自動提醒 | P2 | 師弟 | 2026-04-10 | 🔄 開發中 |
| I3 | Notion/Airtable → 任務更新同步 | P1 | 師弟 | 2026-04-04 | 🔄 開發中 |
| I4 | Jenkins/CI → 建置狀態即時通知 | P2 | 師弟 | 2026-04-11 | 🔄 開發中 |
| I5 | Linear 同步 - 狀態更新同步到 Discord | P3 | 師弟 | 2026-04-15 | 🔄 開發中 |

### 📊 Status Tracking

| # | 建議 | 優先度 | 負責人 | 截止日期 | 狀態 |
|---|------|--------|--------|----------|------|
| S1 | 番茄工作法機器人 - 定時詢問工作進展 | P3 | 書記 | 2026-04-18 | 🔄 開發中 |
| S2 | 機器人驅動的狀態儀表板 - 實時顯示團隊工作進度 | P2 | T仔 | 2026-04-12 | 🔄 開發中 |
| S3 | Embed 消息格式 - 項目狀態卡片 | P3 | T仔 | 2026-04-15 | 🔄 開發中 |
| S4 | 團隊統計功能 - 成員活躍度 | P4 | T仔 | 2026-04-22 | 🔄 開發中 |

### 🔔 Notifications & Reminders

| # | 建議 | 優先度 | 負責人 | 截止日期 | 狀態 |
|---|------|--------|--------|----------|------|
| N1 | Channel Follow - 重要頻道消息跨伺服器共享 | P4 | 師弟 | 2026-04-20 | 🔄 開發中 |
| N2 | Cron Job 機器人 - 指定時間發送任務提醒 | P3 | 書記 | 2026-04-15 | 🔄 開發中 |
| N3 | 截止前自動 DM 負責人提醒 | P3 | 書記 | 2026-04-18 | 🔄 開發中 |
| N4 | 安靜時段設定（晚上11點後禁聲） | P4 | 師弟 | 2026-04-18 | 🔄 開發中 |
| N5 | 每月清理閒置頻道/threads | P5 | 書記 | 2026-04-25 | 🔄 開發中 |

### 🎮 Gamification

| # | 建議 | 優先度 | 負責人 | 截止日期 | 狀態 |
|---|------|--------|--------|----------|------|
| G1 | 遊戲化系統 - 積分、等級、成就 | P3 | 師弟 | 2026-04-15 | 🔄 開發中* |
| G2 | 每日挑戰、任務成就徽章 | P4 | T仔 | 2026-04-22 | 🔄 開發中 |
| G3 | 心情回饋系統 | P4 | 書記 | 2026-04-20 | 🔄 開發中 |

*註: G1 已喺 Phase 6 部分實現

### 🎨 UX Improvements

| # | 建議 | 優先度 | 負責人 | 截止日期 | 狀態 |
|---|------|--------|--------|----------|------|
| U1 | 成功操作的反饋提示 (綠色提示) | P3 | T仔 | 2026-04-18 | 🔄 開發中 |
| U2 | 常用指令的快速回覆按鈕 | P3 | T仔 | 2026-04-18 | 🔄 開發中 |
| U3 | 指令回覆時的載入狀態顯示 | P4 | 師弟 | 2026-04-20 | 🔄 開發中 |
| U4 | 深色模式切換功能 | P5 | 師弟 | 2026-04-28 | 🔄 開發中 |
| U5 | 數據庫查詢優化 - 減少 JSON 文件讀寫次數 | P4 | 師弟 | 2026-04-22 | 🔄 開發中 |
| U6 | 錯誤日誌系統 | P5 | 師弟 | 2026-04-25 | 🔄 開發中 |

---

### 📊 實施計劃摘要

| 類別 | 總數 | P1 | P2 | P3 | P4 | P5 | P6 |
|------|------|----|----|----|----|----|----|
| Threads & Forum | 4 | 0 | 2 | 1 | 0 | 0 | 1 |
| Bot Commands | 4 | 0 | 1 | 2 | 1 | 0 | 0 |
| Integrations | 5 | 1 | 3 | 1 | 0 | 0 | 0 |
| 狀態追蹤系統 | 4 | 0 | 3 | 1 | 0 | 0 | 0 |
| 通知與提醒 | 6 | 0 | 0 | 3 | 3 | 0 | 0 |
| Gamification | 3 | 0 | 0 | 1 | 2 | 0 | 0 |
| UX Improvements | 6 | 0 | 0 | 2 | 3 | 1 | 0 |
| **總計** | **32** | **1** | **9** | **11** | **9** | **1** | **1** |

### 📅 里程碑

| 日期 | 批次 | 預期完成 | 負責人 |
|------|------|----------|--------|
| 2026-04-04 | 首批 (I3) | Notion/Airtable 同步 | 師弟 |
| 2026-04-08 | 第二批 (T1, I1) | Thread Templates + GitHub Webhook | 書記/師弟 |
| 2026-04-10 | 第三批 (T2, I2) | Forum Channel + Google Calendar | 師弟 |
| 2026-04-12 | 第四批 (B1, S2) | 指令分類 + 狀態儀表板 | 師弟/T仔 |
| 2026-04-15 | 第五批 (T3, I5, S1, N1) | 每週進度 + Linear + Embed卡片 + Cron提醒 | 書記/師弟/T仔 |
| 2026-04-18 | 第六批 (B2, S3, N4, N5) | 斜線指令 + 番茄鐘 + DM提醒 + 安靜時段 | 師弟/書記 |
| 2026-04-20 | 第七批 (S2, N3, B3) | 統計報告 + Channel Follow + 按鈕組件 | T仔/師弟 |
| 2026-04-22 | 第八批 (N2, B4) | 自動化工作流 + 自定義指令 | 師弟 |
| 2026-04-25 | 第九批 (N6) | 每月清理閒置頻道 | 書記 |
| 2026-05-04 | 最終 (T4) | Thread 封存 | T仔 |

---

### 🔧 技術改進 (同步進行)

| # | 項目 | 優先度 | 負責人 | 狀態 |
|---|------|--------|--------|------|
| T1 | 單元測試框架建立 | P4 | T仔 | ⏳ 籌備中 |
| T2 | 代碼重構 - 將大型 Phase 文件拆分成模組 | P4 | 師弟 | ⏳ 籌備中 |
| T3 | 開發者文檔編寫 | P5 | 書記 | ⏳ 籌備中 |

---

## 🛠️ 技術栈

- Discord Bot (discord.js)
- GitHub API / Webhooks
- Google Calendar API
- Google Drive API
- Notion API
- Linear API
- RSS/Atom Feeds
- PyPI API
- AI/LLM API (可選)

---

## 🚀 快速開始

### 1. 安裝依賴

```bash
cd virtual-office
npm install
```

### 2. 環境配置

創建 `.env` 文件：

```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_server_id_here

# 可選：Google Workspace
GOOGLE_CALENDAR_API_KEY=your_google_api_key
GOOGLE_DRIVE_API_KEY=your_google_drive_key
NOTION_API_KEY=your_notion_key

# 可選：GitHub
GITHUB_WEBHOOK_SECRET=your_webhook_secret
GITHUB_TOKEN=your_github_token
```

### 3. 啟動 Bot

```bash
node discord-bot.js
```

---

## 📁 項目結構

```
virtual-office/
├── discord-bot.js          # 主 Bot 檔案
├── phase5-ai-features.js   # Phase 5 AI 功能
├── phase6-ai-features.js   # Phase 6 高級功能
├── phase7-new-features.js  # Phase 7 新功能
├── config.json             # Bot 配置
├── templates.json           # 範本配置
├── cron-config.json        # Cron 排程配置
├── keyword-db.json         # 關鍵詞訂閱數據
├── poll-db.json            # 投票數據
├── phase5-data.json        # Phase 5 數據
├── phase6-data.json        # Phase 6 數據
├── phase7-data.json        # Phase 7 數據
└── analytics-db.json       # 使用統計數據
```

---

## 👥 團隊成員

| 角色 | 負責範圍 |
|------|----------|
| 書記 | 文書記錄、報告生成、範本製作 |
| 師弟 | 開發、編程、Bot 整合 |
| T仔 | 測試、Quality Control |
| 小詩 | 教學輔導 |

---

## 📋 Phase 9: ClawTeam 實時狀態網站整合 🔄 開發中

### 🎯 目標

1. 在 Virtual Office 網站上即時顯示 ClawTeam 代理集群工作狀態
2. 展示活躍團隊、任務、代理活動
3. 實現 OpenClaw 子代理 + ClawTeam + Virtual Office 網站三方整合

### 📊 數據來源

| 數據源 | 路徑 | 用途 |
|--------|------|------|
| OpenClaw 狀態 | `~/.openclaw/subagents/runs.json` | 運行中的子代理任務 |
| 代理狀態 | `~/.openclaw/workspace/virtual-office/status.json` | 各代理在線/離線狀態 |
| 代理工作目錄 | `~/.openclaw/workspace/agents/{agent}/` | 各代理的身份、工作日誌 |
| ClawTeam 配置 | `~/.clawteam/config.json` | 團隊配置 |
| Discord 數據 | Virtual Office Bot 數據庫 | 任務、投票、心情等 |

### 🏗️ 系統架構

```
┌─────────────────────────────────────────────────────────────┐
│                    Virtual Office 網站                       │
│                   (https://ai-lish.github.io/virtual-office)│
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Agent Status │  │ Task Kanban │  │ Activity Timeline   │ │
│  │ Dashboard    │  │ Board       │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    API Layer (server.js)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │ OpenClaw Status  │  │ Discord Bot Data                │ │
│  │ Reader           │  │ Reader (tasks, polls, mood)     │ │
│  └──────────────────┘  └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 📦 需要實現的組件

#### 1. ClawTeam Status API

| 功能 | 描述 | 優先度 |
|------|------|--------|
| 代理狀態端點 | `/api/agents` - 返回所有代理狀態 | P1 |
| 任務狀態端點 | `/api/tasks` - 返回 kanban 任務 | P1 |
| 活動時間線端點 | `/api/activity` - 返回最近活動 | P2 |
| 團隊狀態端點 | `/api/teams` - 返回團隊信息 | P2 |
| Webhook 更新 | 實時推送代理狀態變化 | P3 |

#### 2. 網站 Dashboard 組件

| 組件 | 描述 | 優先度 |
|------|------|--------|
| Active Agents Panel | 顯示所有代理頭像、狀態、當前任務 | P1 |
| Task Kanban Board | 拖拽式任務看板 (pending/in_progress/completed/blocked) | P1 |
| Activity Timeline | 最近活動時間線 | P2 |
| Team Status Grid | 團隊成員狀態網格 | P2 |
| Real-time Updates | WebSocket/SSE 實時更新 | P1 |

#### 3. 數據整合

| 數據類型 | 來源 | 更新頻率 |
|----------|------|----------|
| 代理在線狀態 | status.json | 10秒 |
| 運行中的任務 | runs.json | 30秒 |
| 任務看板數據 | Discord/polls-db.json | 60秒 |
| 心情指數 | phase6-data.json | 5分鐘 |
| 活動日誌 | agents/*/memory/ | 實時 |

### 🔄 實施計劃

#### Step 1: API 層開發 (預計 2 小時)

```
1.1 創建 status-api.js
    - readOpenClawStatus(): 讀取 runs.json
    - readAgentStatus(): 讀取 status.json
    - readTaskData(): 讀取 Discord Bot 數據庫

1.2 添加 Express 路由
    GET /api/agents
    GET /api/tasks
    GET /api/activity
    GET /api/teams

1.3 添加 CORS 配置
```

#### Step 2: 前端 Dashboard 開發 (預計 4 小時)

```
2.1 Agent Status Panel
    - 代理頭像 + 名稱
    - 狀態指示器 (在線/離線/工作中)
    - 當前任務描述
    - 最後活躍時間

2.2 Task Kanban Board
    - 4 列: pending | in_progress | completed | blocked
    - 卡片顯示: 任務名、負責人、截止時間
    - 顏色編碼優先度

2.3 Activity Timeline
    - 時間線組件
    - 顯示: 代理、動作、目標、時間
    - 分頁/無限滾動
```

#### Step 3: 實時更新 (預計 2 小時)

```
3.1 Polling 機制
    - 每 10-30 秒輪詢 API
    - 自動重試機制

3.2 WebSocket/SSE (可選)
    - server.js 添加 ws 支持
    - 客戶端建立連接
    - 服務端推送更新
```

#### Step 4: 數據整合 (預計 2 小時)

```
4.1 Discord Bot 數據映射
    - poll-db.json → Task data
    - phase6-data.json → Mood data
    - keyword-db.json → Subscriptions

4.2 OpenClaw 數據映射
    - runs.json → Active tasks
    - status.json → Agent status
    - agents/*/IDENTITY.md → Agent info
```

### 📁 文件結構

```
virtual-office/
├── status-api.js          # NEW: API 層
├── public/
│   ├── css/
│   │   ├── dashboard.css  # NEW: Dashboard 樣式
│   │   └── kanban.css     # NEW: Kanban 樣式
│   └── js/
│       ├── dashboard.js   # NEW: Dashboard 邏輯
│       ├── kanban.js      # NEW: Kanban 邏輯
│       └── timeline.js    # NEW: Timeline 邏輯
└── index.html            # 更新: 添加 dashboard 區域
```

### ✅ 驗收標準

| 標準 | 描述 |
|------|------|
| API 響應 | 所有端點在 500ms 內響應 |
| 實時性 | 狀態更新延遲 < 30秒 |
| 穩定性 | 99% 可用率 |
| 用戶體驗 | 頁面加載時間 < 3秒 |

### 🔄 4 週同步建設計劃 (🔄 開發中)

| 週次 | 主題 | 狀態 |
|------|------|------|
| Week 1 | 核心同步 (WebSocket + API) | 🔄 開發中 |
| Week 2 | 狀態/投票/Pomodoro/心情 | 🔄 開發中 |
| Week 3 | 提醒/積分/日曆/白板 | 🔄 開發中 |
| Week 4 | Forum/範本/統計 | 🔄 開發中 |

### 🔗 相關資源

- 網站: https://ai-lish.github.io/virtual-office
- GitHub: https://github.com/ai-lish/virtual-office
- OpenClaw 運行數據: `~/.openclaw/subagents/runs.json`
- 代理工作區: `~/.openclaw/workspace/agents/`

---

---

## 📋 Phase 10: Analytics/Productivity Tracking 🔄 開發中

### 🎯 目標

提供團隊生產力數據分析，追蹤任務完成率、頻道活躍度，並生成每月團隊生產力報告與可視化進度圖表。

### 📊 功能列表

| # | 功能 | 描述 |
|---|------|------|
| 1 | 追蹤任務完成率 | 追蹤每個任務的完成進度，計算即時完成率 |
| 2 | 統計頻道活躍度 | 統計各頻道的訊息量、成員參與度 |
| 3 | 每月團隊生產力報告 | 自動生成每月團隊生產力摘要報告 |
| 4 | 可視化進度圖表 | 用圖表展示任務進度、活躍趨勢、生產力統計 |

### 📈 追蹤指標

| 指標 | 說明 |
|------|------|
| 任務完成率 | 已完成任務 / 總任務數 |
| 頻道活躍度 | 每日/每週訊息數、活躍成員數 |
| 響應時間 | 從任務創建到完成的平均時間 |
| 阻塞率 | 被標記為阻塞的任務比例 |
| 參與度 | 每位成員的訊息/回覆頻率 |

### 🔧 實現方式

```
1. 任務追蹤
   - 從 poll-db.json、phase6-data.json 讀取任務數據
   - 計算完成率並存入 analytics-db.json

2. 頻道統計
   - 記錄每日頻道訊息數
   - 統計成員參與度

3. 月度報告
   - 每月底自動生成報告
   - 發送到指定頻道

4. 視覺化
   - 使用 ASCII/Embed 圖表
   - 支援 !stats 查看儀表板
```

### 📁 相關文件

- `analytics-db.json` - Analytics 數據存儲
- `phase10-analytics.js` - Phase 10 功能模組

### 📅 狀態

| 項目 | 狀態 |
|------|------|
| 任務追蹤系統 | 🔄 開發中 |
| 頻道活躍度統計 | 🔄 開發中 |
| 月度報告生成器 | 🔄 開發中 |
| 可視化圖表 | 🔄 開發中 |

---

## 📋 Phase 11: Minimax Token 使用情況分析系統 🔄 開發中

### 🎯 目標

記錄、分析、可視化所有 Minimax API 調用的 token 使用情況，幫助團隊了解用量模式、控制成本、優化 prompt。

**數據來源：** Google Drive CSV 檔案（Minimax Console 導出）

---

### 📊 CSV 欄位對照

| CSV 欄位 | 類型 | 說明 |
|----------|------|------|
| `Secret key name` | string | API Key 名稱 |
| `Consumed API` | enum | `chatcompletion-v2`, `cache-read`, `cache-create`, `code_plan_resource_package` |
| `Consumed model` | enum | `MiniMax-M2.5`, `MiniMax-M2.7`, `coding-plan-vlm` |
| `Amount spent` | number | 消費金額（目前都係0） |
| `Amount After Voucher` | number | 使用優惠券後金額 |
| `Input usage quantity` | number | 輸入 Token 數 |
| `Output usage quantity` | number | 輸出 Token 數 |
| `Total usage quantity` | number | 總 Token 數 (= Input + Output) |
| `Consumption time(UTC)` | datetime | 消費時間 (UTC) |
| `Consumption status` | enum | 消費狀態 |

---

### 📊 功能需求

| # | 功能 | 描述 |
|---|------|------|
| T1 | CSV Import | 從 Google Drive 自動下載並解析 Minimax CSV |
| T2 | Token 記錄 | 記錄每次 API 調用的 token 使用情況 |
| T3 | Cache 分析 | 計算 Cache Hit Rate = cache-read / (cache-read + cache-create) |
| T4 | 使用模式分析 | 按時間、按 API、按 Model 分析使用模式 |
| T5 | 可視化儀表板 | 圖表、趨勢、展示詳細統計數據 |
| T6 | VLM 追蹤 | 專門追蹤 coding-plan-vlm 圖像使用 |
| T7 | 自動化報告 | 定時生成每日/每週/每月報告 |

---

## Phase 11.1: 數據結構設計

### 1.1 token-log.json 結構

```json
{
  "meta": {
    "lastUpdated": "2026-03-23T19:00:00Z",
    "lastCsvImport": "2026-03-23T19:00:00Z",
    "sourceFile": "token.csv",
    "totalRecords": 1523,
    "version": "1.0"
  },
  "records": [
    {
      "id": "tl_001",
      "secretKeyName": "default-key",
      "consumedApi": "chatcompletion-v2",
      "consumedModel": "MiniMax-M2.7",
      "amountSpent": 0,
      "amountAfterVoucher": 0,
      "inputUsageQuantity": 1500,
      "outputUsageQuantity": 850,
      "totalUsageQuantity": 2350,
      "consumptionTime": "2026-03-23T19:00:00Z",
      "consumptionStatus": "completed",
      "importBatch": "batch_20260323_001"
    }
  ],
  "lastId": 1523
}
```

### 1.2 CSV 欄位映射

| CSV 欄位 | JSON 欄位 | 類型 |
|----------|-----------|------|
| `Secret key name` | `secretKeyName` | string |
| `Consumed API` | `consumedApi` | enum |
| `Consumed model` | `consumedModel` | enum |
| `Amount spent` | `amountSpent` | number |
| `Amount After Voucher` | `amountAfterVoucher` | number |
| `Input usage quantity` | `inputUsageQuantity` | number |
| `Output usage quantity` | `outputUsageQuantity` | number |
| `Total usage quantity` | `totalUsageQuantity` | number |
| `Consumption time(UTC)` | `consumptionTime` | ISO 8601 |
| `Consumption status` | `consumptionStatus` | string |
      "timestamp": "2026-03-23T19:00:00Z",
      "userId": "discord_user_123",
      "userName": "用戶名",
      "function": "ai-analyze",
      "model": "MiniMax-Text-01",
      "inputTokens": 1500,
      "outputTokens": 850,
      "cacheHits": 320,
      "cacheMisses": 1180,
      "totalTokens": 2350,
      "costUSD": 0.00235,
      "latencyMs": 1250,
      "success": true,
      "error": null,
      "metadata": {
        "channelId": "1483436247618682900",
        "messageId": "msg_456",
        "promptType": "analysis"
      }
    }
  ],
  "dailySummary": {
    "2026-03-23": {
      "totalInputTokens": 45000,
      "totalOutputTokens": 28000,
      "totalCacheHits": 12000,
      "totalCostUSD": 0.073,
      "requestCount": 42,
      "avgLatencyMs": 1100
    }
  },
  "lastId": 1
}
```

### 1.3 每日摘要結構 (dailySummary)

```json
{
  "2026-03-23": {
    "date": "2026-03-23",
    "metrics": {
      "totalInputTokens": 45000000,
      "totalOutputTokens": 28000000,
      "totalTokens": 73000000,
      "totalAmountSpent": 0,
      "totalAmountAfterVoucher": 0,
      "recordCount": 423
    },
    "cache": {
      "readTokens": 12000000,
      "createTokens": 8000000,
      "hitRate": 0.6,
      "hitRatePercentage": "60.0%"
    },
    "byApi": {
      "chatcompletion-v2": { "tokens": 35000000, "count": 300 },
      "cache-read": { "tokens": 12000000, "count": 80 },
      "cache-create": { "tokens": 8000000, "count": 43 },
      "code_plan_resource_package": { "tokens": 18000000, "count": 0 }
    },
    "byModel": {
      "MiniMax-M2.5": { "tokens": 20000000, "count": 150 },
      "MiniMax-M2.7": { "tokens": 48000000, "count": 250 },
      "coding-plan-vlm": { "tokens": 5000000, "count": 23 }
    },
    "hourlyDistribution": {
      "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0,
      "6": 100000, "7": 500000, "8": 1200000, "9": 2500000,
      "10": 3000000, "11": 3500000, "12": 2800000, "13": 3200000,
      "14": 4000000, "15": 3800000, "16": 3500000, "17": 3000000,
      "18": 2500000, "19": 2000000, "20": 1500000, "21": 800000,
      "22": 400000, "23": 100000
    }
  }
}
```

### 1.4 每週摘要結構 (weeklySummary)

```json
{
  "weekStart": "2026-03-17",
  "weekEnd": "2026-03-23",
  "daysInWeek": 7,
  "metrics": {
    "totalInputTokens": 280000000,
    "totalOutputTokens": 175000000,
    "totalTokens": 455000000,
    "avgDailyTokens": 65000000,
    "peakDay": "2026-03-21",
    "peakDayTokens": 85000000
  },
  "cache": {
    "totalReadTokens": 75000000,
    "totalCreateTokens": 50000000,
    "avgHitRate": 0.6,
    "totalSavingsTokens": 25000000
  },
  "dailyBreakdown": [
    { "date": "2026-03-17", "tokens": 58000000 },
    { "date": "2026-03-18", "tokens": 62000000 },
    { "date": "2026-03-19", "tokens": 71000000 },
    { "date": "2026-03-20", "tokens": 65000000 },
    { "date": "2026-03-21", "tokens": 85000000 },
    { "date": "2026-03-22", "tokens": 72000000 },
    { "date": "2026-03-23", "tokens": 61000000 }
  ]
}
```

### 1.5 每月摘要結構 (monthlySummary)

```json
{
  "month": "2026-03",
  "year": 2026,
  "daysInMonth": 31,
  "daysWithData": 23,
  "metrics": {
    "totalInputTokens": 1200000000,
    "totalOutputTokens": 750000000,
    "totalTokens": 1950000000,
    "avgDailyTokens": 84782609,
    "peakDay": "2026-03-21",
    "peakDayTokens": 85000000
  },
  "cache": {
    "totalReadTokens": 320000000,
    "totalCreateTokens": 210000000,
    "avgHitRate": 0.604,
    "totalSavingsTokens": 110000000
  },
  "modelUsage": {
    "MiniMax-M2.5": { "tokens": 520000000, "percentage": 26.7 },
    "MiniMax-M2.7": { "tokens": 1280000000, "percentage": 65.6 },
    "coding-plan-vlm": { "tokens": 150000000, "percentage": 7.7 }
  },
  "apiUsage": {
    "chatcompletion-v2": { "tokens": 1100000000, "percentage": 56.4 },
    "cache-read": { "tokens": 320000000, "percentage": 16.4 },
    "cache-create": { "tokens": 210000000, "percentage": 10.8 },
    "code_plan_resource_package": { "tokens": 320000000, "percentage": 16.4 }
  },
  "weeklyBreakdown": [
    { "week": "2026-W12", "tokens": 380000000 },
    { "week": "2026-W13", "tokens": 455000000 },
    { "week": "2026-W14", "tokens": 420000000 }
  ]
}
```

### 1.6 VLM 使用追蹤結構

```json
{
  "vlmUsage": {
    "coding-plan-vlm": {
      "totalCalls": 523,
      "totalTokens": 150000000,
      "totalImages": 1247,
      "avgTokensPerCall": 286800,
      "avgImagesPerCall": 2.38,
      "firstUse": "2026-03-10T08:30:00Z",
      "lastUse": "2026-03-23T19:00:00Z",
      "dailyBreakdown": {
        "2026-03-23": { "calls": 23, "tokens": 5000000, "images": 58 }
      }
    }
  },
  "imageAnalysis": {
    "totalImagesProcessed": 1247,
    "byDay": {
      "2026-03-23": { "count": 58, "tokens": 120000 }
    },
    "byHour": {
      "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0,
      "6": 2, "7": 5, "8": 8, "9": 12, "10": 15, "11": 10,
      "12": 8, "13": 12, "14": 18, "15": 15, "16": 12, "17": 8,
      "18": 6, "19": 4, "20": 3, "21": 2, "22": 1, "23": 0
    }
  }
}
```

---

## Phase 11.2: CSV Import 功能

### 2.1 Google Drive 自動下載

```javascript
// phase11-csv-importer.js
const { GoogleDrive } = require('./integrations/google-drive');

class MinimaxCsvImporter {
  constructor() {
    this.drive = new GoogleDrive();
    this.folderId = '1k2CbG1Z2lvOLl-szMt8YT5P5NaWD0T5Y'; // Minimax Token folder
    this.localPath = './data/token.csv';
  }

  async downloadLatest() {
    // 1. List files in folder
    const files = await this.drive.listFiles(this.folderId);
    
    // 2. Find token.csv
    const tokenCsv = files.find(f => f.name === 'token.csv');
    if (!tokenCsv) throw new Error('token.csv not found');
    
    // 3. Download file
    const content = await this.drive.downloadFile(tokenCsv.id);
    
    // 4. Save locally
    require('fs').writeFileSync(this.localPath, content);
    return { file: tokenCsv, path: this.localPath };
  }
}
```

### 2.2 CSV 解析邏輯

```javascript
const CSV_COLUMNS = {
  'Secret key name': 'secretKeyName',
  'Consumed API': 'consumedApi',
  'Consumed model': 'consumedModel',
  'Amount spent': 'amountSpent',
  'Amount After Voucher': 'amountAfterVoucher',
  'Input usage quantity': 'inputUsageQuantity',
  'Output usage quantity': 'outputUsageQuantity',
  'Total usage quantity': 'totalUsageQuantity',
  'Consumption time(UTC)': 'consumptionTime',
  'Consumption status': 'consumptionStatus'
};

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  return lines.slice(1).map((line, idx) => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const record = { id: `tl_${String(idx + 1).padStart(6, '0')}` };
    
    headers.forEach((header, i) => {
      const key = CSV_COLUMNS[header];
      if (key) {
        record[key] = isNaN(values[i]) ? values[i] : Number(values[i]);
      }
    });
    
    // Parse timestamp
    record.consumptionTime = new Date(record.consumptionTime).toISOString();
    return record;
  });
}
```

### 2.3 增量更新邏輯

```javascript
async function incrementalImport(newRecords) {
  const existing = await readTokenLog();
  const existingTimes = new Set(existing.records.map(r => r.consumptionTime));
  
  // Filter only new records
  const uniqueNew = newRecords.filter(r => !existingTimes.has(r.consumptionTime));
  
  if (uniqueNew.length === 0) {
    return { added: 0, skipped: newRecords.length };
  }
  
  // Merge and save
  existing.records = [...existing.records, ...uniqueNew];
  existing.meta.totalRecords = existing.records.length;
  existing.meta.lastUpdated = new Date().toISOString();
  
  // Rebuild summaries
  await rebuildSummaries(existing);
  await writeTokenLog(existing);
  
  return { added: uniqueNew.length, skipped: newRecords.length - uniqueNew.length };
}
```

### 2.4 錯誤處理

```javascript
class CsvImportError extends Error {
  constructor(message, code, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

const ERROR_CODES = {
  FILE_NOT_FOUND: 'CSV_FILE_NOT_FOUND',
  PARSE_ERROR: 'CSV_PARSE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR'
};

async function safeImport() {
  try {
    const { path } = await importer.downloadLatest();
    const content = fs.readFileSync(path, 'utf-8');
    const records = parseCSV(content);
    validateRecords(records);
    return await incrementalImport(records);
  } catch (err) {
    if (err.code === 'CSV_PARSE_ERROR') {
      logError('CSV格式錯誤', err);
      await notifyAdmin('CSV Import Failed', err.message);
    }
    throw err;
  }
}
```

---

## Phase 11.3: 分析功能

### 3.1 核心分析指標

| 指標 | 公式 | 說明 |
|------|------|------|
| **Cache Hit Rate** | `cache-read / (cache-read + cache-create)` | 緩存命中率 |
| **Input/Output Ratio** | `Input usage / Output usage` | 輸入輸出比例 |
| **Avg Tokens/Call** | `Total usage / Record count` | 平均每次呼叫 Token 數 |
| **Model Distribution** | 依 Model 分組統計 | 各模型使用量分佈 |
| **API Distribution** | 依 API 分組統計 | 各 API 類型分佈 |

### 3.2 Cache Hit Rate 計算

```javascript
function calculateCacheHitRate(records) {
  const cacheRead = records
    .filter(r => r.consumedApi === 'cache-read')
    .reduce((sum, r) => sum + r.totalUsageQuantity, 0);
  
  const cacheCreate = records
    .filter(r => r.consumedApi === 'cache-create')
    .reduce((sum, r) => sum + r.totalUsageQuantity, 0);
  
  const total = cacheRead + cacheCreate;
  return {
    cacheRead,
    cacheCreate,
    hitRate: total > 0 ? cacheRead / total : 0,
    hitRatePercentage: total > 0 ? `${(cacheRead / total * 100).toFixed(1)}%` : '0%'
  };
}
```

### 3.3 Token 使用趨勢分析

```javascript
function analyzeTrends(records, period = 'daily') {
  const grouped = groupBy(records, r => {
    const date = new Date(r.consumptionTime);
    if (period === 'hourly') return `${date.toISOString().slice(0, 13)}:00`;
    if (period === 'weekly') return getWeekStart(date);
    return date.toISOString().slice(0, 10);
  });
  
  return Object.entries(grouped).map(([key, vals]) => ({
    period: key,
    inputTokens: sum(vals, 'inputUsageQuantity'),
    outputTokens: sum(vals, 'outputUsageQuantity'),
    totalTokens: sum(vals, 'totalUsageQuantity'),
    recordCount: vals.length
  })).sort((a, b) => a.period.localeCompare(b.period));
}
```

### 3.4 Model 使用分佈

```javascript
function getModelDistribution(records) {
  const grouped = groupBy(records, 'consumedModel');
  
  const total = Object.values(grouped)
    .reduce((sum, recs) => sum + sum(recs, 'totalUsageQuantity'), 0);
  
  return Object.entries(grouped).map(([model, recs]) => ({
    model,
    tokens: sum(recs, 'totalUsageQuantity'),
    count: recs.length,
    percentage: `${(sum(recs, 'totalUsageQuantity') / total * 100).toFixed(1)}%`
  })).sort((a, b) => b.tokens - a.tokens);
}
```

### 3.5 VLM 圖像使用分析

```javascript
function analyzeVLMUsage(records) {
  const vlmRecords = records.filter(r => r.consumedModel === 'coding-plan-vlm');
  
  return {
    totalCalls: vlmRecords.length,
    totalTokens: sum(vlmRecords, 'totalUsageQuantity'),
    avgTokensPerCall: vlmRecords.length > 0 
      ? sum(vlmRecords, 'totalUsageQuantity') / vlmRecords.length 
      : 0,
    byDay: groupBy(vlmRecords, r => r.consumptionTime.slice(0, 10)),
    peakHour: getPeakHour(vlmRecords)
  };
}
```

---

## Phase 11.4: API Endpoint 設計

### 4.1 Endpoint 列表

**Base URL:** `/api/tokens`

| Method | Endpoint | 描述 |
|--------|----------|------|
| `GET` | `/api/tokens/summary` | 獲取整體摘要統計 |
| `GET` | `/api/tokens/trend` | Token 使用趨勢 |
| `GET` | `/api/tokens/by-api` | 按 API 類型分佈 |
| `GET` | `/api/tokens/by-model` | 按 Model 分佈 |
| `GET` | `/api/tokens/cache-efficiency` | Cache 效率分析 |
| `GET` | `/api/tokens/vlm` | VLM 圖像使用分析 |
| `GET` | `/api/tokens/daily` | 每日詳細數據 |
| `GET` | `/api/tokens/hourly` | 每小時數據 (熱力圖用) |
| `GET` | `/api/tokens/export` | 導出 CSV/JSON |

### 4.2 Response 範例

**GET /api/tokens/summary**
```json
{
  "success": true,
  "data": {
    "totalRecords": 1523,
    "dateRange": { "start": "2026-03-01", "end": "2026-03-23" },
    "metrics": {
      "totalInputTokens": 2450000000,
      "totalOutputTokens": 1230000000,
      "totalTokens": 3680000000,
      "totalAmountSpent": 0,
      "avgTokensPerRecord": 2416
    },
    "cache": {
      "readTokens": 890000000,
      "createTokens": 500000000,
      "hitRate": "64.0%"
    },
    "byModel": {
      "MiniMax-M2.5": { "tokens": 520000000, "percentage": "14.1%" },
      "MiniMax-M2.7": { "tokens": 2800000000, "percentage": "76.1%" },
      "coding-plan-vlm": { "tokens": 360000000, "percentage": "9.8%" }
    },
    "byApi": {
      "chatcompletion-v2": { "tokens": 2100000000, "percentage": "57.1%" },
      "cache-read": { "tokens": 890000000, "percentage": "24.2%" },
      "cache-create": { "tokens": 500000000, "percentage": "13.6%" },
      "code_plan_resource_package": { "tokens": 190000000, "percentage": "5.1%" }
    }
  }
}
```

**GET /api/tokens/cache-efficiency**
```json
{
  "success": true,
  "data": {
    "cacheRead": 890000000,
    "cacheCreate": 500000000,
    "totalCacheOps": 1390000000,
    "hitRate": 0.64,
    "hitRatePercentage": "64.0%",
    "savingsTokens": 390000000,
    "savingsPercentage": "28.1%"
  }
}
```

**GET /api/tokens/vlm**
```json
{
  "success": true,
  "data": {
    "totalCalls": 523,
    "totalTokens": 150000000,
    "avgTokensPerCall": 286800,
    "hourlyDistribution": {
      "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0,
      "6": 2, "7": 5, "8": 8, "9": 12, "10": 15, "11": 10,
      "12": 8, "13": 12, "14": 18, "15": 15, "16": 12, "17": 8,
      "18": 6, "19": 4, "20": 3, "21": 2, "22": 1, "23": 0
    },
    "peakHour": 14,
    "usageTrend": [
      { "date": "2026-03-17", "tokens": 18000000 },
      { "date": "2026-03-18", "tokens": 22000000 }
    ]
  }
}
```

---

## Phase 11.5: 視覺化設計

#### 儀表板佈局

```
┌──────────────────────────────────────────────────────────────────────┐
│  🤖 AI Token 使用儀表板                    [時間範圍 ▼] [刷新] [導出] │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │
│  │ 💰 總成本   │ │ 📊 總 Tokens │ │ 📈 請求次數  │ │ ⚡ 緩存命中率 │     │
│  │   $4.87     │ │  3.68M      │ │   1,523     │ │   36.3%     │     │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📈 Token 使用趨勢 (折線圖)                                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │     ╭─╮          ╭─╮                                        │   │
│  │  ╭──╯ ╰──╮   ╭──╯ ╰──╮     最近的用量高峰                   │   │
│  │ ─╯       ╰───╯       ╰────                                   │   │
│  │ 03/17   03/18   03/19   03/20   03/21   03/22   03/23        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────┐  ┌─────────────────────────────────┐   │
│  │ 🥧 按功能分佈 (餅圖)      │  │ 📊 按用戶用量 (柱狀圖)           │   │
│  │                         │  │                                 │   │
│  │   ai-analyze    45%    │  │  ████████████████████ 用戶A      │   │
│  │   ai-chat       25%    │  │  ██████████████     用戶B        │   │
│  │   summarize     20%    │  │  ██████████        用戶C        │   │
│  │   other        10%    │  │  ████████          用戶D        │   │
│  │                         │  │                                 │   │
│  └─────────────────────────┘  └─────────────────────────────────┘   │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📋 最近 API 調用記錄                                                │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 時間          │ 用戶      │ 功能      │ Tokens   │ 成本     │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │ 19:27:03     │ 用戶A     │ ai-analyze│ 2,350    │ $0.0024  │   │
│  │ 19:25:45     │ 用戶B     │ summarize │ 890      │ $0.0009  │   │
│  │ 19:24:12     │ 用戶C     │ ai-chat   │ 1,120    │ $0.0011  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 組件列表

| 組件 | 描述 | 優先度 |
|------|------|--------|
| Summary Cards | 4 個 KPI 卡片 (成本/Tokens/請求/緩存) | P1 |
| Token Trend Chart | 折線圖展示每日用量趨勢 | P1 |
| Function Distribution | 餅圖展示功能別用量分佈 | P1 |
| User Usage Chart | 柱狀圖展示用戶用量排名 | P1 |
| Recent Logs Table | 最近 API 調用記錄表格 | P1 |
| Date Range Picker | 時間範圍選擇器 | P1 |
| Export Button | 導出 CSV/JSON 按鈕 | P2 |
| Cost Prediction | 成本預測顯示 | P2 |
| Anomaly Alert | 異常用量警告 | P2 |

---

## Phase 11.6: 前端組件

### 6.1 組件列表

| 組件 | 優先度 | 說明 |
|------|--------|------|
| Token 儀表板面板 | P1 | 主面板顯示所有 KPI |
| Token 趨勢圖 | P1 | 折線圖展示每日用量 |
| API 分佈餅圖 | P1 | 展示各 API 類型佔比 |
| Model 分佈餅圖 | P1 | 展示各模型佔比 |
| 24小時熱力圖 | P1 | 展示使用時段分佈 |
| 每日用量柱狀圖 | P2 | 展示每日用量對比 |
| Cache 效率表 | P2 | 展示 Cache 命中率 |
| VLM 使用面板 | P2 | 專門展示 VLM 統計 |
| 數據表格 | P2 | 可排序/過濾的數據表 |
| 導出功能 | P2 | CSV/JSON 導出 |

### 6.2 組件代碼結構

```
public/
├── css/
│   └── token-dashboard.css
├── js/
│   ├── token-dashboard.js    # 主儀表板邏輯
│   ├── token-charts.js       # 圖表渲染
│   └── token-api.js          # API 調用
└── pages/
    └── token-analysis.html    # 獨立頁面
```

### 6.3 主要代碼片段

```javascript
// token-dashboard.js
class TokenDashboard {
  constructor() {
    this.api = new TokenAPI();
    this.charts = {};
  }

  async init() {
    await this.loadSummary();
    await this.loadTrends();
    await this.loadDistributions();
    this.renderKPICards();
    this.initCharts();
  }

  async loadSummary() {
    const data = await this.api.getSummary();
    this.summary = data.data;
    this.renderKPICards();
  }

  renderKPICards() {
    const cards = [
      { label: '總 Tokens', value: formatNumber(this.summary.metrics.totalTokens) },
      { label: 'Input', value: formatNumber(this.summary.metrics.totalInputTokens) },
      { label: 'Output', value: formatNumber(this.summary.metrics.totalOutputTokens) },
      { label: 'Cache 命中率', value: this.summary.cache.hitRatePercentage }
    ];
    // Render cards...
  }

  initCharts() {
    this.charts.trend = new LineChart('trend-chart', this.trendData);
    this.charts.apiDist = new PieChart('api-dist-chart', this.apiDistData);
    this.charts.modelDist = new PieChart('model-dist-chart', this.modelDistData);
    this.charts.heatmap = new Heatmap('heatmap-chart', this.hourlyData);
  }
}
```

---

## Phase 11.7: 自動化

### 7.1 自動化任務

| 任務 | 頻率 | 說明 |
|------|------|------|
| CSV 下載 | 每日 04:00 | 從 Google Drive 下載最新 CSV |
| 增量更新 | 每日 04:30 | 解析並更新 token-log.json |
| 摘要計算 | 每日 05:00 | 計算每日/每週/每月摘要 |
| 報告生成 | 每日 06:00 | 生成每日報告並發送到 Discord |
| 數據清理 | 每月 1日 | 歸檔舊數據、清理過期記錄 |

### 7.2 Cron Job 配置

```javascript
// phase11-cron.js
const CRON_JOBS = [
  { name: 'csv-download', schedule: '0 4 * * *', task: downloadMinimaxCSV },
  { name: 'token-import', schedule: '30 4 * * *', task: importTokenData },
  { name: 'summary-rebuild', schedule: '0 5 * * *', task: rebuildSummaries },
  { name: 'daily-report', schedule: '0 6 * * *', task: sendDailyReport },
  { name: 'monthly-cleanup', schedule: '0 0 1 * *', task: cleanupOldData }
];
```

### 7.3 每日報告格式

```javascript
function generateDailyReport(data) {
  return {
    title: `📊 Minimax Token 每日報告 - ${data.date}`,
    fields: [
      { name: '📈 總用量', value: `${formatNumber(data.metrics.totalTokens)} tokens`, inline: true },
      { name: '📥 Input', value: `${formatNumber(data.metrics.totalInputTokens)}`, inline: true },
      { name: '📤 Output', value: `${formatNumber(data.metrics.totalOutputTokens)}`, inline: true },
      { name: '⚡ Cache 命中率', value: data.cache.hitRatePercentage, inline: true },
      { name: '🥧 Model 分佈', value: formatModelDist(data.byModel), inline: false },
      { name: '📅 vs 昨日', value: `${data.vsYesterday > 0 ? '+' : ''}${data.vsYesterday}%`, inline: true }
    ]
  };
}
```

### 7.4 錯誤處理與通知

```javascript
async function safeExecute(task, taskName) {
  try {
    await task();
    logSuccess(`${taskName} completed`);
  } catch (err) {
    logError(`${taskName} failed`, err);
    await notifyAdmin(`${taskName} Failed`, err.message);
    await notifyDiscord(`⚠️ ${taskName} 任務失敗: ${err.message}`);
  }
}
```

---

## Phase 11.8: 優先級與時間表

### 8.1 Phase 11 Timeline

| 階段 | 時間 | 內容 | 負責人 |
|------|------|------|--------|
| Phase 11.1 | Week 1 | 數據結構、Google Drive CSV Import | 師弟 |
| Phase 11.2 | Week 2 | 分析功能 (Cache/Model/API 分析) | 師弟 |
| Phase 11.3 | Week 3 | API Endpoints | 師弟 |
| Phase 11.4 | Week 4 | 前端儀表板、視覺化 | T仔 |
| Phase 11.5 | Week 5 | 自動化、報告生成 | 書記 |
| Phase 11.6 | Week 6 | 整合測試、VLM 追蹤 | T仔 |

### 8.2 優先度矩陣

| 項目 | 優先度 | 說明 |
|------|--------|------|
| CSV Import 邏輯 | P1 | 數據攝入核心 |
| 每日摘要計算 | P1 | 數據分析核心 |
| Cache Hit Rate 分析 | P1 | 主要分析指標 |
| API 分佈圖 | P1 | 主要視覺化 |
| Model 分佈圖 | P1 | 主要視覺化 |
| 24小時熱力圖 | P2 | 使用模式分析 |
| VLM 追蹤面板 | P2 | 專門需求 |
| Discord 命令 | P2 | 用戶查詢介面 |
| 每日報告自動化 | P2 | 運維需求 |
| 數據導出功能 | P3 | 高級功能 |
| 成本預測 | P3 | 未來功能 |

### 8.3 實作文件清單

| 文件 | 優先度 | 說明 |
|------|--------|------|
| `token-log.json` | P1 | 主數據庫 |
| `phase11-csv-importer.js` | P1 | CSV 下載解析 |
| `phase11-analyzer.js` | P1 | 分析功能核心 |
| `phase11-api.js` | P1 | REST API 端點 |
| `phase11-commands.js` | P2 | Discord 命令 |
| `token-dashboard.html` | P2 | 網頁儀表板 |
| `token-dashboard.css` | P2 | 儀表板樣式 |
| `token-charts.js` | P2 | 圖表渲染 |
| `phase11-cron.js` | P2 | 自動化腳本 |
| `phase11-daily-report.js` | P2 | 報告生成 |
| `phase11-cleanup.js` | P3 | 數據清理 |

---

## Phase 11.9: 與 Phase 10 Analytics 整合

| Phase 10 模組 | 整合點 |
|---------------|--------|
| 任務追蹤 | Token 用量與任務完成關聯 |
| 生產力報告 | 加入 Token 成本分析章節 |
| 頻道活躍度 | AI 功能使用頻率統計 |
| 月度報告 | 加入 AI 成本章節 |

**整合後的月度報告章節：**

```
## AI 使用分析 (Minimax Token)

### 用量概覽
- 本月總 Tokens: 1.95B
- 環比上月: +12%
- 平均每日: 84.8M

### Cache 效率
- 命中率: 60.4%
- 節省 Tokens: 110M

### Model 分佈
- MiniMax-M2.7: 65.6% (1.28B)
- MiniMax-M2.5: 26.7% (520M)
- coding-plan-vlm: 7.7% (150M)

### API 分佈
- chatcompletion-v2: 56.4%
- cache-read: 16.4%
- cache-create: 10.8%
- code_plan_resource_package: 16.4%
```

---

*最後更新：2026-03-23 (Phase 11 Minimax Token 分析系統已更新)*
