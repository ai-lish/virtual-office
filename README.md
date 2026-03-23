# 虛擬辦公室 (Virtual Office)

## 📋 簡介
實時監控 AI 助手工作狀態既管理中心。

## 🚀 功能列表

### 1. 書記浮動頭像 🦀
- 右側浮動顯示
- 點擊顯示書記資訊 (天氣 + 心情)
- 根據時間顯示不同狀態
- **可拖曳移動位置**

### 2. 主題切換 🌙/☀️
- 點擊切換日夜主題
- 自動記住用戶偏好 (localStorage)
- **5種自訂主題** (ocean, forest, sunset...)
- **SVG 深色模式優化**

### 3. 通知中心 🔔
- 顯示系統通知
- 點擊彈出通知列表
- 可標記已讀或清除
- **通知訂閱功能**
- **任務倒數顯示**

### 4. 工作氣泡 💬
- 右上角浮動氣泡
- 顯示當前任務
- 每10秒自動更新
- 不同狀態有不同動畫
- **任務完成倒數**

### 5. 項目時序 📊
- 左側邊欄顯示
- 項目狀態一目了然
- 顯示進度百分比

### 6. 工作排程 📅
- 左側邊欄顯示
- 每日定時任務
- Timeline 圖示化顯示

### 7. 項目詳情
- GitHub Stats (stars/forks)
- Commit 歷史
- PDF 圖像庫
- SVG 比對工具

### 8. 統計圖表 📈
- 顯示通過率
- 顯示題目數據
- 可導出報告

### 9. 其他功能
- Tab 狀態記憶
- 快速返回頂部
- 手機優化 📱
- 項目搜索
- 數據緩存優化
- 自動化備份
- 導出功能 (PDF/Markdown)
- 權限管理

## ✅ 已完成功能 (17項)

| # | 功能 | 說明 | 狀態 |
|---|------|------|------|
| 1 | 數據緩存優化 | CacheManager - 智能緩存系統 | ✅ |
| 2 | 圖像比對記錄 | ImageCompareRecord - 儲存通過/失敗狀態 | ✅ |
| 3 | 自動化備份 | AutoBackup - 自動備份設置 | ✅ |
| 4 | 統計圖表 | showStatistics() - 顯示統計數據 | ✅ |
| 5 | 自訂義主題 | CustomThemes - 5種主題 | ✅ |
| 6 | 通知訂閱 | NotificationSubscription - 訂閱通知 | ✅ |
| 7 | 導出功能 | exportProjectReport() - 導出報告 | ✅ |
| 8 | 項目搜索 | searchProjects() - 快速搜索 | ✅ |
| 9 | 權限管理 | PermissionManager - admin/user/guest | ✅ |
| 10 | API 集成 | APIIntegration - 統一 API 調用 | ✅ |
| 11 | 任務倒數 | TaskCountdown - 工作氣泡倒數 | ✅ |
| 12 | SVG深色優化 | applySvgDarkMode() - 深色模式 | ✅ |
| 13 | PDF圖像分類 | PDF圖像庫管理 | ✅ |
| 14 | TEST狀態追蹤 | 顯示項目最後測試時間 | ✅ |
| 15 | 質量報告 | 每週SVG製作進度匯總 | ✅ |
| 16 | 工作氣泡動畫 | 打字中、思考中動畫 | ✅ |
| 17 | 工作狀態文字 | 具體工作描述顯示 | ✅ |

## 📝 更新記錄
- 2026-03-14: 完成全部17項功能
- 2026-03-20: Phase 4 - Voice 頻道虛擬桌面 + 自動清理腳本
- 2026-03-21: Phase 3 - Standup + Status + 儀表板

## 🎯 Phase 3: Standup + Status + 儀表板

### 功能 1: Status 頻道
- 設立 #status 頻道
- 團隊成員用短訊息更新當前工作狀態
- 格式：「🔵 正在處理 [任務] - 預計完成時間」
- 使用 Reaction 表情表達進度：✅ 完成、⏳ 進行中、🚫 阻礙

### 功能 2: Standup 自動化
- 每日定時 Bot 發送問題模板
- 「今日完成？/ 明日計劃？/ 阻礙？」
- 成員回覆後，Bot 自動整理並發佈至 #standups-summary 頻道

### 功能 3: 進度儀表板捷徑
- 在固定訊息置頂專案進度連結（Google Sheets / Notion / Linear）
- 使用 Discord 既公告頻道發佈每週進度報告

### 命令列表

```
# 狀態命令
!status                    # 查看所有成員狀態
!status set [任務]         # 設定當前狀態
!status done              # 標記完成
!status blocker [原因]     # 標記阻礙
!status clear             # 清除狀態

# Standup 命令
!standup                  # 獲取 Standup 範本
!standup reply            # 回覆今日 Standup
!standup list             # 查看今日 Standup
!standup summary          # 生成摘要

# 儀表板命令
!dashboard                # 查看儀表板連結
!dashboard set [type] [URL]  # 設定連結 (sheets|notion|linear)
!dashboard pin            # 置頂訊息
!dashboard weekly         # 測試每週報告
```

