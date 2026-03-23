# 虛擬辦公室 Phase 4 - Voice 頻道虛擬桌面 + 自動清理腳本

## 總覽

| # | 項目 | 優先度 | 預計時間 | 負責人 | 截止日期 | 狀態 |
|---|------|--------|----------|--------|----------|------|
| 1 | Voice 頻道虛擬桌面 | 🔴 高 | 2小時 | - | - | ⏳ 待開始 |
| 2 | 自動清理腳本 | 🔴 高 | 1小時 | - | - | ⏳ 待開始 |

---

## 項目 1: Voice 頻道虛擬桌面 🎙️

### 目標
將 Voice 頻道命名為「設計組」「開發組」「客服組」，成員加入對應語音頻道即表示「在崗」

### 具體任務
- [x] 建立 Discord Bot 腳本 (discord-bot.js)
- [x] 監聽 voiceStateUpdate 事件
- [x] 狀態同步到 voice-status.json
- [x] API 端點 /api/voice-status
- [ ] 在 Discord 伺服器建立 Voice 頻道分類「虛擬桌面」
- [ ] 在 Discord 伺服器建立「設計組」Voice 頻道
- [ ] 在 Discord 伺服器建立「開發組」Voice 頻道
- [ ] 在 Discord 伺服器建立「客服組」Voice 頻道
- [ ] 設定頻道權限 (成員加入即顯示狀態)
- [ ] 在虛擬辦公室網站顯示各組在崗人數
- [ ] 測試與驗證

### 技術實現
- 使用 Discord.js 監聽 `voiceStateUpdate` 事件
- 透過 voice-status.json 更新虛擬辦公室狀態
- 在網站即時顯示在崗狀態 (API: /api/voice-status)

### 相關檔案
- `discord-bot.js` - Discord Bot 主程式
- `server.js` - API 端點整合
- `config.json` - 頻道 ID 設定
- `voice-status.json` - 語音頻道狀態

---

## 項目 2: 自動清理腳本 🧹

### 目標
自動歸檔已完成項目的頻道/threads，或在落後於計劃的 threads 頂部添加「⚠️ 落後進度」提醒

### 具體任務

#### 2.1 頻道歸檔功能
- [x] 建立 auto-cleanup.js 腳本框架
- [x] 實現頻道歸檔邏輯
- [ ] 識別已完成項目的頻道 (根據標籤或狀態)
- [ ] 自動將頻道移至歸檔分類
- [ ] 發送歸檔通知到原頻道

#### 2.2 Thread 落後進度提醒
- [x] 建立落後進度檢查框架
- [ ] 每日定時檢查所有 active threads
- [ ] 計算預計完成時間 vs 實際進度
- [ ] 識別落後於計劃的 threads (>50% 延遲)
- [ ] 自動在落後 threads 頂部添加「⚠️ 落後進度」提醒
- [ ] 每週生成落後進度報告

### 技術實現
- 使用 Discord.js 進行頻道管理
- 透過 cron job 每日執行檢查
- 記錄到 auto-cleanup.log

### 相關檔案
- `scripts/auto-cleanup.js` - 自動清理腳本
- `discord-bot.js` - 內建定時清理功能
- `config.json` - 歸檔規則設定
- `auto-cleanup.log` - 清理日誌

---

## 進度追蹤

### 進度記錄格式
```
日期: YYYY-MM-DD
項目: [項目名稱]
更新: [具體進度]
```

### 範例記錄
```
2026-03-20
項目: Voice 頻道虛擬桌面
更新: 開始規劃Discord頻道結構
```

---

## 備註

- Phase 4 與現有 10 項功能獨立，可並行開發
- Voice 頻道需先確認 Discord 伺服器權限
- 自動清理腳本需考慮避免誤刪重要資料
