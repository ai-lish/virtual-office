# GitHub Copilot Usage Tracking Guide

> How to track, log, and monitor Copilot usage across Claude, GPT, Gemini, and other models.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Logging Usage Manually](#logging-usage-manually)
4. [CLI Reference](#cli-reference)
5. [API Reference](#api-reference)
6. [API Key Setup](#api-key-setup)
7. [Field Reference](#field-reference)
8. [Dashboard](#dashboard)
9. [GitHub API — Known Limitations](#github-api--known-limitations)
10. [Quota Configuration](#quota-configuration)

---

## Overview

This tracking system records every call to AI models (Claude, GPT, Gemini, etc.) and maps them to your GitHub Copilot Premium quota. It tracks:

- **Which model** was used
- **What feature** (chat, completion, vision, edit, function)
- **Token count** (informational)
- **Premium cost** (computed from model's multiplier)
- **Latency** (optional)
- **Provider** (claude, openai, gemini)

---

## Architecture

```
copilot-usage-api.js       — Core tracker class (DB read/write, analysis, GitHub polling)
log-usage.js               — CLI script for manual logging and management
server.js                  — Web server + /api/copilot/* endpoints
copilot-usage-db.json      — Persistent storage (history, quota, preferences)
copilot-api-keys.json      — Stored API keys per provider

Dashboard ← HTTP → server.js ← copilot-usage-api.js ← copilot-usage-db.json
CLI       ← HTTP → server.js
GitHub API polling (server-side, configurable interval)
```

---

## Logging Usage Manually

### Quick Start

```bash
# Log a single call
node log-usage.js --model claude-sonnet-4 --tokens 1500 --feature chat

# Log with latency
node log-usage.js --model o4-mini --tokens 800 --feature completion --latency 950

# Log from different providers
node log-usage.js --model gpt-4.1-mini --tokens 500 --feature chat
node log-usage.js --model gemini-2.5-pro --tokens 3000 --feature vision
```

### After Each API Call

If you're calling the API directly from code, log usage immediately:

```javascript
const { CopilotUsageTracker } = require('./copilot-usage-api');
const tracker = new CopilotUsageTracker();

// After each API call:
tracker.logUsage('claude-sonnet-4', 'chat', 1500, {
  latency: 1100,
  apiKeyUsed: 'sk-ant-...',
  success: true
});

// Or use the structured version with token breakdown:
tracker.logApiCall({
  model: 'claude-sonnet-4',
  feature: 'chat',
  promptTokens: 1000,
  completionTokens: 500,
  totalTokens: 1500,
  latency: 1100,
  apiKeyUsed: 'sk-ant-...',
  success: true,
});
```

---

## CLI Reference

```bash
# Log a usage event
node log-usage.js --model <name> --tokens <n> --feature <type>
node log-usage.js --model claude-sonnet-4 --tokens 1500 --feature chat

# With optional fields
node log-usage.js --model o4-mini --tokens 800 --feature completion --latency 950 --success true

# Show quota status
node log-usage.js --quota

# Show full status (quota + recent analysis)
node log-usage.js --status

# Show usage analysis
node log-usage.js --analysis [days]   # default: 30

# List all known models
node log-usage.js --list-models

# Set quota values
node log-usage.js --set-total 500          # set monthly limit to 500 requests
node log-usage.js --set-used 50             # reset used count (after billing)
node log-usage.js --set-reset 2026-04-28    # set billing cycle reset date

# Store an API key
node log-usage.js --api-key claude sk-ant-...     # Anthropic API key
node log-usage.js --api-key openai sk-...         # OpenAI API key
node log-usage.js --api-key gemini AIza...        # Google Gemini API key
node log-usage.js --api-key github ghp_...         # GitHub token (for billing API)

# List stored keys (redacted)
node log-usage.js --list-keys

# Remove a stored key
node log-usage.js --remove-key claude

# Trigger GitHub API poll
node log-usage.js --poll-github

# Help
node log-usage.js --help
```

---

## API Reference

All endpoints return `{ success: true, data: ... }` on success.

### GET /api/copilot/quota

Returns current quota status.

```json
{
  "total": 300,
  "used": 7.33,
  "remaining": 292.67,
  "usedPercent": 2.4,
  "dailyBudget": 9.76,
  "daysRemaining": 30,
  "resetDate": "2026-04-28",
  "warningLevel": "normal",
  "modelPreference": "auto",
  "providerUsage": {
    "claude": 6.0,
    "openai": 0.0,
    "gemini": 1.33
  },
  "recommendation": {
    "level": "comfortable",
    "emoji": "🟢",
    "label": "配額充裕",
    "suggestedModel": "claude-sonnet-4"
  }
}
```

### GET /api/copilot/analysis

Returns usage analysis for the last 30 days.

```json
{
  "summary": {
    "today":  { "count": 3, "premiumCost": 2.33 },
    "week":   { "count": 12, "premiumCost": 8.0 },
    "total":  { "count": 45, "premiumCost": 31.5 }
  },
  "modelDistribution": {
    "claude-sonnet-4": { "count": 20, "premiumCost": 20 },
    "o4-mini":        { "count": 15, "premiumCost": 5 },
    "gpt-4.1-mini":   { "count": 10, "premiumCost": 0 }
  },
  "featureDistribution": {
    "chat":       { "count": 30, "premiumCost": 22 },
    "completion": { "count": 10, "premiumCost": 9.5 },
    "vision":     { "count": 5,  "premiumCost": 5 }
  },
  "providerDistribution": {
    "claude":  { "count": 25, "premiumCost": 25 },
    "openai":  { "count": 15, "premiumCost": 5 },
    "gemini":  { "count": 5,  "premiumCost": 1.33 }
  },
  "trend7Days": [
    { "date": "2026-03-22", "count": 4, "premiumCost": 3 },
    ...
    { "date": "2026-03-28", "count": 12, "premiumCost": 8.5 }
  ]
}
```

### GET /api/copilot/models

Lists all known models and their premium multipliers.

### GET /api/copilot/github-status

Returns the status of GitHub Copilot API polling (tested endpoints, errors, etc.).

### POST /api/copilot/log

Log a single usage event.

```json
// Request
{ "model": "claude-sonnet-4", "feature": "chat", "tokens": 1500, "latency": 1100 }

// Response
{
  "success": true,
  "data": {
    "entry": {
      "id": "mn9pjge3yue1",
      "timestamp": "2026-03-28T02:24:57.531Z",
      "model": "claude-sonnet-4",
      "feature": "chat",
      "tokens": 1500,
      "multiplier": 1,
      "premiumCost": 1,
      "provider": "claude"
    },
    "quota": { "remaining": 292.67, "total": 300, "used": 7.33 }
  }
}
```

### POST /api/copilot/log-batch

Log multiple entries at once.

```json
// Request
{
  "entries": [
    { "model": "claude-sonnet-4", "feature": "chat", "tokens": 1500 },
    { "model": "gpt-4.1-mini", "feature": "chat", "tokens": 500 },
    { "model": "o4-mini", "feature": "completion", "tokens": 800 }
  ]
}
```

### POST /api/copilot/quota

Set quota values.

```json
// Request
{ "total": 500, "used": 0, "resetDate": "2026-04-28" }
```

### POST /api/copilot/preference

Set model preference strategy.

```json
// Request — one of: "auto" | "premium" | "base" | "balanced"
{ "preference": "balanced" }
```

### POST /api/copilot/api-key

Store an API key for a provider.

```json
{ "provider": "claude", "key": "sk-ant-..." }
```

### GET /api/copilot/api-keys

List stored API keys (redacted).

### DELETE /api/copilot/api-key?provider=claude

Remove a stored API key.

### POST /api/copilot/poll-github

Trigger a GitHub API poll manually.

---

## API Key Setup

### GitHub Token (for Copilot billing API)

The GitHub billing API requires a token with `manage_billing:copilot` scope.

```bash
# Using CLI
node log-usage.js --api-key github ghp_your_token_here

# The math-lish token (YOUR_GITHUB_TOKEN) was tested:
#   - All /user/copilot_* endpoints return 404
#   - The account is on the "free" plan (no Copilot subscription)
#   - Requires a Copilot Pro subscription for real billing data
```

### Claude API Key

```bash
node log-usage.js --api-key claude sk-ant-your-key
```

### OpenAI API Key

```bash
node log-usage.js --api-key openai sk-your-key
```

### Gemini API Key

```bash
node log-usage.js --api-key gemini your-gemini-key
```

---

## Field Reference

### Entry Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique ID (timestamp + random) |
| `timestamp` | ISO string | When the call was logged |
| `model` | string | Model identifier (e.g. `claude-sonnet-4`) |
| `feature` | string | Feature type (chat/completion/vision/edit/function) |
| `tokens` | number | Token count (informational) |
| `multiplier` | number | Internal multiplier (0–5+) |
| `premiumCost` | number | Quota requests consumed (multiplier value) |
| `provider` | string | Provider: `claude` \| `openai` \| `gemini` \| `unknown` |
| `apiKeyUsed` | string? | Which key was used (optional) |
| `latency` | number? | Response time in ms (optional) |
| `success` | boolean | Whether the call succeeded (default: true) |

### Quota Fields

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Monthly premium request limit |
| `used` | number | Premium requests used this cycle |
| `remaining` | number | Premium requests remaining |
| `usedPercent` | number | Percentage used (0–100+) |
| `dailyBudget` | number | Suggested daily budget (remaining ÷ days) |
| `daysRemaining` | number | Days until billing reset |
| `resetDate` | string? | ISO date of next reset |
| `warningLevel` | string | `normal` \| `warning` \| `critical` \| `exhausted` |

### Model Multipliers

| Model | Multiplier | Type |
|-------|-----------|------|
| `gpt-4.1`, `gpt-4.1-mini`, `gpt-4o`, `gpt-4o-mini` | 0 | Base (free) |
| `o4-mini`, `o3-mini` | 0.33 | Premium |
| `gemini-2.5-flash` | 0.25 | Premium |
| `gemini-2.0-flash` | 0.1 | Premium |
| `claude-sonnet-4`, `o3`, `gemini-2.5-pro` | 1 | Premium |
| `claude-3-5-sonnet` | 1 | Premium |
| `claude-opus-4` | 5 | Premium (highest) |
| `gpt-4.5` | 50 | Premium (very high) |

---

## Dashboard

The dashboard is served at `http://localhost:18899/`.

Navigate to the **Copilot** or **Phase 12** section for:
- Quota gauge (remaining / total)
- 7-day usage trend chart
- Model distribution breakdown
- Feature breakdown
- Provider distribution
- Model recommendation

The server pushes real-time updates via WebSocket when data changes.

---

## GitHub API — Known Limitations

### Tested Endpoints (math-lish token — all return 404)

| Endpoint | Status | Reason |
|----------|--------|--------|
| `GET /user/copilot_billing` | 404 | Requires `manage_billing:copilot` OAuth scope |
| `GET /user/copilot_subscription` | 404 | Requires `manage_billing:copilot` scope |
| `GET /user/copilot/seats` | 404 | Requires `manage_billing:copilot` scope |
| `GET /orgs/{org}/copilot/usage` | 404 | Requires org admin role |
| `GET /enterprise/{ent}/copilot/usage` | 404 | Requires enterprise admin |
| `GET /user/billing/copilot` | 404 | Not a valid GitHub API path |

### Why 404?

1. **Scope missing**: The math-lish token is a classic PAT without `manage_billing:copilot` scope
2. **No subscription**: The math-lish account is on the "free" plan — no Copilot subscription
3. **Personal token**: The Copilot billing API only works with OAuth tokens that have the right scope

### How to Get Real Data

1. Subscribe to **GitHub Copilot Pro** ($10/month) or **Copilot Business/Enterprise**
2. Create an OAuth App or use GitHub CLI (`gh auth login`)
3. Authorize with the `manage_billing:copilot` scope
4. Store the token: `node log-usage.js --api-key github <token>`
5. The polling mechanism will then pick up real usage data automatically

### Architecture Still Works

Even without real GitHub API data, the manual logging system works perfectly:
- Every `logUsage()` call updates the DB
- Quota is tracked locally
- The GitHub poll still runs every hour and logs what it finds
- When a proper token is added, historical records remain intact

---

## Quota Configuration

### Default Values

- **Total**: 300 premium requests/month
- **Used**: tracked locally via `logUsage()`
- **Reset date**: null (30-day rolling window)

### Setting Your Quota

After receiving your first GitHub Copilot bill:

```bash
# Set total to your plan limit
node log-usage.js --set-total 300

# Reset used count to 0 at the start of billing cycle
node log-usage.js --set-used 0

# Set the billing reset date
node log-usage.js --set-reset 2026-04-28
```

Or via API:

```bash
curl -X POST http://localhost:18899/api/copilot/quota \
  -H "Content-Type: application/json" \
  -d '{"total": 300, "used": 0, "resetDate": "2026-04-28"}'
```

### Automatic Reset

There is no automatic reset — set `--set-used 0` manually at the start of each billing cycle, or automate it with a cron job:

```bash
# Reset quota on the 1st of each month (example cron)
0 0 1 * * cd /path/to/virtual-office && node log-usage.js --set-used 0
```
