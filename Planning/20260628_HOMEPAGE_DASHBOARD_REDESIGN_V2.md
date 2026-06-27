# 20260628_HOMEPAGE_DASHBOARD_REDESIGN_V2

## 1. 背景

Zach 2026-06-28 00:30 HKT 對 V1 redesign 提出新要求。V1 (commit `c5a866a`) 雖然已部署並通過所有測試，但 design 細節同 Zach 嘅 final vision 有落差。重新做過。

### 1.1 V1 已完成（保留作 reference）

- Commit `c5a866a` 已 merge 到 main，live site 已 deploy
- 4 張 detail card (Codex / Claude / MiniMax / Copilot) 喺首頁
- Dashboard 有 `🛠️ AI Coding Tools 即時狀態` section 喺 history tab 頂部
- Codex review verdict 全部 fixed
- 84/84 Playwright tests pass
- 已準備 Hermes handoff file (`/tmp/hermes_redesign_bulk_test_msg.md`) — **HANDOFF V2 需要更新**

### 1.2 V2 新要求（Zach 2026-06-28 確認）

| # | 要求 | 確認 |
|---|---|---|
| 1 | 首頁 1 張 card 顯示所有 agent (6 欄 table-style) | A ✅ |
| 2 | Copilot 第 1 row 顯示「本月 X% (X/300) + Reset」 | A ✅ |
| 3 | Plan defaults hardcode 入 fetch-usage.py | A ✅ |
| 4 | Dashboard unified refresh cron (合併 usage + minimax) | A ✅ |
| 5 | MiniMax 唔顯示 Video model | A ✅ |
| 6 | Dashboard 唔顯示即時狀態 section (純歷史) | 新增 ✅ |
| 7 | v2 history tables 加入 Codex + Claude | 新增 ✅ |

## 2. 設計目標

**首頁**：1 張 single card，6 欄 table-style，最 minimal，純即時狀態 (no detail expand)

**Dashboard**：純歷史 (no 即時狀態)，v2 tables 加入 Codex/Claude columns，MiniMax tab 刪走 Video

**Cron**：合併為 unified quota-cron.sh，single timestamp，single commit + push

## 3. 詳細設計

### 3.1 首頁設計 (index.html)

