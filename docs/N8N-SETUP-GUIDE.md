# n8n Copilot Usage Workflow — Setup Guide

## Prerequisites
- n8n installed (`npm install -g n8n` or `brew install n8n`)
- Virtual Office server running on port 18899
- n8n running on port 5678

## Quick Setup (CLI)

### 1. Import the workflow
```bash
n8n import:workflow --input=artifacts/n8n-copilot-workflow-clean.json
```

### 2. Start n8n
```bash
n8n start
```

### 3. Activate via API
Get your API key from the n8n database:
```bash
sqlite3 ~/.n8n/database.sqlite "SELECT apiKey FROM user_api_keys LIMIT 1;"
```

Activate:
```bash
curl -X POST "http://localhost:5678/api/v1/workflows/copilot-api-v3/activate" \
  -H "X-N8N-API-KEY: YOUR_API_KEY"
```

### 4. Test
```bash
curl http://localhost:5678/webhook/copilot-quota
curl http://localhost:5678/webhook/copilot-analysis
```

## ⚠️ Known Issues & Solutions

### Issue: `ECONNREFUSED ::1:18899`
**Cause:** n8n's JS task runner resolves `localhost` to IPv6 `::1`, but the server listens on IPv4 only.  
**Fix:** Use `http://127.0.0.1:18899` instead of `http://localhost:18899` in all HTTP Request node URLs.

### Issue: `Cannot read properties of undefined (reading 'endsWith')`
**Cause:** Workflow imported with newer typeVersion (v2/v4.2) than what n8n can properly activate via DB manipulation.  
**Fix:** Use typeVersion 1 for Webhook nodes and typeVersion 3 for HTTP Request nodes when importing via CLI. Activate via the REST API, not by setting `active=1` in the DB.

### Issue: `Could not find property option`
**Cause:** Workflow JSON contains nodes with incompatible parameters (e.g., Google Sheets `typeVersion: 3.2`, Email `typeVersion: 1.1` with wrong schema).  
**Fix:** Remove problematic scheduled/notification nodes. Keep only the webhook proxy chain.

### Issue: `NOT NULL constraint failed: workflow_entity.id`
**Cause:** Workflow JSON missing the `id` field.  
**Fix:** Add `"id": "your-workflow-id"` to the top-level JSON.

## Manual Creation via n8n UI

If CLI import fails, create manually:

### Step 1: Create New Workflow
1. Open http://localhost:5678
2. Click "Add workflow"
3. Name it "Copilot Usage API"

### Step 2: Add Webhook Quota Chain
1. **Add Webhook node** → Set HTTP Method: GET, Path: `copilot-quota`, Response: "Using 'Respond to Webhook' Node"
2. **Add HTTP Request node** → Method: GET, URL: `http://127.0.0.1:18899/api/copilot/quota`
3. **Add Respond to Webhook node** → Respond With: "All Incoming Items"
4. Connect: Webhook → HTTP Request → Respond to Webhook

### Step 3: Add Webhook Analysis Chain
1. **Add Webhook node** → Set HTTP Method: GET, Path: `copilot-analysis`, Response: "Using 'Respond to Webhook' Node"
2. **Add HTTP Request node** → Method: GET, URL: `http://127.0.0.1:18899/api/copilot/analysis`
3. **Add Respond to Webhook node** → Respond With: "All Incoming Items"
4. Connect: Webhook → HTTP Request → Respond to Webhook

### Step 4: Activate
Toggle the "Active" switch in the top-right corner.

### Step 5: Test
```bash
curl http://localhost:5678/webhook/copilot-quota
curl http://localhost:5678/webhook/copilot-analysis
```

## Workflow Architecture

```
[GET /webhook/copilot-quota] → [HTTP Request: 127.0.0.1:18899/api/copilot/quota] → [Respond to Webhook]
[GET /webhook/copilot-analysis] → [HTTP Request: 127.0.0.1:18899/api/copilot/analysis] → [Respond to Webhook]
```

The workflow acts as a webhook proxy, exposing the Virtual Office Copilot API through n8n's webhook system.
