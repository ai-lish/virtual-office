# Token Dashboard — Implementation Plan

## Summary of changes already applied
- Added accessibility labels to interactive elements for screen readers and keyboard navigation.
- Generated `summary-token-log.json` to consolidate token usage summaries.
- Added `token-worker.js` (Web Worker) scaffold to offload token-splitting/generation tasks.
- Implemented a retry UI for failed token processing operations (tooltip + retry button + accessibility hints).

## Remaining work — detailed step-by-step plan
1) Finalize Web Worker integration
   - Move heavy token-splitting and file-generation logic into `token-worker.js`.
   - Define a clear message protocol between main thread and worker (actions: splitDaily, generateFile, status, cancel, retry, error).
   - Ensure worker handles backpressure: queue tasks, limit concurrency, and respond with progress updates.
   - Error payloads should include: errorCode, message, rawDataReference (for later download), and optional rawLink when available.
   - Estimated time: 4 hours
   - Files affected: `public/js/token-worker.js`, `src/utils/token-worker.ts` (or `.js` depending on codebase).

2) Integrate worker into token-api.js
   - Add a worker manager module that exposes: startTask(action, payload), onProgress(id, cb), cancelTask(id), getResult(id).
   - Replace synchronous token-splitting/generation calls with calls to the worker manager.
   - Add fallbacks: if Web Worker not available, run a throttled in-thread implementation and surface a banner warning.
   - Estimated time: 3 hours
   - Files affected: `src/api/token-api.js`, `src/api/worker-manager.js`.

3) Integrate worker into token-dashboard.js
   - Update the dashboard to use the worker manager for long-running tasks.
   - Show per-task progress bars with accessible labels and a cancel/retry button.
   - When a task fails, show an error box containing the `raw-link` (download link for raw payload) and a Copy button.
   - Ensure keyboard focus is managed: when an error appears, focus moves to the error box; on close, focus returns to the triggering control.
   - Estimated time: 4 hours
   - Files affected: `src/components/token-dashboard.js`, `public/styles/token-dashboard.css`.

4) Focus styles and accessibility polish
   - Add visible focus styles for all controls (high contrast, not just outline: 3px solid accent with subtle shadow).
   - Ensure focus-visible semantics: use :focus-visible and avoid relying solely on mouse hover styles.
   - Test keyboard-only flows: start task, cancel, retry, download raw link, navigate to token detail.
   - Estimated time: 2 hours
   - Files affected: `public/styles/*.css`, `src/components/*.js`.

5) Raw-link in error box & download fallback
   - When worker returns an error with rawDataReference, generate a signed one-time raw-link (or local blob URL) and display it in the error box.
   - Provide a Copy and Download button. The Copy button should copy the URL; Download should stream the raw payload.
   - If CI artifacts are used (see below), include the artifact path and instructions.
   - Estimated time: 1.5 hours
   - Files affected: `src/components/error-box.js`, `src/api/artifact-linker.js`.

6) Generate daily split files (background process)
   - Implement worker task `splitDaily` that writes per-day token CSV/JSON files locally (or to configured storage path).
   - Add a manifest index (e.g., `daily-splits/YYYY-MM-DD.json`) listing available files and checksums.
   - Add a UI control to trigger regeneration for a given date range.
   - Consider storage quota and retention policy: keep last 90 days by default.
   - Estimated time: 3.5 hours
   - Files affected: `server/scripts/generate-daily-splits.js`, `token-worker.js`.

7) GitHub Actions Playwright E2E workflow
   - Add a Playwright E2E workflow that runs against the deployed preview or a test environment.
   - Workflow should: install deps, build, start a test server (or use preview), run Playwright tests, and upload artifacts (screenshots, trace, raw failed payloads) when failures occur.
   - Name: `.github/workflows/playwright-e2e.yml`.
   - Artifacts location: GitHub Actions artifacts -> `e2e/{run-id}/screenshots`, `e2e/{run-id}/traces`, `e2e/{run-id}/raw-payloads`.
   - Estimated time: 4 hours (initial), +2 hours to stabilize tests.
   - Files affected: `.github/workflows/playwright-e2e.yml`, `tests/e2e/token-dashboard.spec.ts`.

