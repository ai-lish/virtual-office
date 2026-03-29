# MiniMax API 安全架構設計

## 核心原則
- API Key 永遠唔存入 Git
- API Key 唔喺 Discord 對話出現
- API Key 唔寫入任何前端代碼
- 所有 API 調用經過本地 server

---

## 架構

```
~/.minimax-api-key          ← API key（600 權限，隔離）
        │
        ▼
server.js (讀取key，唔暴露)
        │
        ├── GET /api/minimax/quota
        │       │
        │       └── curl MiniMax API
        │               │
        │               ▼
        │       只返回：{ remains, used, total, resetDate }
        │
        └── public/minimax-status.json（自動更新，commit到GitHub）
                │
                ▼
        網站 fetch 只睇到乾淨的數據
```

---

## 實施步驟

### Step 1: 安全儲存 API Key

```bash
# 本地檔案（推薦）
echo "your-api-key-here" > ~/.minimax-api-key
chmod 600 ~/.minimax-api-key

# 或 macOS Keychain
security add-generic-password -s "minimax-api" -a "zachli" -w "your-api-key-here"
```

### Step 2: Server endpoint（server.js 新增）

```javascript
// GET /api/minimax/quota
// Reads key from ~/.minimax-api-key — never exposed to frontend
app.get('/api/minimax/quota', async (req, res) => {
  const key = fs.readFileSync(process.env.HOME + '/.minimax-api-key', 'utf8').trim();
  
  const response = await fetch('https://www.minimax.io/v1/api/openplatform/coding_plan/remains', {
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }
  });
  
  const data = await response.json();
  
  // 只返回必要資訊，唔暴露 key
  res.json({
    remains: data.remains || (data.total - data.used),
    used: data.used,
    total: data.total,
    resetDate: data.resetDate,
    provider: 'minimax'
  });
});
```

### Step 3: 前端顯示

```javascript
// 網站只需要 fetch 呢個（無 key）
fetch('http://localhost:18899/api/minimax/quota')
  .then(r => r.json())
  .then(d => {
    document.getElementById('minimax-quota').innerText = 
      `${d.used} / ${d.total} remaining: ${d.remains}`;
  });
```

### Step 4: Cron Job 更新（書記agent）

```
時間：03:00, 07:00, 12:00, 17:00, 22:00
    │
    ├── 讀取 ~/.minimax-api-key
    ├── curl MiniMax API
    ├── 更新 public/minimax-status.json
    ├── Commit + Push
    └── Discord 通知（如有問題）
```

---

## 安全檢查清單

- [ ] API key 檔案 600 權限
- [ ] API key 唔喺 .gitignore（確保唔 commit）
- [ ] server.js 唔包含 key（只讀取檔案）
- [ ] 前端只 fetch public endpoint
- [ ] API response 只包含必要欄位

---

## 下一步

1. 提供 MiniMax API key（透過安全渠道）
2. 設定 ~/.minimax-api-key
3. 修改 server.js 新增 endpoint
4. 更新 cron jobs
5. 創建顯示頁面
