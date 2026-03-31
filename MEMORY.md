# MEMORY.md — Zach Li 長期記憶

_Last updated: 2026-03-29 16:14 by MiniMax-M2.7_

## 2026-03-29 重大進展

- **P2 OCR 完成**（495/495，100%）：從 Google Sheet 提取圖片連結 → 下載 495 張原圖 → OCR 文字 → potrace SVG 轉換（132個圖表）
- **Song-of-Songs 歌詞編輯器** ✅ 完成部署
  - 互動式歌詞時間軸編輯器：https://ai-lish.github.io/Song-of-Songs/lyrics-editor/
  - 師弟(Opus) 修復 3 個 bug，T仔(Sonnet) 測試通過
  - Whisper-timestamped 安裝用於粵語時間軸識別
- **Copilot Agent** (math-lish) 建立 PR #5/#6 修復 review_p2.html 多個問題（SVG、filter、XSS、preview mode）
- **P0 阻斷更新**：n8n、ngrok 仍為阻斷；Song of Songs 音頻已解除（已下載）

## Zach 基本資料

- **名稱：** Zach Li（李老師）
- **語言：** 廣東話主語，英文/中文文字
- **Timezone：** Asia/Hong_Kong (GMT+8)
- **主要 channel：** Telegram (8707814594)
- **Discord：** #總辦公室 (1485954456611717210), #備用 (1483436247618682900)

## 活躍項目

### HKDSE OCR 審核系統
- **Repo/URL：** https://ai-lish.github.io/ai-learning/hkdse/pages/review.html
- **GitHub：** ai-lish/ai-learning (hkdse/ 目錄)
- **狀態：** 🟢 進行中 — P1 完成 (220/220)，**P2 完成 (495/495, 100%)**
- **技術：** LaTeX 格式數學試卷 OCR，Google Apps Script 上傳，potrace SVG 轉換
- **P2 頁面：** https://ai-lish.github.io/ai-learning/hkdse/pages/review_p2.html
- **GAS URL：** https://script.google.com/macros/s/AKfycbyFoti709FMeYoZQAHsbWT7cW7jXp1x5vAaJydJWtVjk6BDiiCGqgbGvFxnoxPvgHNT/exec
- **Drive：** 175Lo70oD0xbHDJYChLXN8qMvqGjJlNcF
- **P1 高信心：** 65.1% → 72.5%｜**P2 高信心：** 65.3%
- **OCR Phase 1-4：** 預處理 ✅ / AI校正 ✅ / Re-OCR ✅ / 分流 ✅
- **P2 完成時間：** 2026-03-29（495題 OCR + 132個 SVG）
- **P2 數據：** 495張原圖 + 132個 SVG 圖表（已上傳 GitHub）
- **新功能：** 審核同步到 GitHub（☁️按鈕）、原圖顯示、SVG 自動載入
- **已知問題：** Tesseract 對數學公式表現差，LaTeX format 已驗證

### ai-learning 數學教學網站
- **Repo：** ai-lish/ai-learning
- **URL：** https://ai-lish.github.io/ai-learning/
- **主要頁面：**
  - Ch17 排列與組合（S5Ch17.html）— 樹狀圖、重做隨機題目、MathJax
  - 考試專區（exam/ 目錄）— 2024-25, 2025-26 年度 S1/S3/S5
  - HKDSE 課題頁面（hkdse/pages/topic-*.html）
- **每週更新：** 書記負責每週建議

### Virtual Office
- **Repo：** ai-lish/virtual-office
- **目標：** Level 3（生產級別）— 自動恢復、安全認證、E2E >80%
- **Server：** http://localhost:18899
- **n8n：** localhost:5678（正常運行）
- **10 項建議：** Thread Templates ✅ / Forum Channel ✅ / Select Menu ✅ / Slash Commands ✅ / GitHub Webhook ✅ / Google Calendar ✅ / Embed 狀態卡片 ✅ / 統計報告 ✅ / Cron Job ✅ / 自動化工作流 ✅
- **Discord ↔ Website Sync：** 4 週計劃進行中
- **Mobile UX：** hamburger + backdrop + grid stacking 改善完成
- **P0 阻斷：** n8n workflow JSON 格式錯誤；ngrok 未認證

### Song of Songs 歌詞影片
- **Repo：** ai-lish/Song-of-Songs
- **URL：** https://github.com/ai-lish/Song-of-Songs
- **狀態：** 🟢 Active — 歌詞編輯器完成，等待插畫
- **歌詞編輯器：** https://ai-lish.github.io/Song-of-Songs/lyrics-editor/
- **工具：** whisper-timestamped（粵語時間軸）、lrc2ass.py、FFmpeg
- **歌曲：** 永活的神（已完成時間軸 v2 版本）
- **插畫：** Gemini 教育版 prompt 已提供，待用戶生成

### 幼兒語文網站 (preschool)
- **Repo：** ai-lish/preschool
- **URL：** https://ai-lish.github.io/preschool/
- **架構：** 首頁 → 科目（語文/數學/英文）→ 週數 → 遊戲頁面
- **第1週內容：** 男/女配對、蝴蝶顏色配對、女字書寫
- **技術：** JS 移至外部 app.js（修復 </script> HTML parser bug）

### Homework Duty System
- **功課追蹤系統**
- **狀態：** 已建立，進行中

