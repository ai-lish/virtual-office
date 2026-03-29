# Google Apps Script — Monitoring Data API

## 當你創建好 Google Sheet 後，粘贴此代码

### Step 1: 創建 Apps Script
1. 去 https://script.google.com → 「+ New project」
2. 刪除所有代碼，粘贴以下代碼：

```javascript
const SHEET_ID = 'YOUR_SHEET_ID'; // 替換為你的 Google Sheet ID

function doGet(e) {
  const sheet = getOrCreateSheet('Monitoring');
  const data = [];
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    data.push({
      timestamp: rows[i][0],
      type: rows[i][1],
      page: rows[i][2],
      status: rows[i][3],
      message: rows[i][4]
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const sheet = getOrCreateSheet('Monitoring');
  
  if (payload.type === 'daily-test') {
    // Daily comprehensive test results
    sheet.appendRow([
      new Date(payload.timestamp),
      'daily-test',
      `${payload.passCount}/${payload.totalCount} OK`,
      payload.allOk ? 200 : 500,
      `Duration: ${payload.duration}s`
    ]);
    payload.results.forEach(r => {
      sheet.appendRow([
        new Date(payload.timestamp),
        'page-result',
        r.page,
        r.ok ? 200 : 500,
        r.error || ''
      ]);
    });
  } else {
    // Hourly check
    sheet.appendRow([
      new Date(),
      'hourly-check',
      payload.page || 'site',
      payload.status === 'ok' ? 200 : 500,
      payload.message || ''
    ]);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(['Timestamp', 'Type', 'Page', 'Status', 'Message']);
  }
  return sheet;
}
```

3. 點擊 「Deploy」→ 「Manage deployments」→ ⚙️ → 「Anyone」→ 「Done」
4. 複製 Web App URL（例如：`https://script.google.com/macros/s/XXXXX/exec`）

### Step 2: 設定 URL

告訴 MacD 你的 Web App URL，我幫你設定：
```bash
SHEET_WEBAPP_URL="https://script.google.com/macros/s/XXXXX/exec"
```

### Step 3: Google Sheet ID

你的 Sheet URL 係：`https://docs.google.com/spreadsheets/d/`**【ID】**`/edit`

例如：`https://docs.google.com/spreadsheets/d/1LcgzGshLaArzuBBx9gqAVhVdgq1YbARc/edit`

ID 就係：`1LcgzGshLaArzuBBx9gqAVhVdgq1YbARc`

---

## 架構

```
site-monitor.sh (hourly)
    │
    └── POST { status, message } → Apps Script
                                    │
                                    └── 寫入 Google Sheet

site-test.js (daily)
    │
    └── POST { daily-test, results[] } → Apps Script
                                           │
                                           └── 寫入 Google Sheet

website (anytime)
    │
    └── GET → Apps Script doGet()
                  │
                  └── 讀取 Google Sheet → JSON → 顯示監控狀態
```
