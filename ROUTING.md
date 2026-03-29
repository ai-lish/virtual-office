# ROUTING.md — Channel Routing 規則

## 基本原則
**邊度問，邊度答。** 結果回到發起 channel。

## Channel 用途

| Channel | ID | 用途 |
|---------|-----|------|
| Telegram | 8707814594 | 私人對話、敏感資料、快速指令、日常傾偈 |
| Discord #總辦公室 | 1485954456611717210 | 項目進度、技術討論、主動匯報 |
| Discord #備用 | 1483436247618682900 | 通知、logs、自動化報告 |

## Subagent 結果路由

### 發起 channel = 回報 channel
- Telegram 發起的任務 → 回 Telegram
- Discord 發起的任務 → 回 Discord channel

### 例外情況
1. **長 report（>2000字）** → 寫入 workspace file + channel 發 summary + link
2. **CI/監控 alert** → Discord #總辦公室（1485954456611717210）
3. **每週摘要** → Telegram（Zach 私人）
4. **師弟/T仔 完成通知** → 由 main agent 轉發，保持 channel 一致性

## Subagent 永遠唔直接 message channel
所有結果交畀 main agent format 再發，確保：
- 格式統一
- 不重複發送
- 有 human-readable summary

## Model 分層參考

| 任務 | Model | 備注 |
|------|-------|------|
| 日常對話、傾偈 | MiniMax-M2.7 | default |
| 簡單 coding、腳本 | github-copilot/gpt-5-mini | T2 |
| 複雜 coding、多 file | github-copilot/claude-sonnet-4.6 | T1 |
| 大型重構、新功能 | github-copilot/claude-opus-4.6 | T0 |
| 圖片分析、OCR | github-copilot/gpt-4o | T3 |

**每次 spawn 前問 Zach 想用邊個 model。**

## Subagent Report 格式（必須使用）

```
## Result: [DONE | BLOCKED | PARTIAL]

### Summary
一句話總結。

### Changes
- file1: 做了乜
- file2: 修了乜

### Issues
- [any blockers]

### Next Steps
- [suggested follow-up]
```
