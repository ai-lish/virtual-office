# 20260619_MULTI_PROVIDER_QUOTA_V1

## 1. Background

Zach wants to extend the existing Virtual Office MiniMax quota dashboard to track Claude Pro, ChatGPT, and Gemini quota state as fixed-time snapshots.

Current MiniMax flow:

- `scripts/refresh-data.sh minimax copilot`
- `scripts/update-quota-history.sh`
- `scripts/cron-quota-end.sh`
- `public/minimax-api-status.json`
- `public/quota-history.json`
- cron job `57d74d01-f083-4cf5-85ab-8ce0f2cad7f5`
- schedule: HKT `03:55, 07:55, 12:55, 17:55, 22:55`

This plan is planning-only. Implementation agents must not treat this file as permission to move secrets into the repo or rewrite the existing MiniMax cron.

## 2. Validation Log

Validation was run on 2026-06-19 HKT from Zach's Mac. Tokens and account identifiers were not printed or saved.

### MiniMax

- Auth file: `~/.minimax-api-key`
- Auth status: exists, mode `600`
- Smoke command: `curl -H "Authorization: Bearer <redacted>" https://api.minimax.io/v1/api/openplatform/coding_plan/remains`
- Result: HTTP 200
- Shape: top-level keys `model_remains`, `base_resp`
- Models returned: `general`, `video`
- Model fields match MacD research: `current_interval_*`, `current_weekly_*`, `start_time`, `end_time`, `weekly_start_time`, `weekly_end_time`, `remains_time`
- Decision: keep current MiniMax schema and history behavior.

### Claude

- Expected auth file: `~/.claude/.credentials.json`
- Auth status: missing on this machine.
- Other checked locations: `~/.claude` exists, but only settings/history/plugin files were found; no OAuth credentials file.
- Endpoint was not called because no OAuth token was available.
- Research source check: community reports confirm endpoint `GET https://api.anthropic.com/api/oauth/usage` with Claude Code OAuth credentials, and also report aggressive HTTP 429 behavior when polled too often.
- Decision: Claude Phase 1 starts with auth discovery and a single manual smoke test. The collector must support `auth_missing` and `rate_limited` without failing the whole cron.

### ChatGPT / Codex

- Auth file: `~/.codex/auth.json`
- Auth status: exists, mode `600`, contains `tokens.access_token`, `tokens.refresh_token`, `tokens.account_id`
- Smoke command: `curl -H "Authorization: Bearer <redacted>" https://chatgpt.com/backend-api/wham/usage`
- Result: HTTP 200
- Real response shape differs from MacD's illustrative `rate_limits[]` shape.
- Real top-level keys include: `plan_type`, `rate_limit`, `code_review_rate_limit`, `additional_rate_limits`, `credits`, `spend_control`, `rate_limit_reached_type`, `rate_limit_reset_credits`
- Real plan value: `plan_type: "plus"`
- Real window fields:
  - `rate_limit.primary_window.used_percent`
  - `rate_limit.primary_window.limit_window_seconds`
  - `rate_limit.primary_window.reset_after_seconds`
  - `rate_limit.primary_window.reset_at` as Unix seconds
  - `rate_limit.secondary_window.*`
- `accounts/check/v4-2023-04-27` smoke with same bearer returned HTTP 403 and non-JSON. It must be optional, not required.
- Decision: ChatGPT normalizer must use the observed `rate_limit.primary_window` / `secondary_window` schema first, with optional support for `additional_rate_limits` and fallback support for a future `rate_limits[]` shape.

### Gemini

- Expected auth files:
  - `~/.gemini/oauth_creds.json`
  - `~/.config/gcloud/application_default_credentials.json`
- Auth status: both missing.
- Checked `~/.gemini`: state/config/history files exist, but no usable OAuth credentials file was found.
- Endpoint was not called because no OAuth token and no `duetProject` were available.
- Source check:
  - Google Gemini CLI source includes `loadCodeAssist` and uses `metadata.duetProject`.
  - Google official quotas page says Gemini Code Assist / Gemini CLI requests are combined; Standard is 1500 requests per user per day and Enterprise is 2000.
  - The same official page was last updated 2026-06-18 and says Gemini Code Assist individuals, Google AI Pro, and Google AI Ultra tiers stop serving Gemini Code Assist / Gemini CLI requests from 2026-06-18 and should migrate to Antigravity.
