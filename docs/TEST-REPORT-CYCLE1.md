# TEST-REPORT-CYCLE1: Copilot Usage Visibility Testing

**Tester:** T仔 (Tester)
**Date:** 2026-03-28
**Server:** http://localhost:18899

---

## 1. WHAT IS VISIBLE

### Main Page (http://localhost:18899/)

The main virtual office page has a **Copilot Usage Dashboard section** embedded inline (`#copilot-dashboard`). It renders:

- **Quota Bar** — Shows `used / total (percentage%)` with a color-coded progress bar
  - Green (≤80%), Orange (80-95%), Red (≥95%)
- **Three stat boxes:** Remaining, Daily Budget, Reset Date
- **Recommendation Card** — Shows emoji label, recommended model, message
- **Model Strategy Buttons** — auto / premium / balanced / base (highlight active)
- **Summary Cards** — Today Cost, This Week Cost, Total Cost (with call counts)
- **7-Day Trend Chart** — ASCII bar chart showing daily premium costs
- **Model Distribution** — rendered in `#copilot-model-dist` (see JS)

### API Data Verified

**`GET /api/copilot/quota`** → Returns:
```json
{
  "success": true,
  "data": {
    "total": 300,
    "used": 0,
    "remaining": 300,
    "usedPercent": 0,
    "dailyBudget": 10,
    "daysRemaining": 30,
    "resetDate": null,
    "warningLevel": "normal",
    "modelPreference": "auto",
    "recommendation": { "level": "comfortable", "emoji": "🟢", "label": "配額充裕", ... }
  }
}
```

**`GET /api/copilot/analysis`** → Returns:
```json
{
  "success": true,
  "data": {
    "summary": { "today": { "count": 0, "premiumCost": 0 }, "week": {...}, "total": {...} },
    "modelDistribution": {},
    "featureDistribution": {},
    "trend7Days": [7 days of zero data],
    "lastUpdated": null
  }
}
```

---

## 2. WHAT IS MISSING / NOT WORKING

### Critical Issues

1. **Copilot analysis data is ALL ZEROS**
   - `analysis.summary.today.count = 0`
   - `analysis.summary.week.count = 0`
   - `analysis.summary.total.count = 0`
   - `trend7Days` shows 7 days of zeros
   - **The Copilot Premium data source is returning empty data**, making the dashboard meaningless

2. **copilot-summary-token-log.json returns 404**
   - The standalone page at `public/pages/copilot-usage.html` tries to fetch `../copilot-summary-token-log.json` → **Not Found**
   - This means the standalone copilot usage page is completely broken