8) CI artifact handling and download links
   - Configure Playwright to attach raw failing payloads (JSON) and make them available as artifacts.
   - Add an internal mapping service (artifact-linker) that, given run id and artifact path, produces a download URL for maintainers.
   - Add a note in the error UI that points to CI artifact location when the failure originates from CI-run tasks.
   - Estimated time: 2 hours
   - Files affected: `scripts/artifact-linker.js`, CI workflow files.

9) Tests and test data
   - Unit tests for worker message protocol and failure handling (mock worker messages).
   - Integration tests for token-api <-> worker manager interaction (simulate worker timeouts and cancellations).
   - Playwright E2E tests for main user flows (start split, progress, cancel, retry, download raw link).
   - Estimated time: 6 hours (writing + initial runs).
   - Files affected: `tests/unit/`, `tests/integration/`, `tests/e2e/`.


## PR checklist
- Files changed (typical)
  - public/js/token-worker.js
  - src/api/worker-manager.js
  - src/api/token-api.js
  - src/components/token-dashboard.js
  - src/components/error-box.js
  - public/styles/token-dashboard.css
  - server/scripts/generate-daily-splits.js
  - tests/e2e/token-dashboard.spec.ts
  - .github/workflows/playwright-e2e.yml

- Tests to run
  - Unit: `npm run test:unit` (worker message protocol, token-api mocks)
  - Integration: `npm run test:integration` (api <-> worker interactions)
  - E2E: `npm run test:e2e` or rely on GitHub Actions Playwright job

- Smoke-test checklist (manual after deploy)
  1. Open Token Dashboard
  2. Start a daily-split generation for a small date range
  3. Verify progress bar updates and is accessible via keyboard (Tab to controls, Enter to start)
  4. Cancel a running job — ensure worker cancels and UI shows cancelled state
  5. Force an error (use a test toggle) — verify error box appears, focus moves to it, raw-link is present and Copy/Download work
  6. Retry the failed job via Retry button — ensure it restarts correctly
  7. Verify generated daily split files appear in manifest index and downloads are valid
  8. Run Playwright E2E locally against test server and confirm no flaky tests

- Estimated times (sum)
  - Web Worker integration: 4h
  - API integration: 3h
  - Dashboard integration & UI: 4h
  - Focus styles & accessibility: 2h
  - Raw-link & download: 1.5h
  - Daily split generation: 3.5h
  - Playwright E2E workflow: 4h + 2h stabilization
  - CI artifact handling: 2h
  - Tests: 6h
  - Total estimate: ~30 hours (approx. 3.5 working days)

## Person / role mapping
- 師弟 (Dev): implement the code changes (worker, API, dashboard, tests)
- T仔 (Tester): author and run Playwright E2E tests; validate CI artifacts and run smoke tests
- 書記 (Secretary — me): produce this implementation plan, maintain the doc, track PR status and collect test results


## Changelog (recent commits)
Top 5 git commits (from repository):
- d89cbbc chore(secrets): move microsoft-credentials.json to ~/.openclaw/secrets and remove from repo
- ce7139f Auto-backup: 2026-03-26 23:03
- 8c410fb Update .gitignore: exclude CHANNELS.md and thank_you_card images (private)
- f80a8bb chore: auto-backup 2026-03-25 23:05
- dab9fb0 自動備份 2026-03-24 23:04

Recent PRs / commits to reference:
- (No PR metadata available locally) Use the git history above for commit references. If you want direct PR links, run `gh pr list --repo owner/repo` or provide remote repo URL and I can list PRs.


---
Document saved to: /Users/zachli/.openclaw/workspace/virtual-office/docs/implementation-plan.md
