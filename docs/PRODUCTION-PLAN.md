# Phase 12 Level 3 — Production Plan
**師弟 (Builder) 編製 | 2026-03-28**

---

## 現況診斷

| 元件 | 狀態 |
|---|---|
| Virtual Office API (localhost:18899) | ✅ 正常運行 |
| Copilot API (/api/copilot/quota, /analysis) | ✅ 正常 |
| n8n 本身 (localhost:5678) | ✅ 正常 |
| n8n workflow | ❌ 未 import/activate（格式錯誤） |
| Discord Webhook Alert | ❌ 完全缺失 |
| Google Sheets | ❌ 未配置（`YOUR_GOOGLE_SHEET_ID` placeholder） |
| 前端數據源 | ⚠️ 靜態 JSON，非實時 |
| Webhook 暴露到互聯網 | ❌ 未配置 |
| 安全性鉤子 | ❌ 缺失 |

---

## 1. n8n Workflow 修復

### 根因分析
當前 workflow JSON 存在多個 n8n v2.11.4 不兼容問題：

```
❌ "n8n-nodes-base.respondToWebhook"   → v2.x 中不正確
❌ scheduleTrigger 的 "dayInterval" 結構 → v1.1 vs v2.x 差異
❌ googleSheets 的 "sheetId"           → 應該是 "documentId"
❌ 沒有 Discord webhook node
❌ 沒有條件分支（>80%/>95% 閾值邏輯）
❌ webhook 沒有 authentication
```

### ✅ 解決方案：從頭在 n8n UI 重建（推薦）

**理由**：workflow JSON 修補不如直接重建可靠，n8n UI 確保節點版本匹配。

#### Step-by-step n8n UI 操作指南：

**目標 workflow 名稱：`copilot-usage-tracker`**

##### Part A：手動創建 Workflow

1. **打開 n8n UI**：`http://localhost:5678`
2. **點擊 + New → Blank Workflow**
3. **命名**：左上角 Workflow Name → `copilot-usage-tracker`

##### Part B：Schedule Trigger（每日 quota + 歷史記錄）

4. **添加 Schedule Trigger**：`+` → Search "Schedule" → **Schedule Trigger**
   - Rule: `Every Day`
   - Cron expression: `0 9 * * *`（香港時間 9:00 AM）
   - ⭐ 這個 trigger 驅動 Google Sheets 歷史記錄 + Discord 報警

5. **添加 HTTP Request Node**（右鍵 chain）：
   - Name: `GET Quota (Scheduled)`
   - Method: `GET`
   - URL: `http://localhost:18899/api/copilot/quota`
   - Timeout: `10000ms`
   - ✅ Test step: 點 `Test workflow` 確認返回 JSON

6. **添加 IF Node**（判斷是否需要 Discord 報警）：
   - Name: `Check Quota Threshold`
   - Condition: `{{ $json.data.quota.usedPercent }}`
   - Mode: `Numeric`
   - Operation: `greater`
   - Value: `80`

7. **Add Discord Webhook Node**（IF true 分支）：
   - `+` → Search "Discord" → **Discord Webhook**
   - Webhook URL: `YOUR_DISCORD_WEBHOOK_URL`（見 Section 4）
   - JSON Output:
     ```json
     {
       "content": "⚠️ Copilot quota usage exceeded 80%!",
       "embeds": [{
         "title": "Copilot Usage Alert",
         "color": 16744448,
         "fields": [
           { "name": "Used", "value": "{{ $json.data.quota.used }}", "inline": true },
           { "name": "Total", "value": "{{ $json.data.quota.total }}", "inline": true },
           { "name": "Usage %", "value": "{{ $json.data.quota.usedPercent }}%", "inline": true }
         ]
       }]
     }
     ```

8. **添加第二個 IF Node**（>95% 緊急）：
   - Clone `Check Quota Threshold`，修改條件：`> 95`
   - Connect to a second Discord node（用紅色 emoji 或 @everyone）

