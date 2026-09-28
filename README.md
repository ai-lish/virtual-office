# Virtual Office — Public Deployment

This repository hosts the public GitHub Pages deployment for Virtual Office. The private operational source, Memory and quota history belong in `math-lish/virtual-office`; this repository only deploys files that the private workflow has already built and guarded.

## Current state

- GitHub Pages builds and deploys the exact files listed in `publish.allowlist.json`.
- The homepage (`index.html`) contains the current usage cards for ChatGPT, Claude, Gemini, MiniMax and GitHub Copilot, a curated index of 23 AI-Lish projects, and a registry of six GAS / Automation projects.
- `history.html` shows five-hour usage history and analysis: a subscription summary, daily peak usage, usage by hour of day, week-over-week comparison and a filterable record table.
- `providers.json` and `history.json` are closed-schema projections of the private `quota-data/history.json`. They contain only provider/bucket labels, window names (`five_hour`, `seven_day`, `monthly`), integer percentages and hour-rounded capture times.
- This repository holds no provider credentials. Usage is collected on the owner's Mac from the private repository; the former `models.json` MiniMax fetch step and its `MINIMAX_API_KEY` secret are no longer used.
- The public pages do not include reset times, token or request counts, raw billing CSVs, Copilot reports, account data, tokens or raw provider responses.

## Window rules

ChatGPT, Claude, Gemini and MiniMax records follow each provider's own five-hour window, keeping only the latest reading per window, with the seven-day/weekly share when the provider reports one. GitHub Copilot has a monthly quota and is recorded in fixed observation periods (UTC 00:00, 05:00, 10:00, 15:00, 20:00), labelled as observations rather than a five-hour quota. Gemini web and Copilot currently rely on hand-written sanitized snapshots; automatic collection for them is planned.

## Deployment checks

`scripts/build-public-site.mjs` copies only the allowlisted files into `site/`, and `scripts/guard-public-site.mjs` rejects any extra file, credential-shaped text, non-allowlisted external host, and any `providers.json` / `history.json` field outside the closed schema. Do not add credentials or raw usage records to this repository.
