# Copilot Usage Dashboard — Design Specification

## 1. Concept & Vision

**What it does:** Displays GitHub Copilot quota, usage trends, and smart recommendations in the Virtual Office dashboard — giving developers an at-a-glance sense of how much Copilot budget they have left, what they're spending it on, and what smart choices they could make.

**What it feels like:** A premium developer tool panel — precise, data-rich, and visually calm. Think Linear.app meets Vercel's analytics dashboard. Information density is high but never overwhelming. Numbers are the heroes; decoration is minimal. The panel should feel like a trusted instrument, not a flashy widget.

**Design philosophy:**
- **Data-first**: every pixel serves information
- **Calm under pressure**: even when quota is critical, the UI stays composed (no panic red — just honest amber/red gradients)
- **Mobile-native**: designed for a vertical phone scroll, usable on a widescreen
- **Accessible**: ARIA roles, keyboard navigation, sufficient contrast throughout

---

## 2. Design Language

### Color Palette

#### Dark Theme (default — matches existing token-dashboard.css)
| Token | Hex | Usage |
|---|---|---|
| `--copilot-bg` | `#13151A` | Panel background |
| `--copilot-surface` | `#1C1F26` | Card / section background |
| `--copilot-surface-raised` | `#252830` | Hover/elevated surfaces |
| `--copilot-border` | `#333642` | Dividers, card borders |
| `--copilot-text` | `#E8EAF0` | Primary text |
| `--copilot-text-muted` | `#8B8FA8` | Labels, secondary text |
| `--copilot-primary` | `#6366F1` | Indigo — primary accent, links |
| `--copilot-accent` | `#818CF8` | Lighter indigo for gradients |
| `--copilot-success` | `#34D399` | Emerald — comfortable quota |
| `--copilot-warning` | `#FBBF24` | Amber — >80% usage |
| `--copilot-danger` | `#F87171` | Red — >95% usage |
| `--copilot-chart-1` | `#6366F1` | Chart series 1 (Indigo) |
| `--copilot-chart-2` | `#8B5CF6` | Chart series 2 (Violet) |
| `--copilot-chart-3` | `#EC4899` | Chart series 3 (Pink) |
| `--copilot-chart-4` | `#F59E0B` | Chart series 4 (Amber) |

#### Light Theme (via `.theme-light` on root element)
| Token | Hex |
|---|---|
| `--copilot-bg` | `#F8F9FC` |
| `--copilot-surface` | `#FFFFFF` |
| `--copilot-surface-raised` | `#F0F1F5` |
| `--copilot-border` | `#E2E4EA` |
| `--copilot-text` | `#1A1D2E` |
| `--copilot-text-muted` | `#6B7280` |
| `--copilot-primary` | `#4F46E5` |
| `--copilot-accent` | `#6366F1` |
| `--copilot-success` | `#059669` |
| `--copilot-warning` | `#D97706` |
| `--copilot-danger` | `#DC2626` |

### Typography
- **Font**: `Inter` (Google Fonts) — optimized for UI readability at small sizes
- **Fallback**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Scale**:
  - Panel title: 22px / 700
  - Section heading: 16px / 600
  - KPI value: 32px / 800 (tabular-nums)
  - KPI label: 12px / 500 (uppercase, letter-spacing 0.08em)
  - Body / chart labels: 13px / 400
  - Micro labels: 11px / 500

### Spacing System
- Base unit: 4px
- Card padding: 20px (5 units)
- Section gap: 24px (6 units)
- Grid gap: 16px (4 units)

### Motion Philosophy
- All transitions: `200ms ease-out` (snappy, not floaty)
- Number counters animate on first load (500ms, ease-out)
- Chart bars grow upward on render (staggered 30ms per bar)
- Circular progress arcs draw in on load (800ms, cubic-bezier 0.4, 0, 0.2, 1)
- Warning badges pulse once on level change (keyframe: scale 1→1.05→1, 300ms)