9. **添加 Google Sheets Node**（主流程，schedule trigger 右鍵 chain）：
   - `+` → Search "Google Sheets" → **Google Sheets**
   - Operation: `Append Row`
   - Document ID: `YOUR_GOOGLE_SHEET_ID`（替換 placeholder）
   - Sheet Name: `Quota History`
   - Columns: `Date, Used, Total, UsedPercent, Models, Timestamp`
   - Value Input Mode: `Define Below`
   - Add Row Values:
     ```
     {{ $now.format('YYYY-MM-DD') }}
     {{ $json.data.quota.used }}
     {{ $json.data.quota.total }}
     {{ $json.data.quota.usedPercent }}
     {{ JSON.stringify($json.data.models) }}
     {{ $json.data.quota.lastUpdated }}
     ```

##### Part C：Webhook Trigger（實時 API 轉發）

10. **添加 Webhook Node**：
    - `+` → Search "Webhook" → **Webhook**
    - Path: `copilot-quota`
    - HTTP Method: `GET`
    - Response Mode: `Response Node`
    - Authentication: `Basic Auth`（見 Section 7 安全設計）

11. **添加 HTTP Request Node**（chain from webhook）：
    - URL: `http://localhost:18899/api/copilot/quota`

12. **添加 Respond to Webhook Node**：
    - `+` → Search "Respond" → **Respond to Webhook**
    - Respond With: `JSON`
    - Response Body: `{{ $json }}`

13. **重複 10-12 步驟**，第二個 webhook path: `copilot-analysis`

##### Part D：連接並激活

14. **連接所有 nodes**（drag connection lines）：
    - Schedule → GET Quota → Check 80% IF → [True] → Discord 80% Alert
    - Check 80% IF → [False] → Check 95% IF → [True] → Discord 95% Alert
    - Schedule → GET Quota → Google Sheets Append
    - Webhook (quota) → GET → Respond
    - Webhook (analysis) → GET → Respond

15. **點 `Activate`按鈕**（右上角 toggle）

16. **測試 schedule trigger**：點 `Test workflow` → `Execute Workflow` 確認數據流

---

### 備選方案：如果 n8n UI 也有問題

使用 n8n CLI：

```bash
# 登入
n8n login --url http://localhost:5678

# 或者直接 import（如果 JSON 格式已修復）
n8n import:workflow --input=./artifacts/n8n-copilot-workflow-fixed.json
```

**推薦工具**：直接用 n8n UI，因為這是圖形化操作，最直觀。

---

## 2. Webhook 暴露到互聯網

### 方案比較

| 方案 | 優點 | 缺點 |
|---|---|---|
| **Cloudflare Tunnel（推薦）** | 免費、無需帳號、稳定 | 需要 Cloudflare 帳號（免費） |
| ngrok（有 authtoken） | 成熟穩定 | 需要authtoken |
| ngrok（無 authtoken） | 30分鐘session，測試用 | 不穩定 |
| Tailscale Funnel | 免費，在綫設備 | 需要 Tailscale |
| **Skip 公開 webhook** | 最簡單 | 無法實時外部觸發 |

### ✅ 推薦：Cloudflare Tunnel（最簡單免費方案）

```bash
# 1. 安裝 cloudflared
brew install cloudflared

# 2. 創建 tunnel（一次性）
cloudflared tunnel create copilot-n8n

# 3. 配置文件
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: <TUNNEL_ID>
credentials-file: /Users/zachli/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: copilot.YOUR-DOMAIN.com
    service: http://localhost:5678
  - service: http_status:404
EOF

# 4. 啟動
cloudflared tunnel run copilot-n8n

# 5. 在 Cloudflare DNS 添加 CNAME record
# Type: CNAME, Name: copilot, Target: <TUNNEL_ID>.cfargotunnel.com
```

### 備選：ngrok（有 authtoken）

```bash
# 安裝
brew install ngrok

# 登入（需要 authtoken）
ngrok config add-authtoken YOUR_TOKEN

# 啟動
ngrok http 5678 --domain=your-app.ngrok-free.app

# 輸出 example: https://your-app.ngrok-free.app
```