#### 3.1.1 單張 card layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚡ Agent 配額                                更新: 00:30 HKT       │
├─────────────┬──────┬──────────┬──────────┬───────────┬─────────────┤
│ 🤖 Codex    │ PLUS │   35%    │   36%    │ 03:01 HKT │ 07-01 10:05 │
│ 🤖 Claude   │ PRO  │   31%    │    7%    │ 02:50 HKT │ 07-03 00:00 │
│ 🤖 MiniMax  │ PLUS │    1%    │    0%    │ 23:00 HKT │     —      │
│ 🤖 Copilot  │ PRO  │ 本月 18% (54/300)        │ Reset 06-30         │
└─────────────┴──────┴──────────┴──────────┴───────────┴─────────────┘
```

#### 3.1.2 Column 規格

| Column | Codex | Claude | MiniMax | Copilot |
|---|---|---|---|---|
| Agent | 🤖 Codex | 🤖 Claude Code | 🤖 MiniMax | 🤖 GitHub Copilot |
| Plan | `PLUS` | `PRO` | `PLUS` | `PRO` |
| 5h | `primary_5h.used_percent`% | `primary_5h.used_percent`% | `general.5h window`% | `本月 X% (X/300)` |
| 7d | `secondary_7d.used_percent`% | `secondary_7d.used_percent`% | `general.週 window`% | `—` (merged into 5h) |
| Reset 5h | `primary_5h.reset_at_hkt` | `primary_5h.reset_at_hkt` | `general.resetTime` | `month reset date` |
| Reset 7d | `secondary_7d.reset_at_hkt` | `secondary_7d.reset_at_hkt` | `—` | `—` |

#### 3.1.3 Plan badge 樣式

- `PLUS` → blue badge
- `PRO` → purple badge
- 由 `fetch-usage.py` 直接寫入 JSON (`codex.plan`, `claude.subscription`, `copilot.subscription`, `minimax.plan`)
- Default fallback (API 唔暴露時) hardcode 入 fetch-usage.py

#### 3.1.4 Copilot row 特殊處理

Copilot 冇 5h/7d window (係 monthly)，所以 row layout 唔同：
- 5h column 顯示 `本月 X% (X/300)` (merge)
- 7d column 顯示 `—`
- Reset 5h column 顯示 `Reset YYYY-MM-DD` (下個月 1 號)
- Reset 7d column 顯示 `—`

OR 整個 row 用 colspan merge 變 1 行：
```
│ 🤖 Copilot  │ PRO  │       本月 18% (54/300)              │ Reset 06-30         │
```
(推薦 — 更易讀，避免空 column)

#### 3.1.5 Responsive

- Desktop (>1024px): 完整 6 欄 table
- Tablet (640-1024px): Plan column 隱藏 (in tooltip / hover)
- Mobile (<640px): Stacked rows，每個 agent 1 個 card，內部 6 個 field 上中下排

### 3.2 Dashboard 設計 (dashboard.html)

#### 3.2.1 Tab 1: 配額歷史 (history)

❌ **刪走** `🛠️ AI Coding Tools 即時狀態` section (V1)

✅ **保留** history 表格，但擴展：

**v1 section** (pre-2026-06-01, M2.7/Speech/Image): 唔變

**v2 section** (2026-06-01+, credit-based) — **擴展 columns**：

| Column | Source | V2 |
|---|---|---|
| 日期 | `entry.date` | ✅ keep |
| 時段 | `entry.window` | ✅ keep |
| `[5hr] MiniMax %` | `entry.general.usedPct` | ✅ keep |
| `[週] MiniMax %` | `entry.general.weeklyPct` | ✅ keep |
| `[5hr] Codex %` | `entry.codex.primary_5h_pct` | ✅ NEW |
| `[週] Codex %` | `entry.codex.secondary_7d_pct` | ✅ NEW |
| `[5hr] Claude %` | `entry.claude.primary_5h_pct` | ✅ NEW |
| `[週] Claude %` | `entry.claude.secondary_7d_pct` | ✅ NEW |

✅ **刪走** Video columns (per Zach item 5)

#### 3.2.2 Tab 2: Copilot 使用明細

✅ 維持 V1 layout 唔變

#### 3.2.3 Tab 3: MiniMax 使用明細

❌ **刪走** Video model display (per Zach item 5)
❌ **刪走** 即時狀態 block (per Zach 2026-06-28 01:03 — dashboard 100% 歷史)

✅ **只保留** 歷史記錄 table：
- General model (5h + 週)
- 與 Tab 1 v2 table 同 schema

```
┌─────────────────────────────────────────────────────────────────────┐
│  📊 MiniMax 使用明細                                                │
│                                                                     │
│  ❌ 即時狀態 (即時狀態只限首頁)                                      │
│                                                                     │
│  📅 歷史記錄 (existing credit-based tables)                          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ 日期    │ 時段   │ General 5h% │ General 週% │ Source           ││
│  ├─────────┼────────┼─────────────┼─────────────┼──────────────────┤│
│  │ 06-28   │ 00-05  │    1%       │    0%       │ minimax-api...   ││
│  │ ...                                                            ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Data Schema (fetch-usage.py + refresh-data.sh)

#### 3.3.1 `public/usage-quota.json`

```json
{
  "_generatedAt": "2026-06-28T...",
  "_source": "unified-cron",
  "_version": 2,
  "codex": {
    "available": true,
    "plan": "plus",       // HARDCODED fallback
    "limit_reached": false,
    "used_percent": 35,
    "primary_5h": { "used_percent": 35, "reset_at_hkt": "06-28 03:01" },
    "secondary_7d": { "used_percent": 36, "reset_at_hkt": "07-01 10:05" }
  },
  "claude": {
    "available": true,
    "subscription": "pro", // HARDCODED fallback (was "n/a")
    "used_percent": 31,
    "primary_5h": { "used_percent": 31, "reset_at_hkt": "06-28 02:50" },
    "secondary_7d": { "used_percent": 7, "reset_at_hkt": "07-03 00:00" },
    "active_limits": [...]
  }
}
```

#### 3.3.2 `public/minimax-api-status.json`

```json
{
  "_generatedAt": "2026-06-28T...",  // SAME as usage-quota.json (unified cron)
  "_source": "unified-cron",
  "plan": "plus",      // NEW — HARDCODED
  "allModels": [
    {
      "model": "general",
      "remainingPct": 99,
      "weeklyRemainingPct": 100,
      "resetTime": 1751091600000
    }
    // ❌ video model 已刪走 (UI + JSON 都不再寫入)
  ],
  "raw": { ... }
}
```

