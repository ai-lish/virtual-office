# 虛擬辦公室 (Virtual Office)

**Live:** https://math-lish.github.io/virtual-office/

A real-time MiniMax quota dashboard with Japanese-corporate aesthetic (深紅 + 深藍).

---

## 🗺️ Architecture

Single-file app: `index.html` (~16KB) contains all HTML, CSS, and JS. No build step.

### Layout
- **Header** — sticky top bar with title, last update time, and GitHub link
- **Quota Grid** — cards showing live MiniMax M2.7 / Speech / Image / Copilot quotas
- **Detail Grid** — expandable sections for model breakdown and project list
- **Footer** — minimal

---

## ✅ Features

- **Live quota cards** — M2.7, Speech 2.8-HD, Image-01, Copilot usage
- **Progress bars** — visual fill for each quota with color-coded status
- **Model detail sections** — expandable per-model breakdown
- **Project list** — links to managed projects
- **Mobile responsive** — single column on small screens
- **Auto-refresh** — cron updates JSON every ~5hrs; page reads JSON

---

## 🛠️ Tech Stack

- **Pure HTML/CSS/JS** — no framework, no build
- Fonts: Noto Sans SC (Google Fonts)
- Dark theme via CSS custom properties
- Data: JSON files served via GitHub Pages

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `index.html` | Single-file app (HTML + CSS + JS) |
| `public/minimax-api-status.json` | Live MiniMax quota snapshot |
| `public/quota-history.json` | Historical quota snapshots (window-based, 90-day retention) |

---

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

---

## 🚀 Run

```bash
npx serve .
# or
python3 -m http.server 8080
```
