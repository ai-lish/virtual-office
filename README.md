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
