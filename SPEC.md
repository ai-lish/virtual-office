# Virtual Office Redesign — SPEC

## Audit Summary

### Current Problems
1. **~2200 lines** of spaghetti HTML/CSS/JS in one file
2. **Dual nav**: sidebar (projects, timeline, schedule, tokens) + hamburger menu — overlapping
3. **Homepage is cluttered**: hero text + quota bars + Copilot dashboard + MiniMax dashboard + Agent workflow + Skills list + floating secretary avatar
4. **Dead code**: SVG comparison system, PDF library, quality reports, permission manager, custom themes, backup system — all unused
5. **Data confusion**: MiniMax API field `current_interval_usage_count` is actually REMAINING, but code treats it inconsistently
6. **Broken features**: `/api/copilot/quota` and `/api/minimax/quota` endpoints don't exist on GitHub Pages — only static JSON works

### Data Sources (verified)
| Source | File | Fields |
|--------|------|--------|
| Copilot | `public/copilot-data.json` | `quota.used`, `quota.total`, `quota.remaining` |
| MiniMax | `public/minimax-api-status.json` | `raw.model_remains[]` — `model_name`, `current_interval_total_count`, `current_interval_usage_count` (⚠️ this is REMAINING) |

### MiniMax Field Mapping
- `MiniMax-M*` → Text quota (total: 4500, usage_count = remaining)
- `speech-hd` → Speech quota (total: 4000)
- `image-01` → Image quota (total: 50)

---

## New Design

### Navigation
- **No sidebar**. Single top bar with: logo + "Dashboard →" link
- **No hamburger menu** on desktop
- Mobile: simple top bar, content stacks vertically

### Page Structure
- **index.html** — Homepage with 4 quota bars + project list
- **dashboard.html** — Detailed dashboard (keep existing, link from home)

### Homepage Layout (top → bottom)
1. **Header bar**: 🏢 虛擬辦公室 + last update time + Dashboard link
2. **Quota Grid** (2×2): Copilot, M* Text, Speech, Image — always visible, large
3. **Project List**: collapsible cards, sorted by activity

### Quota Bar Design
Each bar shows:
- Icon + label
- **Remaining / Total** (clear language)
- Progress bar (fills as quota is USED, so remaining gets smaller)
- Percentage remaining
- Color: green (>50%), yellow (20-50%), red (<20%)

### Data Flow (simplified)
```
copilot-data.json → { quota.used, quota.total }
minimax-api-status.json → { raw.model_remains[] }
  ↓ parse
  MiniMax-M*: remaining = usage_count, used = total - usage_count
  speech-hd: remaining = usage_count, used = total - usage_count  
  image-01: remaining = usage_count, used = total - usage_count
```

### What's Removed
- Floating secretary avatar
- Agent workflow section
- Skills section
- SVG comparison system
- PDF library
- Permission manager
- Custom themes
- Backup system
- Notification system
- Working bubble
- All dead `/api/` calls
