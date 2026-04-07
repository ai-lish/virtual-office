# Memory System Page

A dashboard page for the Virtual Office website that visualizes the OpenClaw memory system.

## What it shows
1. **Stats Dashboard** — file counts, line counts, last updated dates
2. **Important Files** — collapsible sections showing MEMORY.md, topic files, feedback files
3. **Daily Log Tracker** — last 7 daily logs with color-coded dates
4. **Active Issues / TODOs** — extracted from recent logs and MEMORY.md
5. **Quick Navigation** — links to GitHub source files

## Tech
- Single `index.html` with embedded CSS/JS
- Fetches content from GitHub raw URLs (ai-lish/openclaw-backup)
- Dark/light mode, mobile-friendly, matches Virtual Office style

## Dreaming Integration (2026-04)
Add support for OpenClaw "Dreaming" artifacts: DREAMS.md and phase reports.

Planned changes:
- sync-memory.py now includes:
  - `dreamsDiary`: first ~30 lines of ~/.openclaw/workspace/DREAMS.md (sanitized)
  - `dreamPhaseReports`: last 7 reports from memory/dreaming/{light,deep,REM}
  - `dreamsCount`: number of items in memory/.dreams/ (if exists)
- New dreams.html dashboard with:
  - Dream Diary reader
  - Phase timeline (Light → REM → Deep)
  - Dream stats and urgent alerts
  - Phase reports viewer
- index.html: add a "🌙 Dreaming Status" card with preview and link to dreams.html

Handling missing data:
- If DREAMS.md or dreaming/ directories don't exist, pages show placeholders and mock stats (next dream: 03:00 HKT).
- Urgent keywords (P0, blocker, urgent, critical, emergency) are scanned and surfaced as a red alert banner.

Design
- Match existing dark theme: --bg:#0f0f23, --card:#16213e, --accent:#3498db, --green:#2ecc71, --yellow:#f39c12, --red:#e74c3c
- Mobile-responsive; timeline collapses vertically on small screens.

Testing
1. Run `sync-memory.py` and confirm data.json contains keys: dreamsDiary, dreamPhaseReports, dreamsCount.
2. Open /virtual-office/memory/index.html and check Dreaming Status card (placeholder if no data).
3. Open /virtual-office/memory/dreams.html to verify layout, timeline, and urgent alert behaviour.

Commit message: "feat(dreams): add Dreaming dashboard with 6 new features"

## URL
https://ai-lish.github.io/virtual-office/memory/
