---
name: minimax-quota
description: Query MiniMax API usage and remaining quota for Token Plan. Use when user asks to check usage, 查看用量, 查配額, MiniMax quota, token remaining, 已用多少, 剩餘配額. Triggered by: check usage, 查看用量, 查配額, MiniMax quota.
---

# MiniMax Quota Skill

查詢 MiniMax Token Plan 用量和剩餘配額。

## API Endpoint

```bash
curl -s --location 'https://api.minimax.io/v1/api/openplatform/coding_plan/remains' \
--header 'Authorization: Bearer <API_KEY>'
```

## 輸出格式

回傳 JSON，包含各模型的：
- `current_interval_total_count` — 總配額
- `current_interval_usage_count` — 已使用
- `remains_time` — 剩餘時間（毫秒）
- `model_name` — 模型名稱

## 解析腳本

```python
import subprocess
import json

result = subprocess.run([
    'curl', '-s', '--location',
    'https://api.minimax.io/v1/api/openplatform/coding_plan/remains',
    '--header', 'Authorization: Bearer <API_KEY>'
], capture_output=True, text=True)

data = json.loads(result.stdout)

print("📊 MiniMax 用量查詢\n")
print("| Model | 已用 | 限額 |")
print("|-------|------|------|")

for item in data.get('model_remains', []):
    name = item['model_name']
    used = item['current_interval_usage_count']
    total = item['current_interval_total_count']
    if total > 0:
        print(f"| {name} | {used} | {total} |")
```

## 常見 Model Name

| model_name | 說明 |
|------------|------|
| `MiniMax-M*` | M2.7 文字模型（5小時窗口）|
| `speech-hd` | Speech 2.8 語音（每日）|
| `image-01` | Image 圖像生成（每日）|
| `MiniMax-Hailuo-2.3-Fast-6s-768p` | Hailuo 視頻 |
| `music-2.5` | Music 音樂生成 |

## 重要備注

- **M2.7**: 5小時滾動窗口，配額動態釋放
- **Speech/Image**: 每日配額，午夜 UTC 00:00 重置
- **Plus Plan**: M2.7 4,500 req/5hrs, Speech 4,000 字/日, Image 50 張/日
