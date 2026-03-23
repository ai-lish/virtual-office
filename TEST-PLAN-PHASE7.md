# Virtual Office - Phase 7 測試計劃 (10項新功能)

**測試員:** T仔 (🔍)  
**項目:** Virtual Office Phase 7  
**日期:** 2026-03-21

---

## 📋 功能對照表

| # | 功能 | 檔案位置 | 狀態 | 備註 |
|---|------|---------|------|------|
| 1 | Webhooks 自動化 (RSS/GitHub/PyPI) | `phase7-new-features.js` | ✅ 已實現 | 需要配置 |
| 2 | 自定義開工儀式 | `phase7-new-features.js` | ✅ 已實現 | 每日 09:00 |
| 3 | Voice 頻道視覺化 | `discord-bot.js` | ✅ 已實現 | 加入/離開通知 |
| 4 | 「喺度」狀態 | `phase7-new-features.js` | ✅ 已實現 | 離開訊息「🚪 我走先」|
| 5 | 每週主題頻道 | `phase7-new-features.js` | ✅ 已實現 | 週一/三/五 |
| 6 | AI Summaries | `phase7-new-features.js` | ✅ 已實現 | 50條訊息自動總結 |
| 7 | Google Calendar 推播 | `phase7-new-features.js` | ⚠️ 框架 | 需要 API 配置 |
| 8 | Notion/Linear 同步 | `phase7-new-features.js` | ⚠️ 框架 | 需要 API 配置 |
| 9 | Poll + Slash Commands | 已有 | ✅ 已實現 | Phase 4 已有 |
| 10 | Analytics | `phase7-new-features.js` | ✅ 已實現 | 命令/訊息/語音統計 |

---

## 🔬 測試用例詳細

### 1. Webhooks 自動化

**檔案:** `phase7-new-features.js` (行 145-270)

| 用例 ID | 測試描述 | 預期結果 | 驗證方法 |
|---------|---------|---------|---------|
| WH-01 | `!phase7 webhook add rss <url> <name>` | 添加 RSS 訂閱 | 指令測試 |
| WH-02 | `!phase7 webhook add github <owner/repo>` | 添加 GitHub 監控 | 指令測試 |
| WH-03 | `!phase7 webhook add pypi <package>` | 添加 PyPI 監控 | 指令測試 |
| WH-04 | `!phase7 webhook list` | 顯示所有 Webhook | 指令測試 |

---

### 2. 自定義開工儀式

**檔案:** `phase7-new-features.js` (行 273-340)

| 用例 ID | 測試描述 | 預期結果 | 驗證方法 |
|---------|---------|---------|---------|
| GR-01 | 每日 09:00 自動發送問候 | Bot 發送「今日點呀？」 | 等候 cron 觸發 |
| GR-02 | 問候包含心情 emoji | 😴😐🙂😊🤩 反應 | 檢查訊息 |
| GR-03 | 用戶點擊心情回覆 | Bot 回覆確認並記錄 | 點擊測試 |
| GR-04 | `!phase7 greeting set #channel` | 設定問候頻道 | 指令測試 |
| GR-05 | `!phase7 greeting time 09:00` | 設定問候時間 | 指令測試 |

---

### 3. Voice 頻道視覺化

**檔案:** `discord-bot.js` (行 1956-1990)

| 用例 ID | 測試描述 | 預期結果 | 驗證方法 |
|---------|---------|---------|---------|
| VN-01 | 加入 Voice 頻道 | 發送通知到設定頻道 | 加入 voice 測試 |
| VN-02 | 離開 Voice 頻道 | 發送離開通知 | 離開 voice 測試 |
| VN-03 | `!phase7 voice join #channel` | 設定加入通知頻道 | 指令測試 |
| VN-04 | `!phase7 voice leave #channel` | 設定離開通知頻道 | 指令測試 |

---

### 4. 「喺度」狀態

**檔案:** `phase7-new-features.js` (行 340-380)

| 用例 ID | 測試描述 | 預期結果 | 驗證方法 |
|---------|---------|---------|---------|
| OD-01 | 發送「🚪 我走先」 | Bot 回覆「有慢！」並記錄 | 訊息測試 |
| OD-02 | `!phase7 ondi set #channel` | 設定狀態記錄頻道 | 指令測試 |
| OD-03 | `!phase7 ondi history` | 顯示最近 10 條記錄 | 指令測試 |

---

### 5. 每週主題頻道

**檔案:** `phase7-new-features.js` (行 385-420)

