# MiniMax Models 完整列表

## Text Models

| Model | Context | 速度 (tps) | 適合場景 |
|-------|---------|-----------|---------|
| MiniMax-M2.7 | 204,800 | ~60 | 複雜推理、代碼、重型任務 |
| MiniMax-M2.7-highspeed | 204,800 | ~100 | 快速推理響應 |
| MiniMax-M2.5 | 204,800 | ~60 | 一般複雜任務 |
| MiniMax-M2.5-highspeed | 204,800 | ~100 | 快速一般任務 |
| MiniMax-M2.1 | 204,800 | ~60 | 多語言編程 |
| MiniMax-M2.1-highspeed | 204,800 | ~100 | 快速多語言 |
| MiniMax-M2 | 204,800 | — | Agent 能力、推理 |

*tps = tokens per second*

## 語音模型 (Speech)

| Model | 質量 | 速度 | 語言 |
|-------|------|------|------|
| speech-2.8-hd | 最高 | 慢 | 40+ |
| speech-2.8-turbo | 高 | 快 | 40+ |
| speech-2.6-hd | 高 | 中 | 40+ |
| speech-2.6-turbo | 中 | 快 | 40+ |
| speech-02-hd | 高 | 中 | 多語言 |
| speech-02-turbo | 中 | 快 | 多語言 |

## 圖像模型 (Image)

| Model | 解析度 | 特色 |
|-------|--------|------|
| image-01 | 1024x1024+ | 高質量，Character Reference |
| image-01-live | 實時 | 低延遲 |

## 視頻模型 (Video)

| Model | 解析度 | 時長 |
|-------|--------|------|
| MiniMax-Hailuo-2.3 | 768P | 6s |
| MiniMax-Hailuo-2.3-Fast | 768P | 6s（更快）|

## 音樂模型 (Music)

| Model | 時長 |
|-------|------|
| Music-2.5 | ≤5分鐘/首 |

## Token Plan 配額（Plus Plan）

| 資源 | 每日/月 | 限額 |
|------|---------|------|
| M2.7 requests | 4,500 / 5hrs |滾動 |
| Speech 2.8 | 4,000 字/日 | 每日 |
| Image-01 | 50 張/日 | 每日 |
| Hailuo 視頻 | — | Max only |
| Music | — | Max only |

## 模型選擇指南

**需要推理複雜問題** → M2.7 或 M2.7-highspeed

**快速一般問答** → M2.5-highspeed

**代碼任務** → M2.1 系列

**語音合成** → speech-2.8-hd（質量最高）

**圖像生成** → image-01 + Character Reference

**影片生成** → Hailuo-2.3-Fast（Max 用戶）
