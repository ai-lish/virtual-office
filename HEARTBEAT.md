# HEARTBEAT.md

## 每週定時任務

### 讀取並更新 MEMORY.md（建議：每週日 08:00）

每次執行：
1. 讀取 memory/ 目錄下所有每日日誌（memory/YYYY-MM-DD.md）
2. 識別新的項目進展、阻斷、決策
3. 更新 MEMORY.md 的：
   - 活躍項目狀態
   - P0 阻斷（如有）
   - 重要決策記錄
   - 新的經驗教訓
4. 清理或合併過時的內容

### 每週日 10:00 — Weekly Memory Review（Cron: Claude Sonnet）

用 Claude Sonnet 執行（唔用 M2.7，需要推理能力）：
1. 讀本週所有 memory/YYYY-MM-DD.md
2. 識別值得長期記住的內容
3. 更新 MEMORY.md（去重、去過時、相對日期轉 absolute）
4. 輸出簡短 diff 報告 → 發 Telegram 通知 Zach

### 每週六 20:00 — Memory Archive Check（如需要）

如果 MEMORY.md 超過 150 行，將舊內容歸檔到 memory/archive/MEMORY-YYYY-QUARTER.md

## 每日心跳（默認）

### 早晨簡報（每日 08:00）
- 電郵（新未讀數量，標記重要郵件）
- 日曆（今日行程）
- 逾期提醒（Apple Reminders，如係靈修資料可略過）

### 定期檢查
- Virtual Office GitHub Pages 狀態（每小時）

## 備註

- MEMORY.md 更新不需要通知用戶，除非有重大發現
- Heartbeat 只在有意義的新資訊時才回報，否則回覆 HEARTBEAT_OK
