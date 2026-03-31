---
name: minimax-image
description: MiniMax Image-01 text-to-image and image-to-image generation for K1 preschool educational content. Use when generating cartoon character images, children's educational illustrations, character consistent series, scene backgrounds, or items for preschool learning apps. Triggered by: generate image, 圖像生成, cartoon character, 卡通角色, preschool illustration, 幼教插圖, character reference, 角色一致性, MiniMax image.
---

# MiniMax Image Skill

兒童幼教圖像生成，支援角色一致性管理。

## 快速開始

**Endpoint**: `POST https://api.minimax.io/v1/image_generation`

```python
import requests

response = requests.post(
    "https://api.minimax.io/v1/image_generation",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "model": "image-01",
        "prompt": "Cute cartoon panda character named BoBo, friendly smile, colorful forest background, soft pastel colors, K1 preschool style, clean vector art",
        "aspect_ratio": "1:1",
        "response_format": "url"
    }
)
images = response.json()["data"]["image_urls"]
```

## 角色生成流程（重要）

**統一角色風格**用 `subject_reference`：

1. 先生成一張滿意的角色原圖
2. 用原圖作為 `subject_reference` 生成不同場景

```python
# 用 Character Reference 保持角色一致
response = requests.post(
    "https://api.minimax.io/v1/image_generation",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "model": "image-01",
        "prompt": "Same cartoon panda character BoBo, wearing a red bow tie, standing in a flower garden, waving hand, happy expression",
        "aspect_ratio": "16:9",
        "subject_reference": [
            {
                "type": "character",
                "image_file": "https://之前生成的角色原圖URL.jpg"
            }
        ]
    }
)
```

**Key Point**: `subject_reference` 確保同一人物在不同場景保持一致。

## 參數參考

詳細參數 → `references/parameters.md`

| 參數 | 說明 | 預設值 |
|------|------|--------|
| `model` | `image-01` 或 `image-01-live` | `image-01` |
| `aspect_ratio` | `1:1` / `16:9` / `4:3` / `9:16` 等 | `1:1` |
| `n` | 一次生成 1-9 張 | `1` |
| `seed` | 相同 seed = 可重現結果 | 隨機 |
| `prompt_optimizer` | 自動優化 prompt | `false` |

## 兒童卡通風格 Prompt 技巧

詳細 prompt 範例 → `references/prompts.md`

**必備關鍵詞**:
- `cute cartoon style`
- `soft pastel colors`
- `children's educational app`
- `clean vector art`
- `friendly expression`

**避免**:
- realistic, photorealistic
- 3d render
- dark theme, scary

**Aspect Ratio 選擇**:
- `1:1` — 角色頭像、物品
- `16:9` — 橫向場景
- `9:16` — 橫向長圖

## 應用場景

| 用途 | Prompt 關鍵詞 | Aspect Ratio |
|------|--------------|--------------|
| 角色原圖 | full body, standing pose, character design | 1:1 |
| 場景背景 | landscape, forest scene, colorful background | 16:9 |
| 物品圖 | clean white background, product shot | 1:1 |
| 故事插圖 | action pose, story scene | 16:9 |