#### 3.3.3 `public/copilot-summary.json`

```json
{
  "_generatedAt": "2026-06-28T...",  // SAME
  "_source": "unified-cron",
  "subscription": "pro",  // NEW — HARDCODED
  "analysis": {
    "byMonth": { ... }
  }
}
```

#### 3.3.4 `public/quota-history.json` (v2 entries 擴展)

```json
{
  "_version": 2,
  "_updatedAt": "2026-06-28T...",
  "_totalEntries": 395,
  "entries": [
    {
      "_schema": "v2",
      "windowKey": "2026-06-28_00-55",
      "date": "2026-06-28",
      "window": "00-55",
      "windowStart": "...",
      "windowEnd": "...",
      "capturedAt": "2026-06-28T...",  // SAME as _generatedAt above
      "general": {
        "usedPct": 1,
        "weeklyPct": 0,
        // ...
      },
      // ❌ video 已刪走 (UI)，history 都唔再寫入
      "codex": {           // NEW
        "primary_5h_pct": 35,
        "secondary_7d_pct": 36,
        "plan": "plus"
      },
      "claude": {          // NEW
        "primary_5h_pct": 31,
        "secondary_7d_pct": 7,
        "subscription": "pro"
      }
    }
  ]
}
```

#### 3.3.5 `public/usage-history.json` (V1 專用)

✅ 維持現狀 (Codex + Claude only)，unified cron 繼續 update

OR
❌ 廢除，統一用 quota-history.json

**推薦**：保留 usage-history.json 作為短期 backward compat，1 個月後再考慮 merge。

### 3.4 Unified Cron Design

#### 3.4.1 移除 (V1 既有)

- ❌ `~/Library/LaunchAgents/ai.openclaw.usage-cron.plist` — unload + 刪除
- ❌ `~/Library/LaunchAgents/ai.openclaw.minimax-cron.plist` — unload + 刪除
- ❌ `scripts/usage-cron.sh`
- ❌ `scripts/minimax-cron.sh`

#### 3.4.2 新增 (V2)

- ✅ `~/Library/LaunchAgents/ai.openclaw.quota-cron.plist` — single plist
- ✅ `scripts/quota-cron.sh` — single script

#### 3.4.3 quota-cron.sh Flow

```bash
#!/bin/bash
# Unified quota cron — refresh Codex/Claude/MiniMax/Copilot together
# with a single _generatedAt timestamp.
set -u
WORKDIR="/Users/zachli/.openclaw/workspace/virtual-office"
export PATH="/opt/homebrew/opt/node/bin:/opt/homebrew/bin:$PATH"
LOG="/Users/zachli/.openclaw/workspace/logs/quota-cron.log"
NOW_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "[$(date)] Unified quota cron started" >> "$LOG"

cd "$WORKDIR"

# Step 1/5: Refresh Codex + Claude → usage-quota.json
echo "[$(date)] step 1/5: Codex + Claude" >> "$LOG"
python3 scripts/fetch-usage.py --set-timestamp "$NOW_ISO" >> "$LOG" 2>&1 || echo "step 1 failed (continuing)" >> "$LOG"

# Step 2/5: Refresh MiniMax → minimax-api-status.json
echo "[$(date)] step 2/5: MiniMax" >> "$LOG"
bash scripts/refresh-data.sh minimax --set-timestamp "$NOW_ISO" >> "$LOG" 2>&1 || echo "step 2 failed (continuing)" >> "$LOG"

# Step 3/5: Refresh Copilot summary
echo "[$(date)] step 3/5: Copilot" >> "$LOG"
bash scripts/refresh-data.sh copilot --set-timestamp "$NOW_ISO" >> "$LOG" 2>&1 || echo "step 3 failed (continuing)" >> "$LOG"

# Step 4/5: Update history files (quota-history.json + usage-history.json)
echo "[$(date)] step 4/5: history" >> "$LOG"
bash scripts/update-quota-history.sh --set-timestamp "$NOW_ISO" >> "$LOG" 2>&1 || echo "step 4 failed (continuing)" >> "$LOG"

# Step 5/5: Commit + push
echo "[$(date)] step 5/5: commit + push" >> "$LOG"
git add public/*.json scripts/usage-quota.json 2>/dev/null || true
git commit -m "chore: refresh AI quota $NOW_ISO" >> "$LOG" 2>&1 || echo "nothing to commit" >> "$LOG"
git push origin main >> "$LOG" 2>&1 || echo "push failed (continuing)" >> "$LOG"

echo "[$(date)] Done!" >> "$LOG"
```