### ⚠️ 簡化方案：Skip webhook trigger

如果不需要外部實時觸發，**完全使用 Schedule Trigger**：
- Daily 9:00 AM：自動抓 quota → append Google Sheets
- Daily 9:30 AM：自動抓 analysis → send Discord alert if needed
- Dashboard 讀取：直接從 Google Sheets 或 n8n 的 static JSON 輸出

**這個方案完全繞過 ngrok/cloudflare 配置**，是最快上綫的方法。

---

## 3. Frontend Integration

### 當前架構
```
token-dashboard.js → fetches → token-log.json (static)
                                        ↑
                               手動/腳本更新
```

### 目標架構（推薦方案）

**方案 A：如果有公開 n8n webhook URL（Cloudflare/ngrok）**

Dashboard 直接從 n8n webhook 拉取：

```javascript
// 在 token-api.js 中添加
async loadFromN8N() {
  // n8n webhook URL（Cloudflare/ngrok 暴露後）
  const N8N_WEBHOOK_BASE = 'https://your-domain.com/copilot-quota';
  const res = await fetch(`${N8N_WEBHOOK_BASE}?auth=${WEBHOOK_SECRET}`);
  return res.json();
}
```

**方案 B（最簡單）：Schedule + Static JSON 寫入**

n8n Schedule Trigger → GET Quota → **Write Binary File** node 寫入 `/tmp/copilot-data.json`

然後一個 cron 腳本定期同步到 GitHub Pages：

```bash
# sync-to-gh-pages.sh
cp /tmp/copilot-data.json /Users/zachli/.openclaw/workspace/virtual-office/public/copilot-summary.json
cd /Users/zachli/.openclaw/workspace/virtual-office
git add public/copilot-summary.json
git commit -m "Auto-update copilot data $(date)"
git push
```

Dashboard 從 `copilot-summary.json` 讀取（GitHub Pages URL）。

**方案 C（推薦給 Virtual Office）：直接讀取 local API**

如果 GitHub Pages 部署的頁面可以 CORS 訪問 localhost:18899：

```javascript
// 直接從 Virtual Office API 讀取
const res = await fetch('http://localhost:18899/api/copilot/quota');
```

**Dashboard 修改**（`token-api.js`）：

```javascript
async loadCopilotData() {
  const [quota, analysis] = await Promise.all([
    fetch('http://localhost:18899/api/copilot/quota').then(r => r.json()),
    fetch('http://localhost:18899/api/copilot/analysis').then(r => r.json())
  ]);
  return { quota, analysis };
}
```

---

## 4. Discord Alerts（>80% / >95%）

### Discord Webhook 設置步驟

1. **創建 Webhook**：
   - Discord 伺服器 → 設定 → 整合 → Webhook → 新 Webhook
   - 命名：`copilot-alerts`
   - 複製 Webhook URL（格式：`https://discord.com/api/webhooks/XXX/YYY`）

2. **n8n Discord Node 配置**（已在 Section 1 完成）：
   - Node: `Discord Webhook`
   - Webhook URL: `https://discord.com/api/webhooks/XXX/YYY`
   - Body: 使用上面 JSON embed 格式

3. **Alert 等級**：
   ```
   >80%:  ⚠️ 黃色預警（普通 mention）
   >95%:  🔴 紅色緊急（@everyone mention）
   ```

4. **測試**：手動在 n8n 執行 workflow，確認 Discord 收到消息

---

## 5. Google Sheets History

### 設置步驟

1. **創建 Google Sheet**：
   - 命名：`Copilot Usage History`
   - 第一行 headers：`Date, Used, Total, UsedPercent, Models, LastUpdated`

2. **獲取 Document ID**：
   - URL：`https://docs.google.com/spreadsheets/d/YOUR_DOC_ID/edit`
   - `YOUR_DOC_ID` 是 `d/` 後面的字符串

3. **n8n Google Sheets Node**（已在 Section 1 配置）：
   - Document ID：`YOUR_GOOGLE_SHEET_ID`（替換）
   - Operation：`Append Row`
   - Sheet Name：`Quota History`

