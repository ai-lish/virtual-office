# Phase 8 功能測試計劃

## 概述
Phase 8 新增 6 項功能，進一步提升虛擬辦公室的自動化程度。

## 6 項新功能

### 1. Notion/Airtable 任務同步
- **功能**: 監控 Notion/Airtable 中的任務更新
- **觸發**: 每 5 分鐘自動檢查一次
- **通知**: 更新時推送到設定的 Discord 頻道

**命令**:
```
!phase8 notion enable [apiKey] [databaseId]
!phase8 notion channel [#channel]
!phase8 notion disable
```

**測試用例**:
- [ ] 啟用 Notion 同步
- [ ] 設定通知頻道
- [ ] 檢查定時同步是否工作
- [ ] 停用 Notion 同步

### 2. Jenkins/CI 建置通知
- **功能**: 監控 Jenkins build 狀態
- **觸發**: 建置狀態變更時立即通知
- **通知**: 成功/失敗/不穩定時推送到頻道

**命令**:
```
!phase8 jenkins enable [url] [user] [token]
!phase8 jenkins addjob [jobName]
!phase8 jenkins channel [#channel]
!phase8 ci enable github
!phase8 ci channel [#channel]
```

**測試用例**:
- [ ] 設定 Jenkins 監控
- [ ] 添加監控的 Job
- [ ] 設定 GitHub Actions 監控
- [ ] 測試建置成功/失敗通知

### 3. 截止前自動提醒
- **功能**: 設定任務截止時間，提前自動 DM 負責人
- **觸發**: 截止前 24小時、2小時、1小時
- **通知**: DM 負責人 + 頻道通知

**命令**:
```
!phase8 deadline add [任務] [@user] [+1d]
!phase8 deadline list
!phase8 deadline remove [id]
!phase8 deadline complete [id]
```

**測試用例**:
- [ ] 添加新任務截止時間
- [ ] 設定 +1d (1天後) 截止
- [ ] 設定 +2h (2小時後) 截止
- [ ] 查看任務列表
- [ ] 標記任務完成
- [ ] 測試自動提醒 DM

### 4. 安靜時段
- **功能**: 晚上 11 點後禁止通知（可配置）
- **豁免**: urgent/emergency 類型不受限制
- **控制**: Cron Job 控制

**命令**:
```
!phase8 quiet on
!phase8 quiet off
!phase8 quiet set 23:00 08:00
!phase8 quiet status
!phase8 quiet test
```

**測試用例**:
- [ ] 啟用安靜時段
- [ ] 設定自訂時間範圍
- [ ] 測試安靜時段判斷
- [ ] 確認安靜時段跳過通知
- [ ] 確認 urgent 類型不受影響

### 5. 每月清理
- **功能**: 每月自動檢測閒置頻道/threads，自動歸檔
- **觸發**: 每月 1 號執行
- **閒置定義**: 超過 30 天無活動

**命令**:
```
!phase8 cleanup run
!phase8 cleanup status
!phase8 cleanup config [天數]
```

**測試用例**:
- [ ] 執行每月清理
- [ ] 查看清理狀態
- [ ] 設定閒置天數
- [ ] 驗證閒置 threads 被歸檔

### 6. Thread 封存
- **功能**: 自動為重要訊息啟用 Thread 封存
- **觸發**: 檢測到完成關鍵詞時
- **關鍵詞**: [完成], [已解决], [Closed], [Done]

**命令**:
```
!phase8 archive run
!phase8 archive list
!phase8 archive keywords
!phase8 archive add [關鍵詞]
```

**測試用例**:
- [ ] 執行手動封存檢查
- [ ] 查看封存記錄
- [ ] 添加自訂關鍵詞
- [ ] 測試關鍵詞觸發封存

## 捷徑命令

```
!deadline      - 查看任務列表
!deadline add [任務] [@user] [+1d] - 快速添加任務
!quiet status  - 查看安靜時段
!quiet on/off  - 開關安靜時段
!archive list  - 查看封存記錄
!phase8 status - 查看 Phase 8 整體狀態
```

## 功能狀態查看

```bash
!phase8 status
```

輸出:
```
📦 Phase 8 功能狀態

1. 任務同步
• Notion: ✅ 啟用 / ❌ 停用
• Airtable: ✅ 啟用 / ❌ 停用

2. CI 監控
• Jenkins: ✅ 啟用 / ❌ 停用
• CI Monitor: ✅ 啟用 / ❌ 停用

3. 截止提醒
• 狀態: ✅ 啟用 / ❌ 停用
• 任務數: X 個

4. 安靜時段
• 狀態: ✅ 啟用 / ❌ 停用
• 時間: 23:00 - 08:00

5. 每月清理
• 狀態: ✅ 啟用 / ❌ 停用
• 最後執行: 從未 / 2026-03-01

6. Thread 封存
• 狀態: ✅ 啟用 / ❌ 停用
• 已封存: X 個
```

## 預期輸出示例

### !phase8 help
```
📦 Phase 8: 6 項新功能

**1. Notion/Airtable 任務同步**
!phase8 notion enable [apiKey] [databaseId]
!phase8 notion channel [#channel]
!phase8 airtable enable [apiKey] [baseId]

... (其他命令)
```

### !phase8 deadline add "完成報告" @user +24h
```
✅ 已添加任務: 完成報告
⏰ 截止: 2026-03-22 09:15:00
👤 負責人: @user
```

### !deadline list
```
📝 **任務列表**

🔴 **完成報告**
   ID: task_1234567890
   👤 @user
   ⏰ 2026-03-22 09:15:00 (23小時)
```

## 測試時間安排

| 功能 | 預計測試時間 |
|------|-------------|
| Notion/Airtable 同步 | 30 分鐘 |
| Jenkins/CI 通知 | 30 分鐘 |
| 截止前自動提醒 | 1 小時 |
| 安靜時段 | 15 分鐘 |
| 每月清理 | 15 分鐘 |
| Thread 封存 | 30 分鐘 |

**總測試時間**: 約 3.5 小時