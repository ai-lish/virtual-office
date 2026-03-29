# Virtual Office BRIEF

## 目標
將 Virtual Office 打造成 Level 3 生產級別系統 — 自動恢復、安全認證、E2E 測試覆蓋率 >80%。

## 狀態
🟡 Active

## 背景
- **Repo:** ai-lish/virtual-office
- **URL:** https://ai-lish.github.io/virtual-office/（GitHub Pages）
- **本地:** http://localhost:18899
- **Discord:** #總辦公室 (1485954456611717210)
- **技術栈:** Node.js, HTML/CSS/JS, n8n, ngrok, Playwright E2E

## 當前進度
- [x] 10項 Discord 建議全部完成（Thread Templates / Forum / Select Menu / Slash Commands / GitHub Webhook / Google Calendar / Embed 狀態卡片 / 統計報告 / Cron Job / 自動化工作流）
- [x] Mobile UX 改善（hamburger + backdrop + grid stacking）
- [x] Site monitor cron job（launchd，每15分鐘檢查 GitHub Pages）
- [ ] Level 3 自動恢復機制
- [ ] E2E 測試合併到 >80%
- [ ] Discord ↔ Website Sync 4週計劃

## P0 阻斷
- n8n workflow JSON 格式錯誤（需用 API export 而非 UI export）
- ngrok authtoken 未認證 (ERR_NGROK_4018)
- n8n REST API 需要認證

## 決策記錄
| 日期 | 決定 | 原因 |
|------|------|------|
| 2026-03-22 | 每個 project 擁有自己 Discord Server | 而非同一 Virtual Office 內的 channels |
| 2026-03-20 | Discord groupPolicy 改為 allowlist | 安全性 |

## Subagent 上下文
> Virtual Office 係 Zach 最複雜的項目，目標係變成一個完整的 Discord ↔ 網站同步系統。n8n 係自動化核心，但目前 workflow JSON 格式有問題。ngrok 未認證，Discord ↔ Website sync 4週計劃仲未開始。
