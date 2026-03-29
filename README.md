# 虛擬辦公室 (Virtual Office)

** Live:** https://math-lish.github.io/virtual-office/

A real-time AI assistant work-status monitoring and management dashboard, styled with a Japanese-corporate aesthetic (深紅 + 深藍).

---

## 🗺️ 網站架構

### Views / Sections
| View | ID | Description |
|------|----|-------------|
| Home | `#homeView` | Hero, token stats, Copilot dashboard, agent grid, skills |
| Agents | `#agentsView` | Full agent workflow diagram |
| Detail | `#detailView` | Per-project: info, manual, test notes, SVG compare, secretary summary |

### Navigation
- **Sidebar** (`#sidebar`) — fixed left on desktop, hamburger overlay on mobile
  - Project list (collapsible)
  - Project timeline mini (collapsible)
  - Schedule mini (collapsible)
  - Token stats (collapsible)
- **Top bar** — agent status dots (🧠 brain, 🧪 tester, 💻 dev, 📝 secretary) + online mode badge

### Floating Elements
| Element | Purpose |
|---------|---------|
| Floating Secretary (`#floatingSecretary`) | Draggable avatar, shows weather + mood. Hidden on mobile. |
| Notification Bell (`#notificationBell`) | Bottom-right. Opens notification dropdown. |
| Working Bubble (`#workingBubble`) | Top-right. Shows current task + animated status. |
| Theme Toggle | 🌙/☀️ toggle, bottom-right above bell |

### Modals
- **Skills Modal** (`#skillsModal`) — grouped skill list (office / production / testing)
- **Workflow Modal** (`#workflowModal`) — full agent step-by-step flows

---

## ✅ 功能列表

### 書記浮動頭像 🦀
- 右側浮動顯示，可拖曳移動位置
- 點擊顯示書記資訊 (天氣 + 心情)
- 根據時間顯示不同狀態

### 主題切換 🌙/☀️
- 點擊切換日夜主題，自動記住偏好 (localStorage)
- 5種自訂主題 (ocean, forest, sunset, etc.)

### 通知中心 🔔
- 系統通知列表，支援已讀/清除
- 任務倒數顯示
- 通知訂閱功能

### 工作氣泡 💬
- 右上角浮動，顯示當前任務
- 每10秒自動更新
- 狀態動畫：工作中(綠)、打字中、思考中(橙)、已完成(綠)、閒置(藍)

### 項目時序 📊 / 工作排程 📅
- 左側邊欄摺疊顯示
- Timeline 圖示化

### 項目詳情
- GitHub Stats (stars/forks)
- Commit 歷史
- PDF 圖像庫
- SVG 比對工具

### 統計圖表 📈
- Token 通過率、題目數據
- GitHub Copilot Premium 用量儀表板（配額/趨勢/模型分佈）
- 可導出報告

### 其他
- Tab 狀態記憶 (localStorage)
- 快速返回頂部按鈕
- 項目搜索
- 數據緩存優化
- 導出功能 (PDF/Markdown)
- 權限管理 (admin/user/guest)

---

## 📱 Mobile UX (≤768px)

- Sidebar collapses to hamburger button (slides in as full-screen overlay)
- Floating secretary hidden
- Notification bell moved to bottom-right (away from content)
- Working bubble spans full width below top-bar
- Notification dropdown becomes bottom-sheet (full-width)
- Copilot dashboard grids stack to single column
- Detail tabs scroll horizontally
- Modals constrained to 80vh with internal scroll

---

## 🛠️ 技術棧

- **Pure HTML/CSS/JS** — no build step required
- Fonts: Noto Sans SC + Zen Maru Gothic (Google Fonts)
- Themes: CSS custom properties (`:root`)
- Storage: localStorage (preferences, tab state, test status, theme)

---

## 🚀 啟動

```bash
# 本地預覽 (任意靜態服務器)
npx serve .
# 或
python3 -m http.server 8080
```

---

## 📁 主要檔案

| 檔案 | 用途 |
|------|------|
| `index.html` | 主頁面 (~4800 lines, 單檔包含所有 HTML/CSS/JS) |
| `project-records.json` | 項目元數據 |
| `project-timeline.json` | 項目時序 |
| `project-manuals.json` | 項目手冊 |
| `token-log.json` | Token 使用日誌 |
| `copilot-usage-db.json` | Copilot 用量數據 |
| `vo-*.json` | 各模組數據 (status, standup, pomodoro, reminder…) |