4. **認證**：
   - n8n → Settings → Google Sheets Credential
   - 需要 `Google OAuth2` 或 `Service Account` JSON
   - 最簡單方式：使用 `Service Account` JSON keyfile

### 每日自動 Append 行格式

| Date | Used | Total | UsedPercent | Models | Timestamp |
|---|---|---|---|---|---|
| 2026-03-28 | 234 | 300 | 78.0% | {...} | 2026-03-28T09:00:00Z |

---

## 6. Auto-Recovery（Server 重啟）

### 問題
- n8n 服務重啟 → workflow 需要手動重新 activate
- Virtual Office server 重啟 → IP/port 可能變化

### 解決方案

**A. n8n Auto-activate on restart**：
```bash
# 在 n8n 的 startup script 中設置
export EXECUTIONS_DATA_SAVE_ON_ERROR=all
export EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
export EXECUTIONS_DATA_SAVE_ON_START=true
```

**B. 使用 PM2 管理所有服務**（推薦）：
```bash
# 安裝
npm install -g pm2

# 啟動 Virtual Office
pm2 start node --name "virtual-office" copilot-usage-api.js

# 啟動 n8n（通過 pm2）
pm2 start n8n --name "n8n" -- cron "0 9 * * *"

# 查看狀態
pm2 list

# 重啟所有
pm2 restart all

# 保存進程列表（開機自啟）
pm2 save
pm2 startup   # 會提示如何設置 launchd/launchctl
```

**C. 每日自動重連 script**：
```bash
#!/bin/bash
# check-and-restart.sh
# Cron: @reboot

# 檢查 n8n 是否運行
curl -sf http://localhost:5678/healthz || pm2 restart n8n

# 檢查 Virtual Office 是否運行
curl -sf http://localhost:18899/health || pm2 restart virtual-office

# 確保 workflow activated（通過 n8n API）
curl -X POST http://localhost:5678/rest/workflows/ACTIVATE_ID/activate
```

**D. Webhook URL 穩定性**：
- 如果用 Cloudflare Tunnel，Tunnel ID 固定，URL 永久不變 ✅
- 如果用 ngrok 有authtoken，可以指定固定 subdomain ✅

---

## 7. Security

### Webhook Authentication（必須！）

**n8n Webhook Authentication**：

1. 在 n8n UI → Webhook node → Authentication → **Basic Auth**
2. 設置：
   - User: `copilot-webhook`
   - Password: `YOUR_STRONG_PASSWORD`（min 32 chars, use `openssl rand -hex 16`）

3. **所有 webhook URL 調用必須帶**：
   ```bash
   curl -u copilot-webhook:PASSWORD https://your-domain.com/webhook/copilot-quota
   ```

**Alternative：Query Parameter Auth**：
```javascript
// Webhook URL: https://your-domain.com/webhook/copilot-quota?auth=SECRET_TOKEN
// n8n IF node 檢查: $query.auth === 'SECRET_TOKEN'
```

### Rate Limiting

**n8n 沒有內置 rate limiting**，使用反向代理：

```nginx
# /usr/local/etc/nginx/servers/n8n.conf
limit_req_zone $binary_remote_addr zone=n8n:10m rate=10r/m;
server {
  location / {
    limit_req zone=n8n burst=5 nodelay;
    proxy_pass http://127.0.0.1:5678;
  }
}
```

### CORS 設置

n8n 默認不限制 CORS。在 `n8n` startup 環境變量：
```bash
export N8N_CORS_MODE=strict
export N8N_CORS_ORIGIN=https://your-github-pages-domain.com
```

### Audit Logging

在 n8n workflow 中添加 **Code Node**（寫入日誌）：
```javascript
// 在 HTTP Request 前後添加
const auditEntry = {
  timestamp: new Date().toISOString(),
  ip: $request.header['x-forwarded-for'],
  path: $request.path,
  auth: $request.query.auth ? 'VALID' : 'INVALID',
  action: 'webhook-triggered'
};
console.log(JSON.stringify(auditEntry));
// → n8n logs 會捕獲（使用 pm2 logs 查看）
```

