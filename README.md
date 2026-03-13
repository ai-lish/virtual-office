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

### 3. 通知中心 🔔
- 顯示系統通知
- 點擊彈出通知列表
- 可標記已讀或清除

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

### 8. 其他功能
- Tab 狀態記憶
- 快速返回頂部
- 手機優化 📱

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
