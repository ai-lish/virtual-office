# Phase 7: 10項新功能 - 生產計劃

## 實現狀態 (2026-03-21)

| # | 功能 | 狀態 | 說明 |
|---|------|------|------|
| 1 | Webhooks 自動化 | ✅ 已實現 | RSS/GitHub/PyPI 監控代碼完成 |
| 2 | 自定義開工儀式 | ✅ 已實現 | 每日 09:00 問候 + emoji 回覆 |
| 3 | Voice 頻道視覺化 | ✅ 已實現 | 加入/離開通知 |
| 4 | 「喺度」狀態 | ✅ 已實現 | 「🚪 我走先」處理 |
| 5 | 每週主題頻道 | ✅ 已實現 | 週一/三/五主題 |
| 6 | AI Summaries | ✅ 已實現 | 50條訊息自動總結 |
| 7 | Google Calendar 推播 | ⚠️ 框架 | 需要 API 配置 |
| 8 | Notion/Linear 同步 | ⚠️ 框架 | 需要 API 配置 |
| 9 | Poll + Slash Commands | ✅ 已有 | Phase 4 已實現 |
| 10 | Analytics | ✅ 已實現 | 命令/訊息/語音統計 |

## 功能列表

### 1. Webhooks 自動化
- RSS feed 訂閱並推送到頻道
- GitHub stars 監控
- PyPI 版本監控

**配置命令**:
```
!phase7 webhook add rss <URL> <名稱>
!phase7 webhook add github <owner/repo>
!phase7 webhook add pypi <package-name>
!phase7 webhook list
```

**實現方式**: 
- 使用 setInterval 定期檢查 (每 15 分鐘)
- 記錄最後檢查時間，只推送新內容

### 2. 自定義開工儀式
- 每日早上 Bot 問「今日點呀？」
- 記錄用戶回覆

**配置命令**:
```
!phase7 greeting set #頻道
!phase7 greeting time 09:00
```

**實現方式**:
- 在 cron job 中每分鐘檢查是否到達設定時間
- 隨機選擇問候語

### 3. Voice 頻道視覺化
- 加入 Voice 時自動通知
- 離開 Voice 時自動通知

**配置命令**:
```
!phase7 voice join #頻道
!phase7 voice leave #頻道
```

**實現方式**:
- 使用 `voiceStateUpdate` 事件監控

### 4. 「喺度」狀態
- 記錄用戶上線/離線時間
- 查看歷史記錄

**配置命令**:
```
!phase7 ondi set #頻道
!phase7 ondi history
```

### 5. 每週主題頻道
- 週一: 創意發想
- 週三: 進度衝刺
- 週五: 回顧總結

**配置命令**:
```
!phase7 theme
!phase7 theme set #頻道
```

### 6. AI Summaries
- 自動總結長對話
- 超過設定閾值 (預設 50 條) 自動生成總結

**配置命令**:
```
!phase7 summary channel #頻道
!phase7 summary threshold 50
```

### 7. Google Calendar 推播
- 會議開始前通知

**配置命令**:
```
!phase7 calendar set #頻道
!phase7 calendar minutes 5
```

### 8. Notion/Linear 同步
- 狀態更新同步到 Notion/Linear

**配置命令**:
```
!phase7 sync notion
!phase7 sync linear
```

### 9. Poll + Slash Commands
- 增強的投票系統 (已在 Phase 4 實現)

### 10. Analytics - 使用統計
- 命令使用統計
- 訊息統計
- 語音時間統計

**配置命令**:
```
!phase7 stats
!phase7 stats reset
!stats (捷徑)
```

## OpenClaw Cron Jobs

可以用 OpenClaw Cron Job 實現定時功能:

```bash
# Webhook 檢查 (每 15 分鐘)
openclaw cron add "webhook-check" "*/15 * * * *" "cd /Users/zachli/.openclaw/workspace/virtual-office && node -e \"const p7 = require('./phase7-new-features.js'); p7.checkRSSFeeds(null, p7.initPhase7Data()).then(console.log);\""

# 每日統計報告 (每天 23:00)
openclaw cron add "daily-analytics" "0 23 * * *" "cd /Users/zachli/.openclaw/workspace/virtual-office && node -e \"const p7 = require('./phase7-new-features.js'); const a = p7.initAnalyticsDB(); console.log(p7.getAnalyticsReport(a));\""
```

## 數據文件

- `phase7-data.json` - Phase 7 功能配置
- `analytics-db.json` - 使用統計數據

## 測試清單

- [ ] !phase7 命令正常工作
- [ ] !stats 命令返回正確統計
- [ ] Voice 狀態變化時觸發通知
- [ ] 每週主題正確顯示
- [ ] Webhook 配置可以正常保存

## 預設配置

```json
{
  "greeting": {
    "enabled": true,
    "time": "09:00",
    "channels": []
  },
  "weeklyThemes": {
    "monday": { "name": "創意發想", "description": "Brainstorming & 新點子" },
    "wednesday": { "name": "進度衝刺", "description": "Execution & 實作" },
    "friday": { "name": "回顧總結", "description": "Review & 學習" }
  },
  "analytics": {
    "enabled": true,
    "trackCommands": true,
    "trackVoiceTime": true,
    "trackMessages": true
  }
}
```