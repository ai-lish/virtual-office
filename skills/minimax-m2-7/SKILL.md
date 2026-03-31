---
name: minimax-m2-7
description: MiniMax M2.7 large language model API for text generation, reasoning, and tool use. Use when generating text content, answering questions, writing code, analysis, or any text-based AI tasks. Triggered by: text generation, reasoning, code writing, analysis, MiniMax M2.7, chatbot, completion.
---

# MiniMax M2.7 Skill

MiniMax M2.7 大語言模型，支援推理和工具調用。

## 基本用法

**Endpoint**: `POST https://api.minimax.io/v1/chat/completions`

```python
import requests

response = requests.post(
    "https://api.minimax.io/v1/chat/completions",
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    },
    json={
        "model": "MiniMax-M2.7",
        "messages": [
            {"role": "system", "content": "你係一個幫助幼兒教育嘅AI助手。"},
            {"role": "user", "content": "幫我寫一個關於紅色嘅故事。"}
        ]
    }
)
print(response.json()["choices"][0]["message"]["content"])
```

## 支援的 Models

| Model | 速度 | 適合 |
|-------|------|------|
| `MiniMax-M2.7` | 60 tps | 複雜推理、重型任務 |
| `MiniMax-M2.7-highspeed` | 100 tps | 快速回應 |
| `MiniMax-M2.5` | 60 tps | 一般任務，性價比高 |
| `MiniMax-M2.5-highspeed` | 100 tps | 一般快速任務 |

詳細 → `references/models.md`

## Reasoning（推理）

M2.7 支援 Interleaved Thinking，可以分開 reasoning 和回覆：

```python
response = requests.post(
    "https://api.minimax.io/v1/chat/completions",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "model": "MiniMax-M2.7",
        "messages": [{"role": "user", "content": "解釋點解天係藍色"}],
        "extra_body": {"reasoning_split": True}
    }
)

data = response.json()
thinking = data["choices"][0]["message"].get("reasoning_details", [])
text = data["choices"][0]["message"]["content"]
```

## Tool Use（工具調用）

M2.7 支援 function calling：

```python
response = requests.post(
    "https://api.minimax.io/v1/chat/completions",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "model": "MiniMax-M2.7",
        "messages": [{"role": "user", "content": "今日香港天氣點？"}],
        "tools": [
            {
                "type": "function",
                "function": {
                    "name": "get_weather",
                    "description": "獲取天氣資訊",
                    "parameters": {
                        "type": "object",
                        "properties": {"location": {"type": "string"}}
                    }
                }
            }
        ]
    }
)
```

## 重要參數

- `temperature`: 範圍 (0.0, 1.0]，建議 1.0
- `n`: 只支援 1
- `max_tokens`: 最大輸出限制

詳細 → `references/api.md`

## Prompt 技巧

**粵語/幼教角色設定**:
```
你係一個為K1（3歲幼兒）設計嘅AI助手。
用簡單粵語回答，每句唔好超過15字。
活潑可愛，用可愛嘅角色名稱。
```

**代碼任務**:
```
用清晰嘅代碼結構，
加註釋解釋，
避免複雜技巧。
```

## 常見用途

| 用途 | Prompt 技巧 |
|------|------------|
| 故事生成 | 指定角色、場景、長度 |
| 問題回答 | 問題清晰，分段回答 |
| 代碼寫作 | 說明需求，指定語言 |
| 分析 | 提供上下文，指定格式 |
