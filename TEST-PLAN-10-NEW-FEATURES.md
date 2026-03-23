# 🔍 10 項新功能測試計劃

## 📋 功能清單

| # | 功能 | 代碼位置 | 測試狀態 |
|---|------|----------|----------|
| 1 | Thread Templates | `templates.json` | ✅ 已實現 |
| 2 | Forum Channel | `discord-bot.js` | ✅ 已實現 |
| 3 | 指令分類目錄 | `discord-bot.js` | ✅ 已實現 |
| 4 | 斜線指令 (Slash Commands) | - | ❌ 未實現 |
| 5 | GitHub Webhook | `github-webhook.js` | ✅ 已實現 |
| 6 | Google Calendar | `discord-bot.js` | ✅ 已實現 |
| 7 | 番茄工作法 | `phase-pomodoro.js` | ✅ 已實現 |
| 8 | 狀態儀表板 | `discord-bot.js` | ✅ 已實現 |
| 9 | Channel Follow | - | ❌ 未實現 |
| 10 | Cron Job 提醒 | `cron-config.json` | ✅ 已實現 |

**完成率: 8/10 (80%)**

---

## 🧪 測試用例

### 功能 1: Thread Templates

| 用例 ID | 測試項目 | 測試步驟 | 預期結果 | 優先度 |
|---------|----------|----------|----------|--------|
| TT-01 | 範本列表 | 輸入 `!template` 或 `!templates` | 顯示 5 個範本 | 🔴 高 |
| TT-02 | 獲取任務範本 | 輸入 `!template task` | 顯示任務更新範本 | 🔴 高 |
| TT-03 | 獲取阻礙報告 | 輸入 `!template blocker` | 顯示阻礙報告範本 | 🔴 高 |
| TT-04 | 獲取 Code Review 範本 | 輸入 `!template review` | 顯示 Code Review 範本 | 🟡 中 |
| TT-05 | 獲取 Standup 範本 | 輸入 `!template standup` | 顯示每日 Standup 範本 | 🔴 高 |
| TT-06 | 獲取週報範本 | 輸入 `!template weekly` | 顯示週報範本 | 🟡 中 |
| TT-07 | 變數替換 | 使用 `{date}`, `{owner}` 等變數 | 變數被正確替換 | 🟡 中 |

### 功能 2: Forum Channel

| 用例 ID | 測試項目 | 測試步驟 | 預期結果 | 優先度 |
|---------|----------|----------|----------|--------|
| FC-01 | Forum 頻道存在 | 檢查 Discord 伺服器 | 存在 Forum 頻道 | 🔴 高 |
| FC-02 | 建立新 Thread | 點擊 + 新建 Thread | Thread 成功建立 | 🔴 高 |
| FC-03 | 標籤功能 | 檢查可用標籤 | 標籤正確顯示顏色 | 🟡 中 |
| FC-04 | Thread 搜尋 | 使用搜尋功能 | 顯示相關 Thread | 🟢 低 |
| FC-05 | Thread 內回覆 | 在 Thread 發送訊息 | 訊息成功發送 | 🔴 高 |

### 功能 3: 指令分類目錄

| 用例 ID | 測試項目 | 測試步驟 | 預期結果 | 優先度 |
|---------|----------|----------|----------|--------|
| HC-01 | 顯示幫助 | 輸入 `!help` | 顯示所有指令分類 | 🔴 高 |
| HC-02 | Phase 4 指令 | 檢查 Phase 4 指令列表 | 顯示 standup, poll, points 等 | 🔴 高 |
| HC-03 | Phase 5 指令 | 檢查 Phase 5 指令列表 | 顯示 ai, analyze 等 | 🟡 中 |
| HC-04 | Phase 6 指令 | 檢查 Phase 6 指令列表 | 顯示 board, badges 等 | 🟡 中 |
| HC-05 | 指令分類 | 驗證指令有分類 | 顯示清楚既指令分類 | 🟡 中 |

