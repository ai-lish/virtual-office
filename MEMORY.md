# MEMORY.md — Zach Li 長期記憶

_Last updated: 2026-04-07 by Weekly Dream_

## 🔧 分類 prefix：👤用戶 💡經驗 📦項目 🔧工具（軟上限≤150行，過時歸檔）

---

## 👤 Zach 基本資料

- 數學老師，廣東話主語，Telegram (8707814594)
- Discord：#總辦公室 (1485954456611717210), #備用 (1483436247618682900)
- 主要 channel：Telegram；匯報要精準，唔好求多

## 💡 Feedback 累積（重要！）

- **清理前必先 grep HTML references**（04-05）：唔好假設係廢料，大量刪除要分批
- **改 cron 前先讀 script**（04-05）：了解 window mapping 邏輯再改
- **匯報方向**（04-04）：Zach 無回應 = 內容唔適合；HEARTBEAT 有事先報，冇事 HEARTBEAT_OK
- **刪OCR/素材前問**：要確認 GitHub/HTML 冇 reference 先好刪

## 📦 活躍項目

### ai-learning（HKDSE數學教學）— P1 主線
- Repo: ai-lish/ai-learning | URL: https://ai-lish.github.io/ai-learning/
- HKDSE OCR ✅ P1(220/220) + P2(495/495,100%)；GAS: ai-lish/ai-learning
- 仿題 Gist: https://gist.github.com/ai-lish/3d84010ebf901d7f101419794f987368
- exam/README.md 製作次序（8步）：PDF→OCR→JSON→review→practice→index→p1/p2→nav→測試

### preschool（聖經故事幼兒教育）— P1 主線
- Repo: ai-lish/preschool | URL: https://ai-lish.github.io/preschool/
- 2026-04-01 方向：由顏色/數數 → 聖經故事幼教（創世紀 + 品格）
- 遊戲狀態：七日創造✅ | 挪亞方舟✅(Day2整合記憶遊戲) | 摩西過紅海✅ | 耶穌降生🔄
- 04-07：Day 2整合記憶配對遊戲；Day 6整合伊甸園互動(跳/拍手/跳舞)+水果配對
- 待建：大衛與歌利亞、耶穌復活、五餅二魚、浪子回頭
- Google Sheet: 1Qk84gFeBEG2gTEmmM6wOz8PgI226hKL7jtFkpoTOhw0

### Virtual Office
- Repo: ai-lish/virtual-office | Server: http://localhost:18899
- Dashboard ✅ smoke test pass；PR #10 regression reverted ✅
- 目標：Level 3（自動恢復、安全認證、E2E>80%）
- 待：README.md + MiniMax UI gist commit/push

### Song of Songs
- 歌詞編輯器 ✅ | 等音頻(Step1_latest.m4a + LRC)

## 🔧 技術基礎設施

| 項目 | 狀態 |
|------|------|
| Ollama embeddings | ✅ nomic-embed-text (768d)，memory_search 正常，本地 |
| Secrets Vault | ✅ ~/.openclaw/secrets.json，copilot/minimax/gemini key 存入 |
| MiniMax Copilot CSV Cron | ✅ 每5小時從 Drive 下載，寫入 quota-history.json |
| Claude Code v2.1.91 | ✅ 師弟用 Copilot Opus，T仔用 Claude Sonnet |
| Gemini CLI v0.31.0 | ✅ 小詩用 Free Tier API key |

## MiniMax 配額（Coding Plan Plus）

| Model | 限額 | 重置 |
|-------|------|------|
| M2.7 | 4,500 req/5hrs | 滚动窗口 |
| Speech 2.8-HD | 4,000 字/日 | UTC 00:00 |
| Image-01 | 50 張/日 | UTC 00:00 |

- 粵語語音：唯一可用 ID 61 (`Cantonese_ProfessionalHost(M)`)，其餘並非真正Cantonese

## Agent 角色

| Agent | Model | 用途 |
|-------|-------|------|
| 我 (協調) | MiniMax M2.7 | 協調、日常對話 |
| 師弟 (Builder) | Claude Code (Copilot Opus) | 寫 code、執行 |
| T仔 (Reviewer) | Copilot Sonnet 4.6 | 測試、code review |
| 小詩 (Research) | Gemini CLI | 研究、分析 |

## P0 阻斷

1. Song of Songs 音頻未提供 (Step1_latest.m4a + LRC)
2. Google Sheets OAuth 過期 → Zach 做 `gog auth` 重新授權
3. Virtual Office README + gist 未 commit/push
4. Cron delivery.to 未設 Telegram chatId

## Cron Schedule（重要）

| Job | HKT | Status |
|-----|-----|--------|
| Quota 快照 | 03/07/12/17/22時 | ✅ ok |
| 早晨簡報 08:00 | 每日 | ✅ ok |
| 晚間回顧 23:00 | 每日 | ✅ ok |
| Memory Review (每3日 10:00) | 毎3日 | ✅ ok |
| Memory System Review (週日 10:00) | 每週日 | ✅ ok (fixed 04-07) |
| 小詩自學 03:00 | 每日 | ✅ ok |
| Daily Archive 02:00 | 每日 | ✅ ok |

## 決策記錄

| 日期 | 決定 | 原因 |
|------|------|------|
| 2026-04-07 | Weekly Memory Review cron 修復 | delivery.channel=telegram |
| 2026-04-05 | OCR 誤刪後從 git 恢復 | 刪前未 grep references |
| 2026-04-04 | 混合模式：我協調+師弟執行 | Claude Code 機械式，我人性化 |
| 2026-04-03 | MiniMax 做圖像；M2.7 做日常 | 善用配額 |
| 2026-04-01 | Memory System Phase 1 完成 | emoji taxonomy + size control |
| 2026-03-28 | Default model 改 MiniMax-M2.7 | 慳 token |
