# 虛擬辦公室 (Virtual Office)

**Live:** https://math-lish.github.io/virtual-office/

A real-time AI assistant work-status monitoring and management dashboard, styled with a Japanese-corporate aesthetic (深紅 + 深藍).

---

## 🗺️ Architecture

Single-file app: `index.html` (~4800 lines) contains all HTML, CSS, and JS. No build step.

### Views
| View | ID | Description |
|------|----|-------------|
| Home | `#homeView` | Hero, token stats, Copilot usage dashboard, agent grid, skills |
| Agents | `#agentsView` | Full agent workflow diagram |
| Detail | `#detailView` | Per-project info, manual, test notes, SVG compare, secretary summary |

### Navigation
- **Sidebar** (`#sidebar`) — fixed left on desktop; hamburger overlay with backdrop on mobile (≤768px)
  - Project list (collapsible)
  - Project timeline mini (collapsible)
  - Schedule mini (collapsible)
  - Token stats (collapsible)
- **Top bar** — agent status dots (🧠 brain, 🧪 tester, 💻 dev, 📝 secretary) + online mode badge

### Floating Elements
| Element | Behavior |
|---------|----------|
| Floating Secretary (`#floatingSecretary`) | Draggable avatar + weather/mood. **Hidden on mobile.** |
| Notification Bell (`#notificationBell`) | Bottom-right. Opens notification dropdown (bottom-sheet on mobile). |
| Working Bubble (`#workingBubble`) | Top-right. Shows current task. Full-width on mobile. |
| Theme Toggle | 🌙/☀️ toggle, bottom-right above bell |

### Modals
- **Skills Modal** (`#skillsModal`) — grouped skill list
- **Workflow Modal** (`#workflowModal`) — agent step-by-step flows

---

## 📱 Mobile (≤768px)

- Sidebar collapses to hamburger; slides in as full-screen overlay with backdrop
- Tapping backdrop or selecting a project auto-closes sidebar
- Floating secretary hidden; notification bell repositioned
- Working bubble spans full width below top-bar
- All grid layouts (Copilot dashboard, token stats, agent grid, detail grids) stack to single column
- Detail tabs scroll horizontally
- Modals constrained to 80vh with internal scroll
- Touch targets enlarged (44px minimum)

---

## ✅ Features

- **書記浮動頭像** 🦀 — draggable, time-aware status
- **Theme toggle** 🌙/☀️ — light/dark + 5 custom themes (localStorage)
- **Notification center** 🔔 — system notifications, task countdown, subscriptions
- **Working bubble** 💬 — auto-refreshing current task with animated status
- **Project timeline** 📊 / **Schedule** 📅 — collapsible sidebar sections
- **Project detail** — GitHub stats, commit history, PDF gallery, SVG compare
- **Token & Copilot dashboards** 📈 — usage charts, quota tracking, model distribution, exportable reports
- **Tab state memory** — localStorage persistence
- **Search, export (PDF/MD), permissions** (admin/user/guest)

---

## 🛠️ Tech Stack

- **Pure HTML/CSS/JS** — no framework, no build
- Fonts: Noto Sans SC + Zen Maru Gothic (Google Fonts)
- Themes: CSS custom properties (`:root`)
- Storage: localStorage

---

## 🚀 Run

```bash
npx serve .
# or
python3 -m http.server 8080
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `index.html` | Single-file app (HTML + CSS + JS) |
| `project-records.json` | Project metadata |
| `project-timeline.json` | Timeline data |
| `project-manuals.json` | Project manuals |
| `token-log.json` | Token usage log |
| `copilot-usage-db.json` | Copilot usage data |
| `vo-*.json` | Module data (status, standup, pomodoro, etc.) |
| `server.js` | Optional Node.js API server |
| `public/minimax-api-status.json` | Live MiniMax quota (M2.7/Speech/Image) |
| `public/quota-history.json` | Historical quota snapshots (18 windows, 90-day retention) |

## 🤖 MiniMax Quota Monitoring

### Data Flow
```
launchctl cron (HKT 07:55/12:55/17:55/22:55/03:55)
  → scripts/minimax-cron.sh
    → scripts/refresh-data.sh minimax
      → MiniMax API /v1/api/openplatform/coding_plan/remains
      → public/minimax-api-status.json (live)
      → Google Sheet (MiniMax QUOTA)
      → scripts/update-quota-history.sh
        → public/quota-history.json (history)
    → git commit + push
```

### Cron Schedule (HKT)
| HKT | UTC | Window |
|-----|-----|--------|
| 07:55 | 23:55 | 21-01 |
| 12:55 | 04:55 | 01-06 |
| 17:55 | 09:55 | 06-11 |
| 22:55 | 14:55 | 11-16 |
| 03:55 | 19:55 | 16-21 |

### launchctl
```bash
launchctl list | grep minimax  # check status
launchctl unload/load ~/Library/LaunchAgents/ai.openclaw.minimax-cron.plist  # reload
```

### Manual Refresh
```bash
cd virtual-office && bash scripts/refresh-data.sh minimax
```

### Key Scripts
| Script | Purpose |
|--------|---------|
| `scripts/refresh-data.sh` | Fetches API, writes JSON + Sheet |
| `scripts/update-quota-history.sh` | Deduplicates + appends to history |
| `scripts/minimax-cron.sh` | Cron wrapper: refresh + git commit/push |