3. **token-analysis.html returns 404 from server**
   - `public/pages/token-analysis.html` exists as a file but **cannot be served** — server returns "Not Found"
   - Likely a server routing issue (the static file server doesn't serve files from `/pages/` subdirectory)

4. **No data source for Copilot Premium usage**
   - The `/api/copilot/analysis` endpoint has `modelDistribution: {}` and `featureDistribution: {}`
   - The n8n workflow at localhost:5678 is **not active**
   - There is no active pipeline feeding Copilot usage data into the system

### Dashboard Display Issues

5. **Quota data shows ALL ZEROS too** (for used/today/week)
   - `GET /api/copilot/quota` shows `used: 0` — so even the quota is showing zero usage
   - The quota is showing the **limit/budget** correctly (300 total, 10 daily) but no actual usage

6. **7-Day Trend Chart shows empty bars** — all zeros, renders 0-height bars

7. **Model Distribution shows "暫無資料" (No Data)** — because `modelDistribution` is `{}`

8. **Sidebar mini-stats are separate** from the copilot dashboard
   - The sidebar has `#token-sidebar-stats` showing token records, cache rate, top model, last update
   - This is the **Minimax** token data, NOT Copilot Premium data
   - Users could confuse this with Copilot — there's no clear label distinguishing "Minimax tokens" from "Copilot Premium"

9. **"Copilot 使用情況（Prototype）" page is broken**
   - `public/pages/copilot-usage.html` — standalone prototype page
   - Fetches from non-existent `copilot-summary-token-log.json`
   - Shows "Prototype data only" footer — clearly not production

10. **No actual Copilot usage events being logged**
    - No mechanism visible to capture GitHub Copilot IDE events (code completions, acceptances)
    - The `copilot-summary-token-log.json` data source doesn't exist
    - Without actual data, even a perfect UI would show nothing

---

## 3. SPECIFIC ISSUES LIST

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | `/api/copilot/analysis` returns all zeros | 🔴 Critical | API Layer |
| 2 | `/api/copilot/quota` shows `used: 0` | 🔴 Critical | API Layer |
| 3 | `copilot-summary-token-log.json` → 404 | 🔴 Critical | copilot-usage.html |
| 4 | `/pages/token-analysis.html` → 404 from server | 🔴 Critical | Server routing |
| 5 | n8n workflow not active — no data pipeline | 🔴 Critical | Infrastructure |
| 6 | Model distribution empty — no breakdown | 🟡 High | Dashboard display |
| 7 | 7-day trend shows all-zero bars | 🟡 High | Dashboard display |
| 8 | Minimax token sidebar could be confused with Copilot | 🟡 High | Main page sidebar |
| 9 | No label distinguishing Minimax tokens vs Copilot | 🟡 High | UX/Labelling |
| 10 | `copilot-usage.html` is a broken prototype | 🟡 Medium | Standalone page |
| 11 | `resetDate: null` — no billing cycle info | 🟡 Medium | Quota display |
| 12 | Last updated timestamp is null | 🟡 Medium | Analysis API |

---

## 4. WHAT'S NEEDED TO MAKE COPILOT USAGE CLEARLY VISIBLE

### Immediate (Data Pipeline)

1. **Activate or build the Copilot data pipeline**
   - n8n workflow at localhost:5678 needs to be active
   - OR build an alternative: GitHub Copilot API → your server → `/api/copilot/...` endpoints
   - Without actual usage data, no UI will show anything useful

2. **Fix `copilot-summary-token-log.json`**
   - Create this JSON file OR update `copilot-usage.html` to fetch from the correct endpoint
   - Either generate sample data or point to the real API

3. **Fix server routing for `/pages/` directory**
   - Currently `GET /pages/token-analysis.html` → 404
   - Either add the route or serve the `public/pages/` directory

### Dashboard Improvements

4. **Rename/label the sidebar token stats clearly**
   - Change "Top Model" to something like "Top (Minimax)" to distinguish from Copilot models
   - Add "Copilot 模型" vs "Minimax 模型" labels

5. **Add a dedicated "Copilot Premium" section header**
   - Currently it's mixed into the general project page without clear section identification

6. **Show Copilot-specific model names** (once data exists)
   - e.g., Claude (via Copilot), GPT-4, Copilot suggestion/acceptance rates
   - Currently the "Model Distribution" panel would show these but has no data

7. **Add "Acceptance Rate" KPI** (GitHub Copilot metric)
   - Copilot has `suggestions` vs `acceptedSuggestions` — this is a key metric
   - Currently the dashboard only shows cost, not acceptance

8. **Add billing cycle / reset date display**
   - `resetDate` is `null` — show "Monthly reset: [date]" once available

### Standalone Pages

9. **Fix or remove `copilot-usage.html`**
   - It's a broken prototype — either fix it or remove the dead link

10. **Fix `token-analysis.html` routing or remove reference**
    - It's linked from the main page but returns 404

---

## 5. SUMMARY

**The Copilot section on the main page IS technically visible** — quota bar, summary cards, 7-day chart, and recommendation card are all rendered. The UI framework exists.

**But the data is all zeros** because:
1. The n8n data pipeline isn't active
2. There's no Copilot usage data being collected
3. The analysis API returns empty results

**Bottom line:** The Copilot visibility UI is ~70% complete (visual/structure), ~5% functional (shows quota limits but no usage). The missing 95% is the **actual data source** — without Copilot usage events flowing in, the dashboard will always show zeros.

**First priority:** Get the Copilot data pipeline working. Everything else is secondary.
