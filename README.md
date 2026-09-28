# Virtual Office — Public Deployment

This repository hosts the public GitHub Pages deployment for Virtual Office. The private operational source, Memory and quota history belong in `math-lish/virtual-office`; this public repository is not the source of raw usage records.

## Current state

- GitHub Pages builds and deploys the safe static overview from the approved site files.
- The public homepage contains a curated index of 23 AI-Lish projects and a separate registry of six GAS / Automation projects.
- `models.json` is a closed-schema summary. At the 2026-09-27 repository reset, the owner reported that `MINIMAX_API_KEY` was not configured and the model snapshot was `unavailable`. The Pages workflow still has a scheduled snapshot-fetch step that can use this secret if configured; that step has not been removed.
- The public page does not include operational quota history, raw billing CSVs, Copilot reports, account data, tokens, or raw provider responses.

## Planned direction

The intended design is to collect provider usage locally from the private source repository, keep `quota-data/` as the primary history source, and use this repository only to deploy explicitly approved sanitized output. The MiniMax key is planned to move out of the public repository's workflow. Those changes are not implemented by this README update.

If quota summaries are published in the future, expose only the provider/window labels needed to read them, usage percentages and capture times. Keep token/request details, per-model Copilot analysis, MiniMax hourly token trends, raw exports and credentials private. Copilot and Gemini web snapshots must be labeled as observations, not native five-hour quotas.

## Deployment checks

The Pages workflow builds and guards its output before deployment. Its `models.json` output must remain schema-limited and contain no raw provider data. Do not add credentials or raw usage records to this public repository.