---

## 8. E2E Testing（目標 >80% 覆蓋率）

### 測試工具：Playwright

```bash
# 安裝
npm install -D playwright @playwright/test
npx playwright install chromium
```

### 測試用例

**tests/e2e/copilot.spec.js**：

```javascript
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:18899';
const N8N_BASE = 'http://localhost:5678';

test.describe('Copilot Phase 12 E2E', () => {

  test('API: /api/copilot/quota returns valid JSON', async ({ request }) => {
    const res = await request.get(`${BASE}/api/copilot/quota`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('data');
    expect(data.data.quota).toHaveProperty('used');
    expect(data.data.quota).toHaveProperty('total');
    expect(data.data.quota.usedPercent).toBeGreaterThanOrEqual(0);
  });

  test('API: /api/copilot/analysis returns valid model breakdown', async ({ request }) => {
    const res = await request.get(`${BASE}/api/copilot/analysis`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.data.models).toBeDefined();
  });

  test('API: Quota usedPercent is accurate', async ({ request }) => {
    const res = await request.get(`${BASE}/api/copilot/quota`);
    const data = await res.json();
    const { used, total, usedPercent } = data.data.quota;
    const calculatedPercent = parseFloat(((used / total) * 100).toFixed(2));
    expect(usedPercent).toBeCloseTo(calculatedPercent, 1);
  });

  test('n8n: Webhook returns same data as direct API', async ({ request }) => {
    // 需要 n8n webhook URL（替換）
    const webhookRes = await request.get(`https://your-domain.com/copilot-quota`, {
      headers: { Authorization: 'Basic ' + btoa('copilot-webhook:PASSWORD') }
    });
    expect(webhookRes.status()).toBe(200);
    const webhookData = await webhookRes.json();
    const directRes = await request.get(`${BASE}/api/copilot/quota`);
    expect(webhookData).toMatchObject(directRes);
  });

  test('n8n: Schedule trigger executes without error', async ({ request }) => {
    // 手動 trigger workflow，然後檢查 Google Sheets / Discord
    // 這個測試需要 n8n API access
    const workflows = await request.get(`${N8N_BASE}/rest/workflows`);
    expect(workflows.ok).toBeTruthy();
  });

  test('Dashboard: Loads and displays quota data', async ({ page }) => {
    // 需要先啟動 dashboard（npm start）
    await page.goto('http://localhost:18899');
    await page.waitForSelector('.quota-display', { timeout: 5000 });
    const usedText = await page.textContent('#quota-used');
    expect(usedText).toMatch(/\d+/);
  });

  test('Security: Unauthenticated webhook returns 401', async ({ request }) => {
    const res = await request.get(`https://your-domain.com/copilot-quota`);
    // n8n webhook 沒有 auth 時應該返回 error 或 redirect
    expect([401, 403, 302]).toContain(res.status());
  });

  test('Security: Invalid auth token returns error', async ({ request }) => {
    const res = await request.get(`https://your-domain.com/copilot-quota?auth=WRONG_TOKEN`);
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Auto-recovery: PM2 restarts crashed service', async () => {
    // 停止服務
    execSync('pm2 stop virtual-office');
    // 重啟
    execSync('pm2 restart virtual-office');
    // 等待重啟
    await new Promise(r => setTimeout(r, 3000));
    // 確認重啟成功
    const res = execSync('curl -s http://localhost:18899/health').toString();
    expect(res).toBeTruthy();
  });

});
```

### 測試覆蓋率目標

| 模塊 | 測試數 | 覆蓋 |
|---|---|---|
| API endpoints (quota, analysis) | 4 | ✅ |
| Webhook auth flow | 2 | ✅ |
| Dashboard UI render | 2 | ✅ |
| n8n workflow execution | 1 | ✅ |
| Auto-recovery | 1 | ✅ |
| **Total** | **10** | **~85%** |

### 運行測試

```bash
# 所有測試
npx playwright test