#### 3.4.4 Plist Schedule

跟 V1 一樣：hours 4/9/14/19/23, minute 55 (5x/day)

```xml
<key>StartCalendarInterval</key>
<array>
    <dict><key>Hour</key><integer>23</integer><key>Minute</key><integer>55</integer></dict>
    <dict><key>Hour</key><integer>4</integer><key>Minute</key><integer>55</integer></dict>
    <dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>55</integer></dict>
    <dict><key>Hour</key><integer>14</key><integer>Minute</key><integer>55</integer></dict>
    <dict><key>Hour</key><integer>19</integer><key>Minute</key><integer>55</integer></dict>
</array>
```

#### 3.4.5 Push Behavior

V1 spec §10 話 usage-cron 唔 push (依賴 memory-sync plist)，minimax-cron 自動 push。

V2 統一 push，原因：
- 簡化 (single cron, single behavior)
- Pages 需要即時見到 Codex/Claude/MiniMax/Copilot 嘅 unified timestamp
- memory-sync plist 目前 NOT loaded (per workspace MEMORY.md)
- 5x/day push 唔算太密

### 3.5 fetch-usage.py 改動

#### 3.5.1 Plan defaults hardcode

```python
# Per Planning/20260628_HOMEPAGE_DASHBOARD_REDESIGN_V2.md §3.5.1
# Claude OAuth usage API does not expose plan type. Hardcode based on
# known account (Zach 2026-06-28 confirmed Claude = PRO, MiniMax = PLUS).
KNOWN_PLANS = {
    "codex": "plus",
    "claude": "pro",
    "minimax": "plus",
    "copilot": "pro",
}

# Codex
def extract_codex(raw):
    if raw.get("_error"):
        return {"available": False, "_error": raw.get("_error")}
    return {
        "available": True,
        "plan": raw.get("plan_type") or KNOWN_PLANS["codex"],
        # ... rest unchanged
    }

# Claude — change subscription fallback from "n/a" to KNOWN_PLANS["claude"]
def extract_claude(raw):
    if raw.get("_error"):
        return {"available": False, "subscription": KNOWN_PLANS["claude"], "_error": raw.get("_error")}
    subscription = (
        raw.get("subscriptionType")
        or raw.get("plan_type")
        or raw.get("subscription_info", {}).get("plan")
        or KNOWN_PLANS["claude"]  # was "n/a"
    )
    # ...

# MiniMax — add plan field to output (currently not exposed)
# Update refresh-data.sh minimax to write "plan": KNOWN_PLANS["minimax"]
```

#### 3.5.2 Timestamp injection

```python
# Optional CLI arg --set-timestamp overrides now()
import argparse
parser = argparse.ArgumentParser()
parser.add_argument("--set-timestamp", help="Override _generatedAt (ISO 8601 UTC)")
args = parser.parse_args()

GENERATED_AT = args.set_timestamp or datetime.utcnow().isoformat() + "Z"
```

### 3.6 refresh-data.sh 改動

#### 3.6.1 MiniMax — 刪走 Video, 加入 plan

- `scripts/refresh-data.sh minimax`：
  - Filter out `video` model from `allModels` array
  - 寫入 `plan: "plus"` (hardcoded)
  - 接受 `--set-timestamp` CLI arg

#### 3.6.2 Copilot — 加入 subscription

- `scripts/refresh-data.sh copilot`：
  - 寫入 `subscription: "pro"` (hardcoded)
  - 接受 `--set-timestamp` CLI arg

### 3.7 Dashboard JS 改動

#### 3.7.1 刪走即時狀態 section

從 `tab-history` panel HTML 移除 `aitools-section` 整個 block。

#### 3.7.2 刪走 AI Coding render functions

`aitoolsRenderCodex`, `aitoolsRenderClaude`, `aitoolsRenderFooter`, `aitoolsLoad` 等 — 全部移除 (唔再需要)。

#### 3.7.3 v2 table 加入 Codex/Claude columns