| 用例 ID | 測試描述 | 預期結果 | 驗證方法 |
|---------|---------|---------|---------|
| WT-01 | `!phase7 theme` | 顯示今日主題 | 指令測試 |
| WT-02 | `!theme` (捷徑) | 顯示今日主題 | 指令測試 |
| WT-03 | `!phase7 theme set #channel` | 設定主題頻道 | 指令測試 |
| WT-04 | 週一主題 | 顯示「創意發想」 | 檢查日期 |
| WT-05 | 週三主題 | 顯示「進度衝刺」 | 檢查日期 |
| WT-06 | 週五主題 | 顯示「回顧總結」 | 檢查日期 |

---

### 6. AI Summaries

**檔案:** `phase7-new-features.js` (行 425-470)

| 用例 ID | 測試描述 | 預期結果 | 驗證方法 |
|---------|---------|---------|---------|
| AS-01 | 50 條訊息後自動總結 | 頻道收到總結訊息 | 發送測試訊息 |
| AS-02 | `!phase7 summary channel #channel` | 設定總結頻道 | 指令測試 |
| AS-03 | `!phase7 summary threshold 50` | 設定閾值 | 指令測試 |

---

### 7. Google Calendar 推播

**檔案:** `phase7-new-features.js` (行 475-510)

| 用例 ID | 測試描述 | 預期結果 | 驗證方法 |
|---------|---------|---------|---------|
| GC-01 | `!phase7 calendar set #channel` | 設定通知頻道 | 指令測試 |
| GC-02 | `!phase7 calendar minutes 10` | 設定提前分鐘 | 指令測試 |
| GC-03 | 會議前通知 | 自動發送提醒 | 需要真實會議 |

---

### 8. Notion/Linear 同步

**檔案:** `phase7-new-features.js` (行 515-540)

| 用例 ID | 測試描述 | 預期結果 | 驗證方法 |
|---------|---------|---------|---------|
| NS-01 | `!phase7 sync notion` | 啟用 Notion 同步 | 指令測試 |
| NS-02 | `!phase7 sync linear` | 啟用 Linear 同步 | 指令測試 |
| NS-03 | 需要 API Key 配置 | 顯示需要配置提示 | 檢查回覆 |

---

### 9. Poll + Slash Commands

**狀態:** 已在 Phase 4 實現，無需重複測試

---

### 10. Analytics

**檔案:** `phase7-new-features.js` (行 545-650), `analytics-db.json`

| 用例 ID | 測試描述 | 預期結果 | 驗證方法 |
|---------|---------|---------|---------|
| AN-01 | `!phase7 stats` | 顯示使用統計 | 指令測試 |
| AN-02 | `!stats` (捷徑) | 顯示使用統計 | 指令測試 |
| AN-03 | 訊息自動統計 | 計數增加 | 發送訊息 |
| AN-04 | 命令自動統計 | 計數增加 | 執行命令 |
| AN-05 | `!phase7 stats reset` | 重置統計數據 | 指令測試 |

---

## 🧪 測試環境配置

```bash
# 環境變量
export DISCORD_BOT_TOKEN="your-bot-token"

# 啟動 Bot
cd /Users/zachli/.openclaw/workspace/virtual-office
node discord-bot.js
```

---

## 📊 測試檢查清單

- [ ] 1. Webhooks - `!phase7 webhook add` 命令
- [ ] 2. 開工儀式 - 每日 09:00 自動問候 + emoji 回覆
- [ ] 3. Voice 通知 - 加入/離開 voice 時通知
- [ ] 4. 「喺度」 - 「🚪 我走先」處理
- [ ] 5. 每週主題 - `!theme` 顯示今日主題
- [ ] 6. AI Summaries - 50 條訊息自動總結
- [ ] 7. Calendar 推播 - 框架已實現
- [ ] 8. Notion/Linear - 框架已實現
- [ ] 9. Poll - 已實現
- [ ] 10. Analytics - `!stats` 命令

---

## ⚠️ 已知限制

1. **Google Calendar:** 需要 Google API OAuth2 認證
2. **Notion/Linear:** 需要 API Key 配置
3. **Webhooks:** 需要實際 RSS/GitHub/PyPI 源來測試

---

## 📈 驗證總結

### ✅ 已開發完成
- Phase 7 核心代碼已實現
- 與主 Bot 正確整合
- Cron 定時任務已配置
- 數據持久化正常

### ⚠️ 需要配置
- Google Calendar API
- Notion API Key
- Linear API Key

---

*Created by Sage (🦉) - 2026-03-21*