### 相關檔案
- `status-db.json` - 成員狀態資料庫
- `standup-db.json` - Standup 記錄資料庫
- `dashboard-config.json` - 儀表板配置

### 新增頻道
- #status (ID: 1484660301449134101)
- #standups-summary (ID: 1484660313705025626)
- #project-dashboard (ID: 1484660327923712001)

## 🎯 Phase 4: Voice 頻道虛擬桌面 + 自動清理

### 功能 1: Voice 頻道虛擬桌面
- 監控「設計組」「開發組」「客服組」語音頻道
- 成員加入頻道 = 「在崗」狀態
- 網站即時顯示各組在崗人數
- API: `/api/voice-status`

### 功能 2: 自動清理腳本
- 自動歸檔已完成項目的頻道
- 在落後於計劃的 threads 頂部添加「⚠️ 落後進度」提醒

### 啟動方式

```bash
# 啟動 Web 服務器 (同時提供 API)
npm start

# 啟動 Discord Bot (需要設置環境變量)
DISCORD_BOT_TOKEN=your_token npm run bot

# 運行自動清理腳本
npm run cleanup
```

### 環境變量
- `DISCORD_BOT_TOKEN` - Discord Bot Token (從 https://discord.com/developers/applications 获取)
- `PORT` - Web 服務器端口 (默認 18899)

## 🎯 Phase 8: 6項新功能 (2026-03-21)

### 功能 1: Notion/Airtable 任務同步
- 監控 Notion/Airtable 中的任務更新
- 有更新時自動推送到 Discord 相關頻道
- 每 5 分鐘自動檢查

### 功能 2: Jenkins/CI 建置通知
- 監控 Jenkins build 狀態
- 建置成功/失敗時自動通知
- 支持 GitHub Actions, GitLab CI 等

### 功能 3: 截止前自動提醒
- 設定任務的截止時間
- 截止前 24小時、2小時、1小時自動 DM 負責人
- 支持 +1d, +2h 等相對時間格式

### 功能 4: 安靜時段
- 設定晚上 11 點後禁止通知
- 可以用 Cron Job 控制
- 緊急/urgent 類型可豁免

### 功能 5: 每月清理
- 自動檢測閒置的頻道/threads
- 自動歸檔到「歸檔」分類
- 閒置定義：超過 30 天無活動

### 功能 6: Thread 封存
- 自動為重要訊息啟用 Thread 封存
- 檢測關鍵詞：[完成], [已解决], [Closed], [Done]
- 保留記錄但不干擾主頻道

### 命令

```bash
# Phase 8 幫助
!phase8                     # 查看幫助
!phase8 status              # 查看狀態

# 任務同步
!phase8 notion enable [apiKey] [databaseId]
!phase8 notion channel [#channel]
!phase8 airtable enable [apiKey] [baseId]

# CI 監控
!phase8 jenkins enable [url] [user] [token]
!phase8 jenkins addjob [jobName]
!phase8 ci enable github

# 截止提醒
!phase8 deadline add [任務] [@user] [+1d]
!phase8 deadline list
!phase8 deadline remove [id]

# 安靜時段
!phase8 quiet on/off
!phase8 quiet set 23:00 08:00
!phase8 quiet status

# 每月清理
!phase8 cleanup run
!phase8 cleanup status

# Thread 封存
!phase8 archive run
!phase8 archive list
!phase8 archive add [關鍵詞]

# 捷徑命令
!deadline         # 查看任務列表
!quiet status     # 查看安靜時段
!archive list     # 查看封存記錄
```

### 相關檔案
- `phase8-new-features.js` - Phase 8 功能模組
- `phase8-data.json` - Phase 8 數據存儲

### 測試文檔
- `TEST-PLAN-PHASE8.md` - 詳細測試計劃

## 🎨 考試頁面製作 (SVG Workflow)

### 工作流程

```
1. Zach 用 Gemini 製作 SVG
2. 加入 Google Docs (分頁：P2-q13)
3. Send Google Docs 連結比我
4. 我：
   a. 讀取文檔 → 提取 SVG Code
   b. 加入 math-svg-tools.html
   c. 更新考試網頁
   d. Commit + Push
```

### 追蹤清單

- Google Docs: `exam-svg`
- SVG 工具庫: `math-svg-tools.html`
- 試卷頁面: `exam-202X-XX-sX-termX-pX.html`

## 🖥️ 網址
https://math-lish.github.io/virtual-office/

## 📁 檔案結構
- `index.html` - 主頁面
- `project-records.json` - 項目記錄
- `project-timeline.json` - 項目時序
- `project-manuals.json` - 項目手冊
