# MiniMax API 安全架構設計

## 架構概覽

```
~/.minimax-api-key (chmod 600)     ← 唯一存放 API key 的地方
        │
        ▼
┌─ server.js ─────────────────┐
│  GET /api/minimax/quota     │    ← 即時 proxy（讀 key → call API → 返回乾淨 JSON）
│  自動快取到:                  │
│  public/minimax-status.json │    ← 靜態快取（.gitignore 排除）
└─────────────────────────────┘
        │
        ├── GitHub Pages 靜態 fallback（public/minimax-status.json）
        └── index.html fetch → 顯示 quota bar

┌─ scripts/update-minimax.js ──┐
│  Cron: 03:00 07:00 12:00     │   ← 定期更新快取
│        17:00 22:00           │
│  --commit: git push 到 Pages │
└──────────────────────────────┘
```

## 安全設計

| 層級 | 設計 |
|------|------|
| API Key 儲存 | `~/.minimax-api-key`（600 權限，不在 repo 內） |
| Server 端 | 讀取本地檔案，永不回傳 key，只回傳 quota 數據 |
| 前端 | 只 fetch `/api/minimax/quota` 或靜態 JSON，零機密資訊 |
| Git | `.gitignore` 排除 `public/minimax-status.json` |
| Cron | 用 `--commit` 時只 push 公開 JSON，不含 key |

## 設定步驟

### 1. 儲存 API Key

```bash
echo "你的-minimax-api-key" > ~/.minimax-api-key
chmod 600 ~/.minimax-api-key
```

### 2. 測試

```bash
# 測試 cron script
node scripts/update-minimax.js --dry-run

# 測試 server endpoint
curl http://localhost:18899/api/minimax/quota
```

### 3. 設定 Cron（5 次/日）

```bash
crontab -e
# 加入：
0 3,7,12,17,22 * * * cd /Users/zachli/.openclaw/workspace/virtual-office && /usr/local/bin/node scripts/update-minimax.js --commit >> /tmp/minimax-cron.log 2>&1
```

## API Endpoint

### `GET /api/minimax/quota`

回傳（success case）：
```json
{
  "success": true,
  "data": {
    "remains": 850,
    "used": 150,
    "total": 1000,
    "resetDate": "2026-04-01",
    "updatedAt": "2026-03-29T11:40:00.000Z",
    "provider": "minimax",
    "source": "live"
  }
}
```

- `source: "live"` = 即時從 MiniMax API 取得
- `source: "cached"` = 從 `public/minimax-status.json` 讀取

### Fallback 邏輯

1. 有 `~/.minimax-api-key` → 即時 call API → 回傳 + 快取
2. API 失敗 → 回傳快取檔案
3. 無 key 且無快取 → 回傳 `NOT_CONFIGURED` error

## 前端顯示

MiniMax quota 顯示在 Copilot dashboard 下方，包括：
- 用量進度條（藍色/黃色/紅色）
- 剩餘 / 已用 / 重設日
- 數據來源標記（即時 / 快取 + 更新時間）

## 檔案清單

| 檔案 | 用途 |
|------|------|
| `server.js` | `/api/minimax/quota` endpoint |
| `scripts/update-minimax.js` | Cron 更新腳本 |
| `index.html` | 前端 dashboard 顯示 |
| `public/minimax-status.json` | 快取（.gitignore） |
| `docs/MINIMAX-API-SECURE.md` | 本文件 |