### 功能 4: 斜線指令 (Slash Commands) ⚠️ 未實現

| 用例 ID | 測試項目 | 測試步驟 | 預期結果 | 優先度 |
|---------|----------|----------|----------|--------|
| SC-01 | 斜線指令列表 | 輸入 `/` | 顯示可用斜線指令 | 🔴 高 |
| SC-02 | /standup 指令 | 輸入 `/standup` | 顯示 Standup 選項 | 🔴 高 |
| SC-03 | /poll 指令 | 輸入 `/poll` | 顯示投票建立選項 | 🔴 高 |
| SC-04 | /gcal 指令 | 輸入 `/gcal` | 顯示日曆選項 | 🟡 中 |

**注意:** 此功能需要使用 Discord.js 既 `SlashCommandBuilder` 註冊斜線指令，並响 `interactionCreate` event handler 度處理。

### 功能 5: GitHub Webhook

| 用例 ID | 測試項目 | 測試步驟 | 預期結果 | 優先度 |
|---------|----------|----------|----------|--------|
| GH-01 | Webhook 端點 | 訪問 `/webhook/github` | 回應 200 OK | 🔴 高 |
| GH-02 | PR 事件 | 觸發 PR webhook | Discord 收到通知 | 🔴 高 |
| GH-03 | Issue 事件 | 觸發 Issue webhook | Discord 收到通知 | 🟡 中 |
| GH-04 | Push 事件 | 觸發 Push webhook | Discord 收到通知 | 🟡 中 |
| GH-05 | 配置讀取 | 檢查 `github-config.json` | 配置正確讀取 | 🔴 高 |

### 功能 6: Google Calendar

| 用例 ID | 測試項目 | 測試步驟 | 預期結果 | 優先度 |
|---------|----------|----------|----------|--------|
| GC-01 | 今日會議 | 輸入 `!gcal` | 顯示今日會議 | 🔴 高 |
| GC-02 | 本週會議 | 輸入 `!gcal week` | 顯示本週會議 | 🔴 高 |
| GC-03 | 明日會議 | 輸入 `!gcal tomorrow` | 顯示明日會議 | 🟡 中 |
| GC-04 | 配置檢查 | 檢查 `workspace-config.json` | Google Calendar 設定存在 | 🔴 高 |
| GC-05 | 幫助信息 | 輸入 `!gcal help` | 顯示使用方法 | 🟢 低 |

### 功能 7: 番茄工作法

| 用例 ID | 測試項目 | 測試步驟 | 預期結果 | 優先度 |
|---------|----------|----------|----------|--------|
| PM-01 | 開始衝刺 | 輸入 `!pomodoro start [任務]` | 顯示 25:00 倒數 | 🔴 高 |
| PM-02 | 短休息 | 輸入 `!pomodoro short` | 顯示 05:00 倒數 | 🔴 高 |
| PM-03 | 長休息 | 輸入 `!pomodoro long` | 顯示 15:00 倒數 | 🔴 高 |
| PM-04 | 查看狀態 | 輸入 `!pomodoro status` | 顯示當前狀態 | 🔴 高 |
| PM-05 | 查看列表 | 輸入 `!pomodoro list` | 顯示所有進行中衝刺 | 🟡 中 |
| PM-06 | 停止衝刺 | 輸入 `!pomodoro stop` | 停止並顯示統計 | 🟡 中 |
| PM-07 | 查看統計 | 輸入 `!pomodoro stats` | 顯示工作統計 | 🟢 低 |
| PM-08 | 配置設定 | 輸入 `!pomodoro config` | 顯示配置選項 | 🟢 低 |

### 功能 8: 狀態儀表板