### Icon System
- Lucide icons via CDN (consistent 20px stroke icons)
- Inline SVG for the circular gauge and chart paths (no external deps for core visuals)

---

## 3. Layout & Structure

### Page Structure

```
┌─────────────────────────────────────────────────────────┐
│ [Header]  🤖 Copilot 使用面板          [⚙️] [↻ refresh]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────┐  ┌──────────────────────────┐ │
│  │  QUOTA GAUGE         │  │  RECOMMENDATION CARD      │ │
│  │  (circular ring)     │  │  🟢 / 🟡 / 🔴 status      │ │
│  │  XX% — X / Y tokens  │  │  Smart model switch tip   │ │
│  │  Days left: N        │  │  + action button          │ │
│  └─────────────────────┘  └──────────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────────┐│
│  │  7-DAY TREND CHART (area chart, SVG)                ││
│  │  Filled line, gradient below, hover dots            ││
│  └──────────────────────────────────────────────────────┘│
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────────┐│
│  │  MODEL DISTRIBUTION   │  │  FEATURE DISTRIBUTION     ││
│  │  (horizontal bars)    │  │  (donut + legend)         ││
│  └──────────────────────┘  └──────────────────────────┘│
│                                                         │
│  ┌──────────────────────────────────────────────────────┐│
│  │  USAGE SUMMARY (3-column stat row)                  ││
│  │  Today   |   This Week   |   Total                  ││
│  └──────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Responsive Strategy
- **≥1024px**: 2-column grid for gauge+recommendation, 2-col for distributions
- **≥640px**: Single column, full-width cards
- **<640px**: Compact KPI row (2 per row), horizontally scrollable trend chart

---

## 4. Features & Interactions

### A. Circular Quota Gauge
- SVG ring, 160px diameter on desktop / 120px on mobile
- Arc sweeps clockwise from top (12 o'clock), 0–100% fills
- Color transitions: `success` (0–79%) → `warning` (80–94%) → `danger` (95–100%)
- Center shows: large percentage number + "of X tokens" below
- Below ring: `X remaining · N days left · resets every 30 days`
- **Animation**: ring draws in on load; number counts up from 0
- **ARIA**: `role="meter"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`

### B. Smart Recommendation Card
- Border-left accent stripe in status color (success/warning/danger)
- Shows: emoji + status label + prose message
- Suggested model badge (pill in `--copilot-primary`)
- Optional action: "Switch to {model}" button (links to settings or `window.copilotAPI.setModel()` stub)
- Hover: slight elevation (box-shadow lift)

### C. 7-Day Trend Chart (Area Chart)
- Pure SVG, no external library
- X axis: dates (last 7 days, abbreviated: "Mon 23")
- Y axis: token count (auto-scaled, 5 gridlines)
- Area fill: gradient from `--copilot-chart-1` at 40% opacity → transparent
- Line stroke: `--copilot-chart-1`, 2px
- Hover interaction: vertical crosshair line + floating tooltip showing date + count
- Tooltip appears on mouseover/touch on SVG overlay
- Accessible: `<title>` and `<desc>` in SVG; data exposed in `<table>` (visually hidden, for screen readers)

### D. Model Distribution (Horizontal Bar Chart)
- Each model gets one row: model name | bar | percentage | token count
- Bars are color-coded from the chart palette
- Sorted by token count descending
- Max bar width = longest bar in set
- Hover: tooltip with full model name + exact counts
- If >5 models, collapse to top 5 with "Show N more" expander

### E. Feature Distribution (Donut Chart)
- SVG donut (outer radius 70, inner radius 45)
- Segments: completions, prompts, Chat, etc.
- Center of donut: total "X calls" or "X tokens"
- Legend: colored dots + label + count, positioned below or right
- Hover on segment: segment lifts slightly (scale 1.03) + tooltip

### F. Usage Summary Row
- 3 cards in a row: **Today** | **This Week** | **All Time**
- Each: count + cost in USD (where available)
- Subtle separator between cards
- Values animate count-up on first render

### G. Warning Indicators
- >80% used: yellow banner/inset at top of gauge section
- >95% used: red banner + "⚠️ Quota almost exhausted" inline notice
- "normal" level: no banner (clean state)

### H. Refresh
- Manual refresh button in header (↻ icon)
- Auto-refresh every 5 minutes if tab is visible
- Loading state: skeleton pulse animation on cards
- Error state: inline error with retry button

### I. n8n Integration Stub
- "Automate" button → opens `http://localhost:5678` (n8n) in new tab
- Present as a small utility link at the bottom of the panel

