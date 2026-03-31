# MiniMax Image-01 API 參數詳解

## 基本參數

### model
- **選項**: `image-01`, `image-01-live`（實時版）
- **建議**: 用 `image-01`（標準版）

### prompt
- **長度**: 最多 1500 字元
- **語言**: 英文效果最佳（但中文也可用）
- **技巧**: 
  - 具體描述事物
  - 指定風格關鍵詞
  - 加入 quality tags

### aspect_ratio
| 比例 | 像素 | 適用場景 |
|------|------|---------|
| `1:1` | 1024x1024 | 角色頭像、物品圖 |
| `16:9` | 1280x720 | 橫向場景、橫幅 |
| `4:3` | 1152x864 | 標準橫向 |
| `3:2` | 1248x832 | 風景 |
| `2:3` | 832x1248 | 縱向人物 |
| `3:4` | 864x1152 | 縱向場景 |
| `9:16` | 720x1280 | 手機橫幅 |
| `21:9` | 1344x576 | 超寬全景 |

### width / height
- **範圍**: 512 - 2048（需能被 8 整除）
- **優先級**: 如果同時設定 `aspect_ratio`，優先使用 `aspect_ratio`

### response_format
- **`url`**: 返回 URL（24小時有效）
- **`base64`**: 返回 base64 編碼（永久，但回應較大）

### n
- **範圍**: 1 - 9
- **建議**: 生成多個再揀最好嘅

### seed
- **用途**: 相同 seed + 相同 prompt = 相同結果
- **用途**: 想要可重現結果時設定

### prompt_optimizer
- **功能**: 自動優化 prompt
- **建議**: 保持 `false`，自己寫 prompt 更精確

## Subject Reference（角色一致性）

```python
"subject_reference": [
    {
        "type": "character",
        "image_file": "https://example.com/reference.jpg"
    }
]
```

**限制**:
- 目前只支援 `character`（人物肖像）
- 圖片要求: JPG/PNG，少於 10MB
- 建議: 正面肖像效果最好

## 完整請求範例

```python
import requests

response = requests.post(
    "https://api.minimax.io/v1/image_generation",
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    },
    json={
        "model": "image-01",
        "prompt": "Cute cartoon panda BoBo, friendly smile, red bow tie, standing in colorful forest, K1 preschool style, vector art",
        "aspect_ratio": "16:9",
        "response_format": "url",
        "n": 4,  # 生成4張
        "seed": 12345  # 可重現
    }
)

data = response.json()
if data["base_resp"]["status_code"] == 0:
    images = data["data"]["image_urls"]
    for i, url in enumerate(images):
        print(f"Image {i+1}: {url}")
else:
    print(f"Error: {data['base_resp']['status_msg']}")
```

## 錯誤碼

| 錯誤碼 | 意思 | 解決方法 |
|--------|------|---------|
| `0` | 成功 | — |
| `1002` | Rate limit | 等幾秒再試 |
| `1004` | API Key 錯誤 | 檢查 key |
| `1008` | 余額不足 | 充值 |
| `1026` | 敏感內容 | 修改 prompt |
| `2013` | 參數錯誤 | 檢查格式 |

## 實用技巧

### 提高質量
1. 加入 quality tags: `high quality, detailed, beautiful`
2. 指定風格: `vector art, illustration, digital art`
3. 描述光線: `soft lighting, warm colors`
4. 避免: `realistic, photorealistic`

### 角色一致性
1. 先用 `subject_reference` 生成一張滿意嘅角色圖
2. 之後所有場景都用同一張圖作為 reference
3. 每次 prompt 加入 `same character` 強調

### 批次生成
```python
# 生成多個變體
for i in range(3):
    response = requests.post(
        "https://api.minimax.io/v1/image_generation",
        headers={"Authorization": f"Bearer {API_KEY}"},
        json={
            "model": "image-01",
            "prompt": prompts[i],
            "aspect_ratio": "1:1",
            "n": 2
        }
    )
```
