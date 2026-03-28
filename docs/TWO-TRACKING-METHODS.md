# Copilot 用量追蹤 — 雙版本方案

## 方案 A：自動攔截（Server Auto-Log）

當 AI API 被調用時，server 自動記錄。

### 如何開啟
在 `copilot-usage-api.js` 或 `server.js` 中，AI 調用後自動 `tracker.logUsage(...)`。

### 已追蹤的模型
- `claude-sonnet-4` (multiplier: 1)
- `claude-opus-4` (multiplier: 5)
- `o4-mini` (multiplier: 0.33)
- `gemini-2.5-pro` (multiplier: 1)
- `gpt-4.1-mini` (multiplier: 0, free)
- 更多...

### 查看自動數據
```bash
curl http://localhost:18899/api/copilot/analysis
```

---

## 方案 B：手動更新（User Manual Log）

你每月提供實際 Copilot 用量，獨立記錄。

### 快速記錄（每次用完 Copilot 後）
```bash
curl -X POST http://localhost:18899/api/copilot/log \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4",
    "tokens": 1000,
    "feature": "chat",
    "success": true
  }'
```

### 批量記錄（更方便）
```bash
curl -X POST http://localhost:18899/api/copilot/log-batch \
  -H "Content-Type: application/json" \
  -d '[
    {"model":"claude-sonnet-4","tokens":500,"feature":"chat"},
    {"model":"o4-mini","tokens":200,"feature":"completion"},
    {"model":"gemini-2.5-pro","tokens":800,"feature":"chat"}
  ]'
```

### 設定配額（每月重置）
```bash
# 月底設定下月配額
curl -X POST http://localhost:18899/api/copilot/quota \
  -H "Content-Type: application/json" \
  -d '{"total": 300, "used": 0}'
```

---

## 月尾比較

### 自動攔截數據（方案 A）
```bash
curl -s http://localhost:18899/api/copilot/analysis | python3 -c "
import sys,json
d=json.load(sys.stdin)['data']
print('=== 自動攔截 ===')
print('今日:', d['summary']['today'])
print('本週:', d['summary']['week'])
print('模型分佈:', d['modelDistribution'])
"
```

### 手動更新數據（方案 B）
```bash
curl -s http://localhost:18899/api/copilot/quota
```

### 差異分析
比較方案 A 的 `modelDistribution`（自動攔截記錄）與方案 B 的手動上報是否有出入。

---

## 面板顯示
http://localhost:18899/public/pages/copilot-usage.html

自動攔截的數據 → `/api/copilot/analysis`
手動更新的數據 → `/api/copilot/quota`