- Decision: Gemini implementation is not ready until the implementer confirms whether Zach's usable quota source is Gemini CLI, Antigravity CLI, Code Assist Standard/Enterprise, or API key/Vertex. Do not assume `retrieveUserQuota` will work for Google AI Pro after 2026-06-18.

## 3. Decisions For Open Questions

1. Claude plan tier: assume `pro` for UI labels and expectations, but store the API's plan/tier field if present. Do not hard-code message limits.
2. ChatGPT plan tier: use live `wham/usage.plan_type`; current machine returned `plus`. The previous default `pro` is wrong for this auth file.
3. Gemini plan: do not assume Google AI Pro is queryable through Gemini CLI after 2026-06-18. Default implementation track is `gemini-code-assist-or-antigravity`, with a required discovery step.
4. Auth file location: read native locations first. Do not copy credentials into the repo. Optional later consolidation into `~/.openclaw/secrets/` is allowed only with chmod `600`.
5. Failure mode: partial success. Write each provider's error into `errors`, preserve last good provider snapshot, commit successful provider updates, and prefix Telegram summary with warning text if any provider failed.
6. Cron cadence: keep current 5x/day schedule for V1. Consider higher-frequency work-hour snapshots only after all providers have stable auth and endpoint behavior.

## 4. Final Public Snapshot Schema

Write a new public file:

```text
public/multi-provider-quota-snapshot.json
```

Schema:

```json
{
  "_version": 1,
  "_generatedAt": "2026-06-19T08:55:00Z",
  "_source": "local-cron-multi-provider-quota",
  "snapshotDateUtc": "2026-06-19",
  "snapshotWindowUtc": "06-11",
  "providers": {
    "minimax": {
      "ok": true,
      "status": "ok",
      "plan": "coding-plan",
      "source": "public/minimax-api-status.json",
      "windows": {
        "general": {
          "kind": "five_hour",
          "usedPct": 6,
          "remainingPct": 94,
          "resetsAt": "2026-06-19T11:00:00Z",
          "weeklyUsedPct": 0,
          "weeklyRemainingPct": 100,
          "weeklyResetsAt": "2026-06-22T00:00:00Z"
        }
      }
    },
    "claude": {
      "ok": false,
      "status": "auth_missing",
      "plan": "pro",
      "windows": {},
      "errorCode": "auth_missing"
    },
    "chatgpt": {
      "ok": true,
      "status": "ok",
      "plan": "plus",
      "windows": {
        "primary": {
          "kind": "primary_window",
          "usedPct": 79,
          "limitWindowSeconds": 18000,
          "resetAfterSeconds": 11264,
          "resetsAt": "2026-06-19T18:26:34Z"
        },
        "secondary": {
          "kind": "secondary_window",
          "usedPct": 30,
          "limitWindowSeconds": 604800,
          "resetAfterSeconds": 486313,
          "resetsAt": "2026-06-24T19:04:03Z"
        }
      },
      "credits": {
        "hasCredits": false,
        "unlimited": false,
        "resetCreditsAvailable": 2
      }
    },
    "gemini": {
      "ok": false,
      "status": "auth_missing_or_surface_unknown",
      "plan": "unknown",
      "windows": {},
      "buckets": [],
      "errorCode": "auth_missing"
    }
  },
  "errors": [
    {
      "provider": "claude",
      "code": "auth_missing",
      "message": "OAuth credentials not found at configured locations."
    }
  ]
}
```

Rules:

- No email, account id, user id, token, refresh token, cookie, project id, or raw auth error body in public JSON.
- `resetsAt` must be ISO-8601 UTC. Convert Unix seconds from ChatGPT.
- Keep raw API bodies out of public JSON unless the body has been explicitly redacted and schema-reviewed.
- `status` values: `ok`, `auth_missing`, `auth_expired`, `rate_limited`, `endpoint_changed`, `network_error`, `surface_unknown`, `partial`.

## 5. History Schema And Dedup Key

Do not replace `public/quota-history.json` in V1. Extend it carefully.

New entries should include:

```json
{
  "_schema": "multi-provider-v1",
  "historyKey": "2026-06-19_06-11_chatgpt",
  "provider": "chatgpt",
  "date": "2026-06-19",
  "window": "06-11",
  "capturedAt": "2026-06-19T08:55:00Z",
  "status": "ok",
  "plan": "plus",
  "windows": {
    "primary": { "usedPct": 79, "resetsAt": "2026-06-19T18:26:34Z" },
    "secondary": { "usedPct": 30, "resetsAt": "2026-06-24T19:04:03Z" }
  }
}
```

Dedup key:

