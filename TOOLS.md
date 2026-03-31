# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

## 圖像生成分工

### 畫家 (Designer) Agent
- 負責所有 AI 圖像生成工作
- 使用 MiniMax API 生成幼兒教育圖像
- Prompt 工程 + 質量控制

### MiniMax API
- Group ID: 2028908157014651652
- API Key: $MINIMAX_API_KEY (環境變數)
- Google Drive 資料夾: 1IozaTMTf5eULOSLNkZG6vVqndTx4gCon

### 圖像需求
- 風格: Cute kawaii children's book illustration
- 比例: 1:1 (人物), 4:3 (場景)
- 主題: 紅黃藍三原色、形狀、數數、身體部位

## MiniMax 工具設定

### TTS (語音生成)
- Provider: MiniMax Speech 2.8-HD
- Model: `speech-2.8-hd` ✅ (NOT turbo/t6)
- Plus Plan: 4,000 字/日
- Voice ID: Chinese_Mandarin_HK_Flight_Attendant
- 語法: <#1#> 停頓, (laughs) 語氣詞, emotion: happy

### Image (圖像生成)
- Provider: MiniMax Image-01
- Model: `minimax/image-01`
- Plus Plan: 50 張/日

### 用量查詢
```bash
curl -s --location 'https://api.minimax.io/v1/api/openplatform/coding_plan/remains' \
--header 'Authorization: Bearer <API_KEY>'
```

## 現有 Skills (OpenClaw)

| Skill | 用途 |
|-------|------|
| minimax-speech | TTS 語音生成 |
| minimax-image | 圖像生成 |
| minimax-m2-7 | 文字模型 |
| minimax-general | 平台概覽 |
| minimax-quota | 用量查詢 |
