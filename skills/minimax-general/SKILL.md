---
name: minimax-general
description: MiniMax platform overview and capabilities for Hong Kong education projects. Use when answering questions about MiniMax services, planning multi-modal AI workflows, or choosing the right MiniMax model for a task. Triggered by: MiniMax, 平台功能, 多模態, 整合規劃.
---

# MiniMax General Skill

MiniMax 平台完整功能概覽，協助選擇合適的模型和服務。

## 平台概覽

MiniMax 係一個多模態 AI 平台，支援：
- 💬 **文字生成** (M2.7, M2.5, M2.1)
- 🎙️ **語音合成** (Speech 2.8, 2.6, 02)
- 🖼️ **圖像生成** (Image-01)
- 🎬 **影片生成** (Hailuo)
- 🎵 **音樂生成** (Music)
- 🔧 **Voice Clone**

## 快速決策指南

### 任務 → 推薦模型

| 任務 | 模型 | 備註 |
|------|------|------|
| 複雜推理/分析 | MiniMax-M2.7 | 60 tps |
| 快速對話 | MiniMax-M2.5 | 性價比高 |
| 粵語語音合成 | speech-2.8-hd | `Chinese,Yue` boost |
| 卡通圖像 | image-01 | Character Reference |
| 角色配音 | Voice Clone | 5秒音頻克隆 |

### 成本優化

| 需求 | 推薦 |
|------|------|
| 每日大量請求 | M2.5 (比 M2.7 便宜) |
| 高質量語音 | speech-2.8-hd |
| 日常圖像 | image-01 ($0.0035/張) |
| 快速原型 | highspeed 版本 |

## 常用組合

### 幼教項目（Preschool）

```
文字腳本 → M2.7 生成故事內容
       ↓
語音合成 → speech-2.8-hd 朗讀
       ↓
圖像生成 → image-01 + Character Reference 角色圖
       ↓
視頻製作 → Hailuo (Max 用戶)
```

### 工作流程

1. **內容創作**: M2.7 寫故事/腳本
2. **語音錄製**: speech-2.8-hd 粵語朗讀
3. **圖像素材**: image-01 生成角色和場景
4. **後期製作**: FFmpeg 合成

## API Endpoint 總覽

| 功能 | Endpoint |
|------|----------|
| Chat | `POST https://api.minimax.io/v1/chat/completions` |
| TTS | `POST https://api.minimax.io/v1/t2a_v2` |
| Image | `POST https://api.minimax.io/v1/image_generation` |
| Voice Clone | `POST https://api.minimax.io/v1/voice_clone` |
| File Upload | `POST https://api.minimax.io/v1/files/upload` |

詳細用法：
- Text/Reasoning → `minimax-m2-7` skill
- Speech/TTS → `minimax-speech` skill
- Image → `minimax-image` skill

## 驗證方式

所有 API 都使用 Bearer Token：
```
Authorization: Bearer {API_KEY}
```

API Key 獲取：https://platform.minimax.io/user-center/basic-information/interface-key

## 常見問題

**Q: Plus vs Max 點揀？**
A: 日常使用 Plus 夠用（50圖/日，4000字 speech/日）。Max 適合需要 Hailuo 視頻或 Music 生成。

**Q: 點樣保持角色一致性？**
A: Image-01 用 `subject_reference`；Voice Clone 用同一個 voice_id。

**Q: 語音可以clone邊個聲音？**
A: 任何你有合法版權的音頻。樣本需 10秒 - 5分鐘。