```text
date + "_" + snapshotWindowUtc + "_" + provider
```

Rationale:

- MiniMax's native 5-hour windows remain visible.
- Claude / ChatGPT / Gemini have rolling or mixed reset windows, so deduping by their reset timestamp would produce uneven history.
- One provider row per shared UTC bucket keeps dashboard trend rendering simple.

## 6. Per-Provider Update Script Spec

V1 should add an orchestrator and per-provider modules, not three unrelated cron scripts.

Recommended files:

- `scripts/update-multi-provider-quota.js`
- `scripts/quota/providers/minimax.js`
- `scripts/quota/providers/claude.js`
- `scripts/quota/providers/chatgpt.js`
- `scripts/quota/providers/gemini.js`
- `scripts/quota/redact.js`
- `scripts/quota/history.js`

Function contracts:

```js
async function fetchProviderQuota({ now, env, logger }) {
  return {
    provider: 'chatgpt',
    ok: true,
    status: 'ok',
    plan: 'plus',
    windows: {},
    buckets: [],
    errors: []
  };
}
```

Environment/config names:

- `MINIMAX_API_KEY_FILE`, default `~/.minimax-api-key`
- `CLAUDE_CREDENTIALS_FILE`, default `~/.claude/.credentials.json`
- `CODEX_AUTH_FILE`, default `~/.codex/auth.json`
- `GEMINI_OAUTH_FILE`, default `~/.gemini/oauth_creds.json`
- `GOOGLE_APPLICATION_CREDENTIALS`, optional fallback for Gemini
- `GEMINI_DUET_PROJECT`, optional explicit override
- `QUOTA_HISTORY_FILE`, default `public/quota-history.json`
- `QUOTA_SNAPSHOT_FILE`, default `public/multi-provider-quota-snapshot.json`

Error behavior:

- Each provider wraps all network/auth code in `try/catch`.
- Provider failure returns `{ ok:false, status:<code>, errorCode:<code> }`.
- Orchestrator exits 0 if at least one provider was written successfully.
- Orchestrator exits non-zero only for filesystem corruption, invalid JSON write, or no providers runnable at all.
- Failed provider must not blank previous good data.

## 7. Cron Wiring

Keep existing cron ID `57d74d01-f083-4cf5-85ab-8ce0f2cad7f5` unless Zach explicitly asks to create a new job.

Preferred V1 cron wrapper flow:

```bash
cd ~/.openclaw/workspace/virtual-office
bash scripts/refresh-data.sh minimax copilot
node scripts/update-multi-provider-quota.js --commit-files-only
git add public/minimax-api-status.json public/quota-history.json public/multi-provider-quota-snapshot.json
git commit -m "Quota snapshot $(date -u +%Y-%m-%dT%H:%M:%SZ)" --quiet || true
git pull --rebase origin main
git push origin main
```

Notes:

- Keep MiniMax refresh first until multi-provider path is stable.
- `--commit-files-only` should write files but not run git itself; cron wrapper owns git.
- Telegram summary remains in the existing `Quota-時段末快照` path, but message text should say which providers failed.

## 8. Frontend Scope

Implementation may update:

- `index.html`
- `dashboard.html`
- `public/multi-provider-quota-snapshot.json`
- `public/quota-history.json`
- `scripts/**`
- `package.json` / `package-lock.json` only if needed for Google OAuth library

Do not update unrelated Discord bot features, project list, memory pages, or Copilot CSV import logic.

Frontend requirements:

- Home page widget shows current provider cards: MiniMax, Claude, ChatGPT, Gemini.
- Dashboard quota history tab gains a multi-provider section below existing MiniMax v1/v2 tables.
- Existing MiniMax v1/v2 tables must still render unchanged.
- Provider failures show a muted warning state, not a broken page.
- Mobile width 390 px must not overflow except existing data tables that already intentionally scroll.

## 9. Safety Check

Implementation must include:

- A redaction helper that rejects keys matching `token`, `secret`, `cookie`, `email`, `account`, `user_id`, `project_id`, `refresh`.
- A pre-write assertion that public JSON has no obvious token/account/email fields.
- `.gitignore` coverage for any local auth cache, temp response file, debug dump, or provider raw body.
- chmod check warning if auth files are broader than `600`.
- No raw curl output committed.
- No account identifiers, emails, project ids, or OAuth scopes in `public/*.json`.

## 10. Phase Ordering

