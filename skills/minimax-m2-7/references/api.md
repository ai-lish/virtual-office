# MiniMax M2.7 API 詳細參數

## Chat Completions API

**Endpoint**: `POST https://api.minimax.io/v1/chat/completions`

### Request Body

```python
{
    "model": "MiniMax-M2.7",  # 必填
    "messages": [              # 必填
        {"role": "system", "content": "系統提示"},
        {"role": "user", "content": "用戶輸入"}
    ],
    "temperature": 1.0,        # 建議 1.0，範圍 (0.0, 1.0]
    "max_tokens": 2048,        # 最大輸出 tokens
    "top_p": 0.95,             # 採樣策略
    "stream": False,            # 是否流式輸出
    "stop": ["STOP"],          # 停止符
    "extra_body": {}           # 額外參數
}
```

### 回應格式

```python
{
    "id": "xxx",
    "model": "MiniMax-M2.7",
    "choices": [
        {
            "message": {
                "role": "assistant",
                "content": "回覆內容",
                "reasoning_details": [...]  # 當 reasoning_split=True
            },
            "finish_reason": "stop"
        }
    ],
    "usage": {
        "prompt_tokens": 100,
        "completion_tokens": 200,
        "total_tokens": 300
    }
}
```

## Interleaved Thinking

M2.7 可以分開 reasoning 和回覆：

```python
# 開啟 reasoning split
{
    "extra_body": {
        "reasoning_split": True
    }
}
```

### 回應中的 reasoning_details

```python
{
    "choices": [{
        "message": {
            "content": "最終回覆",
            "reasoning_details": [
                {"type": "text", "text": "推理過程..."}
            ]
        }
    }]
}
```

**重要**: 完整保留 `reasoning_details` 用於多輪對話。

## Tool Use (Function Calling)

### 工具定義

```python
{
    "tools": [
        {
            "type": "function",
            "function": {
                "name": "function_name",
                "description": "函數描述",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "param_name": {
                            "type": "string",
                            "description": "參數描述"
                        }
                    },
                    "required": ["param_name"]
                }
            }
        }
    ]
}
```

### 工具回應格式

```python
{
    "choices": [{
        "message": {
            "content": None,
            "tool_calls": [
                {
                    "id": "call_xxx",
                    "type": "function",
                    "function": {
                        "name": "get_weather",
                        "arguments": "{\"location\": \"香港\"}"
                    }
                }
            ]
        }
    }]
}
```

## 注意事項

1. `temperature` 範圍是 (0.0, 1.0]，**不包含 0.0**
2. `n` 只支援 1
3. `function_call` 已棄用，用 `tools` 代替
4. 某些參數會被忽略：`presence_penalty`, `frequency_penalty`, `logit_bias`
5. 圖片和音頻輸入**暫不支援**
