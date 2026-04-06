# 虛擬辦公室 (Virtual Office)

**Live:** https://math-lish.github.io/virtual-office/

A real-time MiniMax quota dashboard with Japanese-corporate aesthetic (深紅 + 深藍).

---

## 🗺️ Architecture

Two single-file apps (HTML + CSS + JS). No build step.

### Layout
- **Header** — sticky top bar with title, last update time, and GitHub link
- **Quota Grid** — cards showing live MiniMax M2.7 / Speech / Image / Copilot quotas
- **Detail Grid** — expandable sections for model breakdown and project list
- **Footer** — minimal

---

## 📄 Pages

| Page | URL | Purpose |
|------|-----|---------|
| `index.html` | / | Live quota dashboard |
| `dashboard.html` | /dashboard.html | Historical analysis & Copilot details |

---

## ✅ Features

### index.html — Live Dashboard
- **Live quota cards** — M2.7, Speech 2.8-HD, Image-01, Copilot usage
- **Progress bars** — visual fill for each quota with color-coded status
- **Model detail sections** — expandable per-model breakdown
- **Project list** — links to managed projects
- **Mobile responsive** — single column on small screens
- **Auto-refresh** — page fetches JSON every 5 minutes

### dashboard.html — Analysis Dashboard

**Tab: 配額歷史 (Quota History)**
- Date filter (全部日期)
- Stats summary: average usage and percentages per model
- History table with columns: 日期, 時段, M* 已用, M* 總計, M* %, Speech 已用, Image 已用, 擷取時間
- Pagination support

**Tab: Copilot 使用明細 (Copilot Details)**
- Filter: 按月份 / 按星期 / 按日期
- Comparison table (上 / 今 / 下) for selected period
- Pagination (page size configurable)

**Tab: MiniMax 使用明細 (MiniMax Details)**
- Token usage analysis (aggregatable Hourly / Daily / Weekly)
- Per-model breakdown; trend charts (daily/weekly/monthly) with one line per model
- 上/今/下 比較表（table format）由 tk-filter-mode 控制
- Detail table aggregation controlled by Hourly/Daily/Weekly toggle placed above the table

**Data Sources:**
- `public/minimax-api-status.json` — MiniMax API realtime snapshot
- `public/token-log.json` — MiniMax token usage log (generated from CSV)
- `public/copilot-summary.json` — Copilot unified data (for Copilot tab)

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
| `dashboard.html` | Analysis dashboard (HTML + CSS + JS) |
| `public/minimax-api-status.json` | Live MiniMax quota snapshot |
| `public/quota-history.json` | Historical quota snapshots (window-based, 90-day retention) |
| `public/token-log.json` | MiniMax token usage log (CSV → JSON) |
| `scripts/csv-to-token-log.js` | Convert export_bill_*.csv → public/token-log.json |

---

## 🤖 MiniMax Quota Monitoring

### Data Flow (updated)
```
Google Drive (Minimax Token CSVs, export_bill_*.csv)
    ↓  (gog drive download / manual drop to data/)
virtual-office/data/export_bill_*.csv
    ↓  node scripts/csv-to-token-log.js (merge + dedupe)
public/token-log.json  ← dashboard.html 讀此檔顯示明細與趨勢

miniMax API /v1/api/openplatform/coding_plan/remains
    ↓  scripts/refresh-data.sh
public/minimax-api-status.json (live quota snapshot)
    ↓  scripts/update-quota-history.sh
public/quota-history.json (history)
```

### Google Drive (Minimax Token folder)
- Folder ID: `1k2CbG1Z2lvOLl-szMt8YT5P5NaWD0T5Y` (Minimax Token)
- CSV files: `export_bill_*.csv` (hourly consumption rows)
- Local storage: `virtual-office/data/`

### CSV → JSON
- Script: `node scripts/csv-to-token-log.js`
- Behavior: reads all `data/export_bill_*.csv`, normalizes columns, deduplicates by `consumptionTime + consumedApi + consumedModel`, writes `public/token-log.json` with structure used by dashboard
- Run manually: `node scripts/csv-to-token-log.js`

---

## 🔁 Refresh / Cron

Cron (launchctl) triggers the data refresh and commit pipeline:
```
launchctl cron (HKT 07:55/12:55/17:55/22:55/03:55)
  → scripts/minimax-cron.sh
    → scripts/refresh-data.sh minimax
      → calls API, updates minimax-api-status.json
      → downloads new CSVs to data/ and runs csv-to-token-log.js
      → updates public/token-log.json and pushes to repo
```

### Cron Schedule (HKT)
| HKT | UTC | Window |
|-----|-----|--------|
| 07:55 | 23:55 | 21-01 |
| 12:55 | 04:55 | 01-06 |
| 17:55 | 09:55 | 06-11 |
| 22:55 | 14:55 | 11-16 |
| 03:55 | 19:55 | 16-21 |

### Manual Refresh
```bash
cd virtual-office && bash scripts/refresh-data.sh minimax
# or: node scripts/csv-to-token-log.js
```

---

## 🧪 Testing

### Local smoke / E2E
- Use Playwright to run smoke tests (script provided in `scripts/tests/` or spawn the tester skill)
- Example (local):
```bash
node scripts/tests/playwright-smoke.js
```

### Tester Skill
- `workspace/skills/minimax-test/SKILL.md` — instructions to spawn a tester subagent (T仔) to run CSV→JSON verification, Playwright smoke, and optional burst tests.

---

## ⚠️ Security & Notes

- Do **NOT** commit API keys, Google Drive OAuth tokens, or private CSV files to the public repo.
- Use local keychain or CI secrets for credentials used by `gog` and refresh scripts.
- Fetching JSON files via `file://` will fail in browsers due to fetch security — use a local HTTP server for local testing (e.g., `python3 -m http.server` or `npx http-server`).

---

## Changelog (short)
- `feat`: CSV→JSON pipeline added (scripts/csv-to-token-log.js) — generates `public/token-log.json`
- `feat`: MiniMax tab enhancements — aggregation toggle, trend chart, model filter
- `fix`: Homepage quota grid parsing (PR #10) — `current_interval_usage_count` interpreted as remaining quota

---

If you want I can create a small PR that only updates README.md with this content (so you can review). I can also commit directly to main if you prefer.