1. Stabilize current MiniMax path and write `multi-provider-quota-snapshot.json` with MiniMax plus ChatGPT, because both auth files are already available and smoke tests succeeded.
2. Add Claude only after OAuth credential location is resolved. The code path can exist, but it should report `auth_missing` until configured.
3. Resolve Gemini surface choice before implementation:
   - If using Code Assist Standard/Enterprise, implement `loadCodeAssist`/`retrieveUserQuota`.
   - If using Antigravity CLI after 2026-06-18, research its local auth and quota source first.
   - If using API key/Vertex, track API rate-limit headers from actual calls, not `retrieveUserQuota`.
4. Add unified Telegram summary after at least two non-MiniMax providers have stable snapshots.

This changes MacD's original order. Claude is no longer first because credentials are missing locally. ChatGPT is first non-MiniMax because it has a validated live schema.

## 11. Out Of Scope

- Not a budget manager.
- Not automatic provider switching.
- Not automatic cron pausing.
- Not scraping browser pages with cookies in V1.
- Not reverse engineering Antigravity beyond a short discovery spike.
- Not changing MiniMax cron ID.
- Not committing raw API responses.

## 12. Ready Review Checklist

Codex will mark implementation ready only if:

- Existing MiniMax `public/minimax-api-status.json` and `public/quota-history.json` still update.
- `public/multi-provider-quota-snapshot.json` exists and validates against the planned schema.
- ChatGPT parser handles the observed `rate_limit.primary_window` / `secondary_window` schema.
- Claude/Gemini missing-auth paths return clean warning JSON and do not throw.
- No public JSON contains token, email, user id, account id, project id, cookie, or raw auth body.
- Cron remains idempotent under partial provider failure.
- Dashboard and home page still load locally without console errors.
- Existing three dashboard tabs still work; if a new Dashboard tab is added, tab switching and smoke tests are updated.
- Git diff does not include unrelated rewrites.
- Telegram summary is tested or explicitly listed as not yet changed in the PR.

## 13. Implementation Handoff Prompt

You are the implementation agent for `ai-lish/virtual-office`, now taking the next handoff.

Please read:

1. `Agent-Comms/PROTOCOL.md`
2. `Agent-Comms/HANDOFF.md`
3. `virtual-office/Planning/20260619_MULTI_PROVIDER_QUOTA_V1.md`
4. `virtual-office/scripts/refresh-data.sh`
5. `virtual-office/scripts/update-quota-history.sh`
6. `virtual-office/scripts/cron-quota-end.sh`
7. `virtual-office/index.html`
8. `virtual-office/dashboard.html`

Task:

Implement V1 multi-provider quota snapshots for Virtual Office exactly as planned. Start with MiniMax + ChatGPT because both were live-smoke-tested. Add Claude and Gemini code paths as safe `auth_missing` / `surface_unknown` stubs unless credentials are found during your run.

Scope and limits:

- Do not commit secrets.
- Do not break existing MiniMax cron output.
- Do not change cron job ID `57d74d01-f083-4cf5-85ab-8ce0f2cad7f5`.
- Do not put emails, account ids, project ids, user ids, tokens, cookies, or raw auth bodies into `public/*.json`.
- Do not rewrite unrelated pages or Discord bot logic.
- Do not create a separate status report.

Completion conditions:

- `public/multi-provider-quota-snapshot.json` is generated.
- `public/quota-history.json` can hold provider-keyed history entries without breaking existing MiniMax entries.
- Home page and dashboard expose current/historical provider status with failure-safe UI.
- Local tests or smoke checks are documented in the PR.

After completion:

1. Write the real implementation output in the repo/PR, not a separate report.
2. Append one line to `Agent-Comms/HANDOFF.md`, `from=openclaw -> next=codex`, linking this planning file and the implementation PR/branch.
3. Hand back to Codex for Ready Review.

## 14. Sources Checked

- Google Gemini Code Assist quotas, last updated 2026-06-18: https://developers.google.com/gemini-code-assist/resources/quotas
- Gemini CLI quota/pricing docs: https://geminicli.com/docs/resources/quota-and-pricing/
- Gemini CLI source, Code Assist server: https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/code_assist/server.ts
- Anthropic Claude Code issue on `/api/oauth/usage` rate limits: https://github.com/anthropics/claude-code/issues/31637
- OpenAI Codex issue showing `/backend-api/wham/usage` polling: https://github.com/openai/codex/issues/10869
- CodexBar Codex provider docs documenting current `rate_limit.primary_window` / `secondary_window`: https://github.com/steipete/CodexBar/blob/main/docs/codex.md