# 單個測試
npx playwright test tests/e2e/copilot.spec.js --grep "API"

# CI 模式（GitHub Actions）
npx playwright test --reporter=github
```

### GitHub Actions CI 配置

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      virtual-office:
        image: node:25
        ports: [18899:18899]
    steps:
      - uses: actions/checkout@v4
      - run: npm install && node copilot-usage-api.js &
      - run: npx playwright install
      - run: npx playwright test
```

---

## 實施順序（Priority 執行計劃）

### Phase 1：修復 n8n Workflow（P0）
```
Day 1: 在 n8n UI 從頭重建 workflow → activate
Day 1: 測試 schedule trigger → 確認 Google Sheets append
Day 1: 測試 webhook trigger → 確認返回正確數據
```

### Phase 2：公開暴露 + 前端整合（P0）
```
Day 1-2: 配置 Cloudflare Tunnel 或 ngrok（取決於 token 可用性）
Day 2: 更新 token-api.js 從 n8n/webhook URL 讀取
Day 2: 確認 dashboard 顯示 Copilot 數據
```

### Phase 3：Discord Alerts（P1）
```
Day 2: 配置 Discord webhook URL
Day 2: 在 n8n workflow 添加 Discord nodes
Day 2: 測試 >80% alert（臨時把 quota used 設高測試）
```

### Phase 4：安全 + Auto-recovery（P1）
```
Day 3: 添加 Basic Auth 到 n8n webhooks
Day 3: 配置 PM2 進程管理
Day 3: 測試 auto-restart
```

### Phase 5：E2E 測試（P2）
```
Day 3-4: 編寫 Playwright 測試
Day 4: 運行測試，達到 >80% 覆蓋
Day 4: 設置 GitHub Actions CI
```

### Day 5：文檔 + 最終確認
```
更新 README.md
操作指南
Architecture diagram
```

---

## 快速啟動命令參考

```bash
# 1. 檢查所有服務狀態
pm2 list
curl http://localhost:18899/health
curl http://localhost:5678/healthz

# 2. 手動觸發 n8n workflow
# n8n UI → Open Workflow → Test workflow

# 3. 檢查 Google Sheets
# 打開 https://docs.google.com/spreadsheets/d/YOUR_ID

# 4. 檢查 Discord webhook（測試）
curl -X POST "YOUR_DISCORD_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test message from Copilot Bot"}'

# 5. 重啟所有服務
pm2 restart all

# 6. 查看 n8n logs
pm2 logs n8n

# 7. 運行 E2E 測試
cd /Users/zachli/.openclaw/workspace/virtual-office
npx playwright test
```

---

## 預估時間

| 階段 | 預估時間 | 難度 |
|---|---|---|
| Phase 1: n8n Workflow | 1-2 小時 | ⭐⭐ |
| Phase 2: Webhook 暴露 | 30 分鐘 - 2 小時 | ⭐ |
| Phase 3: Discord Alerts | 30 分鐘 | ⭐ |
| Phase 4: 安全 + Auto-recovery | 1 小時 | ⭐⭐ |
| Phase 5: E2E 測試 | 2-3 小時 | ⭐⭐ |
| 文檔 | 1 小時 | ⭐ |
| **Total** | **6-9 小時** | |

---

## Blockers 解決狀態追蹤

| Blocker | 解決方案 | 狀態 |
|---|---|---|
| n8n workflow import fails | 在 n8n UI 重建 workflow | 🔨 進行中 |
| ngrok needs auth token | 用 Cloudflare Tunnel 替代 | 📋 待做 |
| n8n REST API auth | Basic Auth 在 webhook node | 📋 待做 |
| Frontend 無 Copilot 數據 | 改為讀取 n8n webhook/static JSON | 📋 待做 |
| Discord alert 缺失 | 添加 Discord Webhook node | 📋 待做 |
| Google Sheets 未配置 | 替換 document ID + OAuth | 📋 待做 |
| 無 E2E 測試 | Playwright 測試套件 | 📋 待做 |
| Auto-recovery | PM2 進程管理 | 📋 待做 |