### lsc-ole-s1-2026 實地考察報名系統
- **GitHub Pages：** 曾因 node_modules 導致 build 失敗，已修復
- **狀態：** 正常運作

### Math Week 2026
- **數學週活動**
- **狀態：** 進行中

### Teacher Dev Day
- **教師專業日**
- **狀態：** 進行中

### Exam Practice
- **考試練習系統**
- **狀態：** 進行中

### ClawTeam (HKUDS Multi-Agent Framework)
- **位置：** ~/.openclaw/workspace/ClawTeam/
- **用途：** HKUDS 多代理協調框架，可作為 OpenClaw agents worker
- **功能：** spawn workers、git worktrees、任務追蹤、inbox messaging、board monitoring

## 2026-03-31 MiniMax 粵語語音發現

- **重要發現**：MiniMax 官方「粵語音色」(ID 59-64) **並非真正 Cantonese TTS**，而是 Mandarin TTS + 港式口音
- **實測驗證**：用 Whisper 識別輸出，發現大部分輸出為普通話或走音
- **唯一可用**：`Cantonese_ProfessionalHost（M)`（ID 61 男聲）勉強接近粵語
- **建議**：短期繼續用 ID 61；中期研究 Voice Clone；長期搵其他真正支援粵語的 TTS
- **Skill 已更新**：包含質量警告、檢查流程、測試記錄

## 技術環境

- **硬件：** Mac mini (arm64), macOS 25.2.0, Node v25.6.1
- **GitHub Copilot：** 訂閱有多模型
  - `github-copilot/claude-opus-4.6` (977k) — T0 重型重構
  - `github-copilot/claude-sonnet-4.6` (977k) — T1 複雜 coding
  - `github-copilot/gpt-5-mini` (125k) — T2 一般任務
  - `github-copilot/gpt-4o` (63k) — T3 輕量
  - `github-copilot/gemini-3.1-pro-preview` (125k) — 多模態
  - `minimax/MiniMax-M2.7` — default model for 日常
- **ngrok：** /opt/homebrew/bin/ngrok，已安裝但未認證 (ERR_NGROK_4018)
- **cloudflared：** 未安裝
- **Copilot token：** 暫存 .copilot-token.json，需遷移到 Keychain/Vault

## Agent 角色定義

| Agent | 角色 | 擅長 |
|-------|------|------|
| 師弟 (Builder) | 寫 code、架構、bug 修復 | 複雜代碼任務 |
| T仔 (Reviewer) | 測試、code review、監控 | 質量把關 |
| 小詩 (Self-study) | 一次性分析、評估 | 研究、評估 |
| 書記 (Secretary) | 文件、筆記、每週建議 | 文檔整理 |
| 畫家 (Designer) | 視覺設計 | 背景素材 |

## 工作模式

- **Framework 文件：**
  - `MEMORY.md` — 長期記憶（每週日 08:00 更新）
  - `ROUTING.md` — Channel routing + Model 分層 + Report 格式
  - `projects/*/BRIEF.md` — 各項目簡報（subagent 起動前複製 context）
- **Model 分層：** 任務前問 Zach 想用邊個 model（T0-T3）
- **Subagent report 格式：** 必須使用標準格式（見 ROUTING.md）
- **Channel routing：** 邊度問，邊度答（發起 channel）

## 重要經驗教訓

1. **n8n workflow JSON** 格式同 UI export 唔同 — 必須用 API export
2. **Tesseract** 對數學公式表現差 — LaTeX format 已驗證可用
3. **</script>** HTML parser bug — JS 必須移到外部檔案
4. **Subagent 超時** 常見 — 複雜任務要拆細
5. **Discord groupPolicy** 外層設定會被 accounts.default 覆蓋
6. **Daily log** 唔好直接 dump raw output — 要 review 再寫

## 決策記錄

| 日期 | 決定 | 原因 |
|------|------|------|
| 2026-03-28 | Default model 改為 MiniMax-M2.7 | 慳 token |
| 2026-03-29 | Subagent model 由用戶選擇 | 模型有多個，各有擅長 |
| 2026-03-22 | 每個 project 擁有自己 Discord Server | 而非同一 Virtual Office 內的 channels |
| 2026-03-20 | Discord groupPolicy 改為 allowlist | 安全性 |
| 2026-03-18 | 所有 agents 搬至 workspace/agents/ | 統一管理 |

## P0 阻斷

1. ~~n8n workflow JSON 格式錯誤~~ → ❌ 唔需要，已刪除整個 workflow（2026-03-31）
2. ~~ngrok authtoken 未認證~~ → ❌ 不需要，已刪除 ngrok/cloudflared（2026-03-31）
3. Song of Songs 音頻檔案未提供 (Step1_latest.m4a + LRC)
4. Copilot token 安全存儲未完成

## Copilot Token 追蹤方案決定

- **方案 A（CSV）✓ 已採用** — MiniMax API 被 Cloudflare 封鎖，繼續用 CSV cron 方式
- Cron 時間：03:00 / 07:00 / 12:00 / 17:00 / 22:00 從 Google Drive 下載 export_bill_*.csv

## 定期任務 (Heartbeat)

- **每週：** 讀取 memory/ 日誌，更新 MEMORY.md
- **每日：** 早晨簡報（電郵、日曆、待辦）
- **每 15 分鐘：** Virtual Office GitHub Pages 監控
