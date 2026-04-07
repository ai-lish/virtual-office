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

#### Tab 1: 📜 配額歷史 (Quota History)
- **來源：** `public/quota-history.json`（每 5 小時 cron snapshot）
- **Stats 卡片：** 平均 M* 用量/使用率、平均 Speech 用量、平均 Image 用量
- **篩選：** 全部日期 / 按月篩選
- **表格欄位：**
  | 欄 | 內容 |
  |--|--|
  | 日期 | Snapshot 日期 |
  | 時段 | 5 小時窗口（01-06, 06-11, 11-16, 16-21, 21-01 UTC） |
  | M* 已用 | M2.7 窗口已用 requests |
  | M* 總計 | 窗口總配額（4500） |
  | M* % | 使用率 % |
  | Speech 已用 | 當日 Speech 已用（每日 4000 上限） |
  | Image 已用 | 當日 Image 已用（每日 50 上限） |
  | 擷取時間 | Cron 實際運行時間 |
- **分頁：** 有

#### Tab 2: 🤖 Copilot 使用明細 (Copilot Details)
- **來源：** `public/copilot-summary.json`（Google Drive CSV）
- **Stats 卡片：** 總 Requests、Opus、Sonnet、其他模型
- **篩選模式：** 按月份 / 按星期 / 按日期
- **Compare 功能：** 顯示「前一週 / 本週 / 後一週」對比
- **表格欄位：**
  | 欄 | 內容 |
  |--|--|
  | 日期 | 日期 / 週 / 月 |
  | 模型 | 模型名稱（Opus / Sonnet / Sonnet 4 / Sonnet 4.6 等） |
  | Requests | 請求數量 |
  | 類型 | SKU 類型 |
- **每頁：** 50 條記錄

#### Tab 3: 📊 MiniMax 使用明細 (MiniMax Details)
- **來源：** `public/token-log.json`（Google Drive billing CSV）
- **Stats 卡片：** 記錄數、Input Tokens、Output Tokens、主要模型
- **Model 篩選 Tab：** 全部 / M2.5/M2.7 / Image-01 / Hailuo / Speech
- **Aggregation 模式：** Hourly / Daily / Weekly / Monthly
- **時間趨勢圖：** 每日 / 每週 / 每月用量趨勢
- **Compare 功能：** 「前一天 / 當日 / 後一天」或「前一週 / 本週 / 後一週」對比
- **表格欄位（取決於 Aggregation）：**
  | 欄 | 內容 |
  |--|--|
  | 時間 | 小時 / 日期 / 週 / 月 |
  | 模型 | 模型名稱 |
  | Input | Input token 數 |
  | Output | Output token 數 |
  | Total | 總 token 數 |
  | API | API 類型（chatcompletion / cache-read / cache-create / image-generation / t2a-v2） |
- **分頁：** 月模式 50 條、週模式 20 條、日模式 10 條

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