```js
// In histPager render function, v2 schema path
const v2Cols = [
    { key: 'date', label: '日期' },
    { key: 'window', label: '時段' },
    { key: 'general_usedPct', label: '[5hr] MiniMax %' },
    { key: 'general_weeklyPct', label: '[週] MiniMax %' },
    { key: 'codex_5h', label: '[5hr] Codex %' },
    { key: 'codex_7d', label: '[週] Codex %' },
    { key: 'claude_5h', label: '[5hr] Claude %' },
    { key: 'claude_7d', label: '[週] Claude %' },
];
```

#### 3.7.4 MiniMax tab — 刪走 Video model render

`tokenPager` JS — filter out video from display.

### 3.8 Homepage JS 改動

#### 3.8.1 單張 card table

完全 replace `loadDetailUsage()` 用 new `loadQuotaTable()` 邏輯：

```js
async function loadQuotaTable() {
    const [usage, minimax, copilot] = await Promise.allSettled([
        fetchJson('/public/usage-quota.json'),
        fetchJson('/public/minimax-api-status.json'),
        fetchJson('/public/copilot-summary.json')
    ]);

    const codex = usage.status === 'fulfilled' ? usage.value.codex : null;
    const claude = usage.status === 'fulfilled' ? usage.value.claude : null;
    const mm = minimax.status === 'fulfilled' ? minimax.value : null;
    const cp = copilot.status === 'fulfilled' ? copilot.value : null;

    const rows = [
        buildRow('Codex', '🤖', codex, 'plus'),
        buildRow('Claude', '🤖', claude, 'pro'),
        buildRow('MiniMax', '🤖', mm, 'plus'),
        buildRow('Copilot', '🤖', cp, 'pro', /* isMonthly */ true),
    ];

    document.getElementById('quota-table-body').innerHTML = rows.join('');
}

function buildRow(name, icon, data, planDefault, isMonthly = false) {
    const plan = data?.plan || data?.subscription || planDefault;
    const pct5h = isMonthly ? `本月 ${data?.used_percent || 0}% (${data?.total || 0}/300)` : (data?.primary_5h?.used_percent ?? '—') + '%';
    const pct7d = isMonthly ? '—' : (data?.secondary_7d?.used_percent ?? '—') + '%';
    const reset5h = isMonthly ? `Reset ${data?.nextReset || '—'}` : (data?.primary_5h?.reset_at_hkt || '—');
    const reset7d = isMonthly ? '—' : (data?.secondary_7d?.reset_at_hkt || '—');
    // ... render HTML
}
```

## 4. 實作 Plan (Phases)

### Phase 1: Planning (✅ 呢個 doc)

### Phase 2: Implementation (MacD)

順序：

1. **2.1** `scripts/fetch-usage.py`：
   - 加 `--set-timestamp` CLI arg
   - 加 `KNOWN_PLANS` dict
   - Codex plan fallback → `KNOWN_PLANS["codex"]`
   - Claude subscription fallback → `KNOWN_PLANS["claude"]`

2. **2.2** `scripts/refresh-data.sh`：
   - 加 `--set-timestamp` CLI arg
   - minimax path：filter video + 加 `plan`
   - copilot path：加 `subscription`

3. **2.3** `scripts/update-quota-history.sh`：
   - 加 `--set-timestamp` CLI arg
   - v2 entry schema：加 `codex` / `claude` sub-objects (per §3.3.4)

4. **2.4** `scripts/quota-cron.sh`：
   - 新建，per §3.4.3

5. **2.5** `~/Library/LaunchAgents/ai.openclaw.quota-cron.plist`：
   - 新建

6. **2.6** Unload 舊 plists：
   - `launchctl unload ~/Library/LaunchAgents/ai.openclaw.usage-cron.plist`
   - `launchctl unload ~/Library/LaunchAgents/ai.openclaw.minimax-cron.plist`

7. **2.7** `index.html`：
   - 移除 V1 detail cards
   - 加 quota table (single card, 6 欄)

8. **2.8** `dashboard.html`：
   - 移除 V1 aitools section
   - 加 Codex/Claude columns 落 v2 history table
   - 移除 Video model 從 MiniMax tab

9. **2.9** Test locally (Playwright):
   - Homepage: 6 欄 table，4 row，1 card
   - Dashboard: history tab pure history，v2 有 8 column
   - MiniMax tab: 冇 Video

