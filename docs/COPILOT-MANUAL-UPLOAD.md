# Copilot 用量手動上傳指南

## GitHub Copilot Pro 月尾上傳流程

### Step 1：下載用量報告
1. 登入 https://github.com/settings/billing
2. 進入 "GitHub Copilot" 分頁
3. 複製當月用量數據

### Step 2：上傳到系統

**方法 A：批量上傳（推薦）**

一次過上傳整月記錄：
```bash
curl -X POST http://localhost:18899/api/copilot/log-batch \
  -H "Content-Type: application/json" \
  -d '[
    {"model":"claude-sonnet-4","tokens":500,"feature":"chat"},
    {"model":"o4-mini","tokens":200,"feature":"completion"}
  ]'
```

**方法 B：設定總用量**

如果知總量，直接設 quota：
```bash
curl -X POST http://localhost:18899/api/copilot/quota \
  -H "Content-Type: application/json" \
  -d '{"total": 300, "used": 147}'
```

### Step 3：確認上傳成功
```bash
curl http://localhost:18899/api/copilot/quota
```

---

## 月尾檢查清單

- [ ] 從 GitHub 下載 Copilot 用量
- [ ] 對比自動攔截數據（方案 A）
- [ ] 用本指南上傳實際用量（方案 B）
- [ ] 記錄差異到 `/docs/COPILOT-PHASE-PROGRESS.md`