| 用例 ID | 測試項目 | 測試步驟 | 預期結果 | 優先度 |
|---------|----------|----------|----------|--------|
| DB-01 | 顯示儀表板 | 輸入 `!dashboard` | 顯示儀表板連結 | 🔴 高 |
| DB-02 | 設定連結 | 輸入 `!dashboard set sheets [URL]` | 設定成功回應 | 🔴 高 |
| DB-03 | 置頂訊息 | 輸入 `!dashboard pin` | 置頂儀表板訊息 | 🟡 中 |
| DB-04 | 每週報告 | 輸入 `!dashboard weekly` | 顯示每週報告 | 🟢 低 |
| DB-05 | 配置檢查 | 檢查 `dashboard-config.json` | 配置存在且正確 | 🟡 中 |

### 功能 9: Channel Follow ⚠️ 未實現

| 用例 ID | 測試項目 | 測試步驟 | 預期結果 | 優先度 |
|---------|----------|----------|----------|--------|
| CF-01 | 跟隨頻道 | 使用 Discord Channel Follow API | 頻道成功跟隨 | 🔴 高 |
| CF-02 | 同步訊息 | 在來源頻道發訊息 | 目標頻道收到同步 | 🔴 高 |
| CF-03 | 取消跟隨 | 取消頻道跟隨 | 停止同步 | 🟡 中 |

**注意:** 此功能需要使用 Discord.js 既 `Channel.follow()` 方法，需要 `MANAGE_WEBHOOKS` 權限。

### 功能 10: Cron Job 提醒

| 用例 ID | 測試項目 | 測試步驟 | 預期結果 | 優先度 |
|---------|----------|----------|----------|--------|
| CJ-01 | 配置檢查 | 檢查 `cron-config.json` | 配置存在 | 🔴 高 |
| CJ-02 | 心情問候 | 驗證 moodGreeting 設定 | 09:00 星期一至五 | 🔴 高 |
| CJ-03 | Standup 提醒 | 驗證 standup 設定 | 09:00 星期一至五 | 🔴 高 |
| CJ-04 | 週報提醒 | 驗證 weekly 設定 | 17:00 星期五 | 🟡 中 |
| CJ-05 | 指令測試 | 手動觸發 `!cron test` | 發送測試訊息 | 🟡 中 |

---

## 📊 測試摘要

| 功能 | 測試用例數 | 已實現 | 需要開發 |
|------|------------|--------|----------|
| Thread Templates | 7 | ✅ | - |
| Forum Channel | 5 | ✅ | - |
| 指令分類目錄 | 5 | ✅ | - |
| 斜線指令 | 4 | ❌ | SlashCommandBuilder |
| GitHub Webhook | 5 | ✅ | - |
| Google Calendar | 5 | ✅ | - |
| 番茄工作法 | 8 | ✅ | - |
| 狀態儀表板 | 5 | ✅ | - |
| Channel Follow | 3 | ❌ | Channel.follow() |
| Cron Job 提醒 | 5 | ✅ | - |
| **總計** | **52** | **44** | **8** |

---

## ⚠️ 發現既問題

### 未實現既功能 (需要師弟補做)

1. **斜線指令 (Slash Commands)**
   - 位置: `discord-bot.js`
   - 需要添加: `SlashCommandBuilder` 註冊
   - 需要添加: `interactionCreate` event handler

2. **Channel Follow**
   - 位置: `discord-bot.js`
   - 需要添加: `Channel.follow()` 方法
   - 需要添加: `MANAGE_WEBHOOKS` 權限

---

## ✅ 驗收標準

### 已實現既 8 項功能需要通過既測試：

- [ ] Thread Templates: 至少 5 個範本可正常使用
- [ ] Forum Channel: 可建立 Thread，同埋使用標籤
- [ ] 指令分類目錄: `!help` 顯示清楚既指令分類
- [ ] GitHub Webhook: webhook endpoint 回應正確
- [ ] Google Calendar: `!gcal` 命令正常運作
- [ ] 番茄工作法: 衝刺計時器正常運作
- [ ] 狀態儀表板: `!dashboard` 命令正常運作
- [ ] Cron Job 提醒: 配置正確，加載成功

---

*最後更新: 2026-03-22*
*測試人員: T仔 (Tester)*