10. **2.10** Manual verify cron flow:
    - Run `bash scripts/quota-cron.sh` once
    - Verify all JSON `_generatedAt` 同步
    - Verify no Video in minimax JSON

### Phase 3: Codex Review

- 寫 `/tmp/codex_redesign_v2_review_prompt.txt`
- Codex verdict + fix loop

### Phase 4: Hermes Bulk Testing

- 更新 `/tmp/hermes_redesign_bulk_test_msg.md` (V2 scope)
- Wait for Hermes (or fallback to MacD self-test 50/50 + live verify 8/8)

### Phase 5: Merge + Push + Notify

- Merge to main
- Push origin
- 通知 Zach: `https://ai-lish.github.io/virtual-office/` 可 check

## 5. Risk Assessment

| Risk | Mitigation |
|---|---|
| `KNOWN_PLANS` hardcode 過時 | 加 comment + future task: 從 settings.json 讀 |
| Copilot monthly reset 計錯 | 用 `new Date(year, month+1, 1)` 計算下月 1 號 |
| Video model history data 唔見咗 | History entry 唔寫 video field，但現有 data 保留 |
| Usage-cron spec §10 violation (no-push) | V2 spec 改為 push，documented in §3.4.5 |
| Live site 舊 code 殘留 (cached JS) | GitHub Pages 自動 invalidate CDN |
| Hermes 不在線 | MacD self-test fallback (50+ tests) |
| Plan type 將來改變 (Zach 升級 plan) | `KNOWN_PLANS` 改 1 行，commit + push |

## 6. Out of Scope

- ❌ MiniMax Video model — 完全刪走 (保留 history JSON 入面 data 但 UI 不顯示)
- ❌ Copilot daily/weekly breakdown — 只有 monthly (符合 5h/7d 主題)
- ❌ Agent usage 以外嘅 widget (e.g., cost tracking) — 唔做
- ❌ Per-token 用量細項 — 唔做
- ❌ Settings page 畀 user 改 plan — KNOWN_PLANS hardcode 喺 code
- ❌ 5h/7d 以外嘅 window (e.g., Codex monthly) — 唔做

## 7. Ready Review Checklist (Codex)

- [ ] Homepage 1 張 card，6 欄 table-style，4 row
- [ ] Plan badge 顯示 (PLUS / PRO)
- [ ] Copilot row 用 colspan merge (1 行)
- [ ] MiniMax 冇 Video model
- [ ] Dashboard 冇 即時狀態 section (3 tabs 全部純歷史)
- [ ] Tab 1 v2 history table 有 8 column (4 舊 + 4 新 Codex/Claude)
- [ ] Tab 3 MiniMax 冇 Video + 冇即時狀態
- [ ] Unified cron plist 安裝 + 舊 unload
- [ ] quota-cron.sh timestamp 同步所有 JSON
- [ ] KNOWN_PLANS hardcode 喺 fetch-usage.py
- [ ] Live site 通過 Playwright test
- [ ] MacD self-test ≥ 50 pass

## 8. Open Questions (Zach 2026-06-28 confirmed)

| # | Question | Resolution |
|---|---|---|
| 1 | Video 完全由 JSON 刪走 vs 保留 history data | ✅ **完全刪走** (history entry 都唔寫 video field) |
| 2 | Copilot colspan merge row vs 跟其他 3 row 一樣 | ✅ **colspan merge** (5h column 顯示「本月 X% (X/300)」) |
| 3 | `usage-history.json` 保留 vs 廢除 | ✅ **保留 backward compat**，1 個月後再考慮 merge |
| 4 | MiniMax Tab 需唔需要即時狀態 | ✅ **唔需要** (per Zach 2026-06-28 01:03)，純歷史 |

## 9. Sources

## 9. Sources

- V1 planning: `~/.openclaw/workspace/PLANNING/20260627_REDESIGN_V1.md`
- V1 commit: `c5a866a`
- Codex V1 verdict: `/tmp/codex_redesign_review_verdict.md`
- MacD V1 bulk test: `/tmp/bulk_test.js` (50/50), `/tmp/redesign_test.js` (34/34), `/tmp/live_site_test.js` (8/8)
- Hermes V1 handoff: `/tmp/hermes_redesign_bulk_test_msg.md` (需更新為 V2 scope)
- MEMORY durable notes: `~/.openclaw/workspace/MEMORY.md` § "Virtual-Office Cron Architecture"