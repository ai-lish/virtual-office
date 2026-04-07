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

## URL
https://ai-lish.github.io/virtual-office/memory/