---

## 5. Component Inventory

### `CopilotGauge` (SVG circular progress)
- **Default**: indigo ring at 0%, muted center text
- **Active**: ring fills in status color, number counts up
- **Warning (>80%)**: amber ring with yellow inner glow
- **Danger (>95%)**: red ring with pulsing outer glow
- **Loading**: ring invisible, center shows animated skeleton

### `RecommendationCard`
- **Comfortable** (green): success border, green emoji, "配額充裕"
- **Moderate** (yellow): warning border, amber glow, "注意用量"
- **Critical** (red): danger border, red glow, "盡快切換模型"
- **Empty/zero usage**: neutral, prompts to start using

### `TrendChart` (SVG area)
- **Populated**: filled area + line + hover dots
- **Empty (0 values)**: flat line at bottom, "No usage this week" message
- **Loading**: gray animated shimmer bar placeholders

### `ModelBar` (horizontal bar row)
- **Active**: colored bar proportional to max
- **Hover**: row highlights, tooltip appears
- **Zero**: row shows "—" with muted text

### `DonutChart` (SVG)
- **Active**: colored segments with hover lift
- **Empty**: single grey ring with "No data"
- **Hover**: segment scales + tooltip

### `StatCard` (summary cell)
- **Active**: count + label + sub-label
- **Loading**: skeleton pulse
- **Zero**: shows "0" with muted styling

### `WarningBanner`
- **Warning level**: amber background, amber text, icon
- **Danger level**: red background, white text, icon + pulse animation

---

## 6. Technical Approach

### File Structure
```
virtual-office/
  docs/
    DESIGN-SPEC.md          ← this file
  public/
    js/
      copilot-panel.js      ← main Copilot panel controller (new)
    css/
      copilot-panel.css     ← Copilot panel styles (new)
    pages/
      copilot-usage.html    ← updated with new panel
```

### API Integration
- **Quota**: `GET /api/copilot/quota` → `window.CopilotAPI.getQuota()`
- **Analysis**: `GET /api/copilot/analysis` → `window.CopilotAPI.getAnalysis()`
- Both wrapped in a `CopilotAPI` class with caching (5-min TTL)

### CSS Architecture
- All CSS custom properties scoped under `.copilot-panel` (no leakage)
- Single `.theme-light` modifier on root element
- No external CSS dependencies (no Tailwind, no Bootstrap)
- CSS Grid for layout, Flexbox for card internals

### JS Architecture
- `CopilotPanel` class — orchestrates fetch, state, render
- `CopilotGauge` — SVG ring renderer
- `CopilotTrendChart` — SVG area chart renderer
- `CopilotDonut` — SVG donut renderer
- `CopilotAPI` — fetch + cache layer
- All render methods accept a DOM element + data payload
- ARIA attributes set by JS on render

### Accessibility Checklist
- [x] All charts have `<title>`, `<desc>`, and a hidden data table
- [x] Color is never the only differentiator (patterns + labels always present)
- [x] Focus order follows visual order
- [x] Tooltips dismissible with Escape key
- [x] Minimum contrast ratio 4.5:1 for all text
- [x] `prefers-reduced-motion` media query respected for animations
- [x] Touch targets ≥ 44×44px on mobile

### n8n Integration
- "⚡ Automate" link at panel footer → opens n8n at `localhost:5678`
- Future: webhook trigger button (stub: `CopilotAPI.triggerWorkflow()` → `POST /api/copilot/notify`)
