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

### 3. 通知中心 🔔
- 顯示系統通知
- 點擊彈出通知列表
- 可標記已讀或清除
- **通知訂閱功能**

### 4. 工作氣泡 💬
- 右上角浮動氣泡
- 顯示當前任務
- 每10秒自動更新
- 不同狀態有不同動畫

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

## 🆕 10項新功能 (2026-03-14)

| # | 功能 | 說明 |
|---|------|------|
| 1 | 數據緩存優化 | CacheManager - 智能緩存系統 |
| 2 | 圖像比對記錄 | ImageCompareRecord - 儲存通過/失敗狀態 |
| 3 | 自動化備份 | AutoBackup - 自動備份設置 |
| 4 | 統計圖表 | showStatistics() - 顯示統計數據 |
| 5 | 自訂義主題 | CustomThemes - 5種主題 (ocean, forest, sunset...) |
| 6 | 通知訂閱 | NotificationSubscription - 訂閱主題通知 |
| 7 | 導出功能 | exportProjectReport() - 導出項目報告 |
| 8 | 項目搜索 | searchProjects() - 快速搜索項目 |
| 9 | 權限管理 | PermissionManager - admin/user/guest 權限 |
| 10 | API 集成 | APIIntegration - 統一 API 調用 |

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
