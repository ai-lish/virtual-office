# Voice Clone 完整流程

## 概述

Voice Clone 讓你用少量音頻（約10秒）克隆一個聲音，然後用該聲音生成任何文字的語音。

**限制**:
- 克隆聲音必須在 7天內使用，否則刪除
- 每次克隆需要付費（$1.5/聲音）

## 步驟 1: 上傳音頻

```python
import requests

# 上傳用於克隆的音頻
upload_response = requests.post(
    "https://api.minimax.io/v1/files/upload",
    headers={"Authorization": f"Bearer {API_KEY}"},
    files={"file": open("voice_sample.mp3", "rb")},
    data={"purpose": "voice_clone"}
)

file_id = upload_response.json()["file"]["file_id"]
print(f"File ID: {file_id}")
```

**音頻要求**:
- 格式: mp3, m4a, wav
- 時長: 10秒 - 5分鐘
- 大小: ≤ 20MB
- 建議: 清晰、無背景噪音

## 步驟 2: 克隆聲音

```python
clone_response = requests.post(
    "https://api.minimax.io/v1/voice_clone",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "file_id": file_id,
        "voice_id": "my_voice_001",
        "text": "示範文字，測試聲音克隆效果",
        "model": "speech-2.8-hd"
    }
)

print(clone_response.json())
```

**參數**:
- `voice_id`: 自訂名稱（8-256字符，英文開頭，可用 `-` 和 `_`）
- `text`: 可選，生成預覽音頻（收費）
- `model`: 建議 `speech-2.8-hd`

## 步驟 3: 使用克隆聲音

```python
response = requests.post(
    "https://api.minimax.io/v1/t2a_v2",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "model": "speech-2.8-hd",
        "text": "你好！呢個係用我哋克隆聲音生成嘅語音！",
        "voice_setting": {
            "voice_id": "my_voice_001",  # 你克隆的 voice_id
            "speed": 1.0,
            "pitch": 0
        },
        "language_boost": "Chinese,Yue"
    }
)
```

## 用於幼教項目

假設你有一段理想的"波波"聲音:

1. **錄製樣本**: 波波說話 10-30秒，清晰、無噪音
2. **上傳 + 克隆**: 獲得 `bobo_voice` voice_id
3. **生成所有波波對話**: 用同一個聲音，保持角色一致性

```python
# 所有波波的對話都用同一個 voice_id
bobo_voice_id = "bobo_voice"

dialogues = [
    "你好呀！我係波波！歡迎嚟到森林派對！",
    "你叫咩名呀？",
    "你好叻呀！",
    "我哋一齊去探險啦！"
]

for text in dialogues:
    generate_speech(
        text=text,
        voice_id=bobo_voice_id,
        model="speech-2.8-hd"
    )
```

## 提升克隆質量

**加入 prompt_audio** (可選但推薦):

```python
# 上傳額外的參考音頻（<8秒）+ 對應文字
prompt_upload = requests.post(
    "https://api.minimax.io/v1/files/upload",
    headers={"Authorization": f"Bearer {API_KEY}"},
    files={"file": open("short_sample.mp3", "rb")},
    data={"purpose": "prompt_audio"}
)
prompt_file_id = prompt_upload.json()["file"]["file_id"]

# Clone 時加入 prompt
clone_response = requests.post(
    "https://api.minimax.io/v1/voice_clone",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "file_id": main_file_id,
        "voice_id": "my_voice",
        "clone_prompt": {
            "prompt_audio": prompt_file_id,
            "prompt_text": "這個聲音聽起來很自然，很愉快。"
        },
        "model": "speech-2.8-hd"
    }
)
```

## 常見問題

**Q: 克隆聲音可以永久使用嗎？**
A: 必須在 7天內使用 T2A API，否則聲音會被刪除。

**Q: 可以克隆邊個的聲音？**
A: 僅限合法授權的音頻，需帳戶驗證狀態。

**Q: 克隆費用係多少？**
A: $1.5 美元/每個聲音（首次使用時計費）。

**Q: 如何保持克隆聲音的質量？**
A: 
- 錄音清晰、無迴音
- 避免背景噪音
- 說話自然、語速適中
- 最好包含完整句子
