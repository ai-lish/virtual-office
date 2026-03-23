# 虛擬辦公室 Phase 2 - 範本訊息 + Bot 整合

## 總覽

| # | 項目 | 優先度 | 預計時間 | 負責人 | 截止日期 | 狀態 |
|---|------|--------|----------|--------|----------|------|
| 1 | 範本訊息系統 | 🔴 高 | 2小時 | - | - | ✅ 完成 |
| 2 | Cron Bot 定時提醒 | 🔴 高 | 2小時 | - | - | ✅ 完成 |
| 3 | GitHub Bot PR/Issue 推送 | 🔴 高 | 3小時 | - | - | ✅ 完成 |
| 4 | 頻道配置 | 🔴 中 | 1小時 | - | - | ⏳ 待設置 |

---

## 項目 1: 範本訊息系統 📋

### 目標
建立常見回報格式範本，成員可快速複製使用，保持格式一致

### 具體任務
- [x] 建立 templates.json 範本配置
- [x] 任務更新範本
- [x] 阻礙報告範本
- [x] 程式碼審查請求範本
- [x] 每日 Standup 範本
- [x] 週報範本
- [x] 在 Bot 中實現 !template 命令
- [ ] 配置範本頻道 #templates

### 範本類型

| 類型 | 命令 | 用途 |
|------|------|------|
| 任務更新 | `!template task` | 報告任務進度 |
| 阻礙報告 | `!template blocker` | 報告問題尋求協助 |
| Code Review | `!template review` | PR 審查請求 |
| Standup | `!template standup` | 每日例會 |
| 週報 | `!template weekly` | 每週總結 |

### 相關檔案
- `templates.json` - 範本配置
- `discord-bot.js` - !template 命令實現

---

## 項目 2: Cron Bot 定時提醒 ⏰

### 目標
設定定時提醒，如每日 standup、週報催交

### 具體任務
- [x] 建立 cron-config.json 配置
- [x] 每日 Standup 提醒 (預設 09:00，Mon-Fri)
- [x] 週報催交提醒 (預設 17:00 Friday)
- [x] 在 Bot 中實現定時檢查
- [ ] 配置提醒頻道

### 配置選項
- 時間可自定義 (24小時制)
- 日子可選擇 (Mon-Sun)
- 可啟用/停用個別提醒

### 命令
- `!cron status` - 查看定時提醒狀態
- `!cron test standup` - 測試 standup 提醒
- `!cron test weekly` - 測試週報提醒

### 相關檔案
- `cron-config.json` - Cron 配置
- `discord-bot.js` - Cron Bot 實現

---

## 項目 3: GitHub Bot PR/Issue 推送 🚀

### 目標
PR/Issue 更新自動推送到相關頻道

### 具體任務
- [x] 建立 github-webhook.js Webhook 伺服器
- [x] PR 事件處理 (opened/closed/merged)
- [x] Issue 事件處理 (opened/closed)
- [x] Push 事件處理
- [x] 建立 github-config.json 配置
- [ ] 配置各 Repo 對應的 Discord 頻道

### 支持的事件

| 事件 | 訊息格式 |
|------|----------|
| pull_request | 🆕 PR 標題 + 作者 + 分支 |
| issues | 🆕 Issue 標題 + 標籤 + 負責人 |
| push | 🚀 Push 數量 + 最新 Commit |

### 配置示例
```json
{
  "channels": {
    "ai-updates": "123456789012345678",
    "vo-updates": "123456789012345679"
  }
}
```

### GitHub Webhook 配置
- URL: `https://your-server.com/webhook`
- Secret: 設定 GITHUB_WEBHOOK_SECRET
- 事件: pull_request, issues, push

### 相關檔案
- `github-webhook.js` - Webhook 伺服器
- `github-config.json` - GitHub 頻道配置

---

## 項目 4: 頻道配置 🔧

### 待完成任務
- [ ] 建立 #daily-standup 頻道
- [ ] 建立 #weekly-review 頻道
- [ ] 建立 #templates 頻道 (存放範本訊息)
- [ ] 建立專案更新頻道 (ai-updates, vo-updates 等)
- [ ] 更新 config.json 中的 channel ID

### 頻道結構 (Phase 1 建議)

| 類別 | 頻道名稱 | 用途 |
|------|----------|------|
| 📅 站立會議 | #daily-standup | 每日 Standup |
| 📅 站立會議 | #weekly-review | 週報 |
| 📚 資源 | #templates | 範本訊息 |
| 📋 項目 | ai-updates | ai-learning 更新 |
| 📋 項目 | vo-updates | virtual-office 更新 |

---

## 快速開始

### 啟動 Discord Bot
```bash
cd /Users/zachli/.openclaw/workspace/virtual-office
export DISCORD_BOT_TOKEN=your_token
node discord-bot.js
```

### 啟動 GitHub Webhook
```bash
export DISCORD_BOT_TOKEN=your_token
export GITHUB_WEBHOOK_SECRET=your_secret
export PORT=3000
node github-webhook.js
```

### 使用範本
```
!template task        # 獲取任務更新範本
!template blocker     # 獲取阻礙報告範本
!template review      # 獲取 Code Review 範本
!template standup     # 獲取 Standup 範本
!template weekly      # 獲取週報範本
!templates            # 列出所有範本
!cron status          # 查看定時提醒
```

---

## 進度追蹤

### 2026-03-20
- 完成 Phase 2 开发
- templates.json - 5 種範本訊息
- discord-bot.js - !template 命令 + Cron Bot
- github-webhook.js - Webhook 處理
- cron-config.json - 定時提醒配置

---

## 備註

- 頻道 ID 需要手動配置才能使用
- GitHub Webhook 需要公開伺服器
- Cron Bot 每分鐘檢查一次