# MiniMax Speech Skill

語音生成和聲音克隆 API，專為幼教項目設計。

## ⚠️ 重要：正確 Model Name

**Plus Plan 必須用 `speech-2.8-hd`**

以下 model name 全部 **不支持**：
- `speech-2.8-turbo` ❌
- `speech-2.6-hd` ❌
- `speech-02-turbo` ❌

## 快速開始

**T2A Endpoint**: `POST https://api.minimax.io/v1/t2a_v2`

```python
import requests

response = requests.post(
    "https://api.minimax.io/v1/t2a_v2",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "model": "speech-2.8-hd",  # ✅ 正確（Plus Plan）
        "text": "你好，我係波波！",
        "stream": False,
        "voice_setting": {
            "voice_id": "Cantonese_ProfessionalHost（M)",  # 粵語音色
            "speed": 0.9,
            "vol": 1.0,
            "pitch": 0
        },
        "output_format": "url"
    }
)
# 回傳 audio_url，下載變成 MP3
```

## ⚠️ 粵語語音質量警告

**已確認問題（2026-03-31）：**

MiniMax 官方列出的「粵語音色」(ID 59-64) **並非真正的 Cantonese TTS**，而是：
- **Mandarin TTS + 港式口音**
- 當輸入真正粵語口語字眼時，會錯誤轉換為普通話或胡亂發音

**實測結果：**

| 測試句子 | 理想輸出 | 實際輸出（部分語音） |
|----------|----------|---------------------|
| 你食咗飯未呀？ | ✅ 粵語 | 你吃了飯沒有（普通話）|
| 不如一齊去街啦！ | ✅ 粵語 | 不如一起去驚啦（走音）|

**僅有的例外：**
- `Cantonese_ProfessionalHost（M)`（ID 61 男聲）勉強接近粵語，但仍有口音

**建議：**
1. 使用前**必須逐個檢查**生成的音頻
2. 考慮使用 **Voice Clone** 獲得真正粵語
3. 或者接受帶口音的輸出，用於非核心場景

## Voice ID 參考

**完整語音列表** → `references/voice-list.md`

### ✅ 官方粵語音色（官方列表）

| Voice ID | 音色名稱 | 性別 | 建議用途 | 質量 |
|----------|----------|------|----------|------|
| `Cantonese_ProfessionalHost（F)` | 專業女主持 | 女 | 正式場合 | ⚠️ 普通話口音 |
| `Cantonese_GentleLady` | 溫柔女聲 | 女 | 溫柔對話 | ⚠️ 普通話口音 |
| `Cantonese_ProfessionalHost（M)` | 專業男主持 | 男 | 正式場合 | ✅ 較接近粵語 |
| `Cantonese_PlayfulMan` | 活潑男聲 | 男 | 俏皮角色 | ❌ 嚴重走音 |
| `Cantonese_CuteGirl` | 可愛女孩 | 女 | 兒童角色 | ❌ 嚴重走音 |
| `Cantonese_KindWoman` | 善良女聲 | 女 | 溫柔關懷 | ⚠️ 普通話口音 |

### 其他已驗證音色

| Voice ID | 語言 | 備註 |
|----------|------|------|
| `male-qn-qingse` | 普通話 | 青澀青年男聲 |

## 語法標記

**暫停** (控制朗讀節奏):
```
text: "你好，我叫波波。<#1#>很高興認識你！<#0.5#>一齊去冒險啦！"
```

**語氣詞** (speech-2.8 only):
```
text: "你好呀！(laughs) 我好開心見到你！(sighs)"
```
支援: (laughs), (chuckle), (coughs), (sighs), (gasps), (sniffs), (sneezes), (applause), (crying)

**情緒** (emotion):
```json
"emotion": "happy"
```
選項: neutral, happy, sad, angry, fearful, surprised, disgusted

## Voice Clone 流程

1. 上傳音頻 → `POST /v1/files/upload` (purpose: voice_clone)
2. 克隆聲音 → `POST /v1/voice_clone`

詳細步驟 → `references/voice-clone.md`

## ⚠️ 必做：生成後質量檢查流程

**每個音頻生成後，必須：**

1. **下載音頻檔案**
2. **用 Whisper 驗證發音**（如果無法親自聆聽）：
   ```bash
   KMP_DUPLICATE_LIB_OK=TRUE whisper <audio_file>.mp3 --language Chinese --model small
   ```
3. **對照原文**，確認：
   - 語言正確（粵語 vs 普通話）
   - 發音正確（特別是粵語特有詞彙如「係」「咁」「唔」「喇」）
   - 語氣自然
4. **不合規格的音頻需重新生成或放棄使用**

## 應用場景

**粵語角色對話（示範）：**
```json
{
    "model": "speech-2.8-hd",
    "text": "你好呀！我係波波！歡迎嚟到森林派對！你叫咩名呀？",
    "voice_setting": {"voice_id": "Cantonese_ProfessionalHost（M)", "speed": 0.85},
    "emotion": "happy"
}
```

**粵語男聲角色：**
```json
{
    "model": "speech-2.8-hd",
    "text": "我係跳跳！我鍾意跳嚟跳去！",
    "voice_setting": {"voice_id": "Cantonese_PlayfulMan", "speed": 0.9}
}
```

**故事朗讀：**
```json
{
    "model": "speech-2.8-hd",
    "text": "森林入面有一個歡迎派對，<#0.5#>動物朋友都想認識新朋友！<#1#>小熊貓波波係派對主持人。",
    "voice_setting": {"voice_id": "Cantonese_ProfessionalHost（F)", "speed": 0.8}
}
```

## 兒童語音技巧

- speed 建議 0.8-0.9（慢啲，清清楚楚）
- 句子要短，每句唔好超過 20 字
- 用 `<#x#>` 控制停頓，方便節奏
- 語氣詞可以加強生動感
- 情緒設定配合角色性格
- **⚠️ 粵語音色質量不穩定，生成後必須檢查**
