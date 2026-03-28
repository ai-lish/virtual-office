# Copilot Phase 12 — 團隊名冊

> 最後更新：2026-03-28 10:56 HKT

---

## 團隊成員

### 畫家 — 設計師 🖌️
| 項目 | 詳情 |
|------|------|
| **名稱** | 畫家 |
| **角色** | 設計師 |
| **Session Key** | `agent:designer:main` |
| **Model** | github-copilot/gemini-3.1-pro-preview |
| **擅長** | 圖像/視覺設計、UI設計 |
| **調用時機** | 超出專業範疇時（技術分析、程式設計、硬體支援） |
| **避免浪費** | 閱讀存檔、清晰任務分工、記錄進度同步 |

---

### 師弟 — 製作者 🔧
| 項目 | 詳情 |
|------|------|
| **名稱** | 師弟 |
| **角色** | 製作者 / 開發者 |
| **Session Key** | `agent:dev:main` |
| **Model** | github-copilot/claude-opus-4.6 |
| **擅長** | 程式碼實作、快速原型、工具型任務 |
| **調用時機** | 圖像→畫家、文檔→書記、測試→T仔 |
| **避免浪費** | 任務卡+中央狀態欄+里程碑匯報 |

---

### T仔 — 測試者 🧪
| 項目 | 詳情 |
|------|------|
| **名稱** | T仔 |
| **角色** | 測試者 |
| **Session Key** | `agent:tester:main` |
| **Model** | github-copilot/claude-sonnet-4.6 |
| **擅長** | 測試、自動化執行、資料擷取 |
| **調用時機** | 程式→師弟、會議→書記、設計→畫家 |
| **避免浪費** | 明確分工+里程碑+去重檢查 |

---

### 小詩 — 研究分析員 📚
| 項目 | 詳情 |
|------|------|
| **名稱** | 小詩 (TA) |
| **角色** | 研究分析員 |
| **Session Key** | `agent:ta:main` |
| **Model** | minimax/MiniMax-M2.7 |
| **擅長** | 研究/分析、複雜問題拆解 |
| **調用時機** | 大型改寫、法律審核、持續監控、需外部系統審批 |
| **避免浪費** | 明確輸入/輸出+小範圍驗收點+定期短同步 |

---

### 書記 — 文檔管理員 ✍️
| 項目 | 詳情 |
|------|------|
| **名稱** | 書記 |
| **角色** | 文檔管理員 / 記録者 |
| **Session Key** | `agent:secretary:main` |
| **Model** | minimax/MiniMax-M2.7 |
| **擅長** | 文檔/記錄、長篇摘要、會議紀錄 |
| **調用時機** | 專精技能/長期監控/外部系統/持久記錄需求 |
| **避免浪費** | 查MEMORY.md+單一協調者+結構化請求 |

---

## 工作模式共識

### 協調架構
```
你 (Minimax) → Main (Minimax) → 各 Agent (GPT 模型)
                      ↓ sessions_send
           dev / tester / ta / secretary / designer
```

- **你 ↔ Main** → Minimax (Minimax-M2.7)
- **Main ↔ 其他 Agent** → 各 Agent 的 GPT 模型
- **過程中你不會看到** Main 與各 Agent 的對話

### 分工原則
| 情況 | 負責 Agent |
|------|-----------|
| 純文字討論/分析 | main (Minimax) |
| 程式碼/技術實作 | 師弟 (GPT-5-mini) |
| 測試/驗證/自動化 | T仔 (GPT-5-mini) |
| 文檔/記錄/整理 | 書記 (GPT-5-mini) |
| 圖像/設計 | 畫家 (GPT-4o) |
| 複雜研究/分析 | TA (GPT-5-mini) |

### 避免重複工作共識
1. **任務卡** — 目標/輸入/輸出/限制/Done標準
2. **中央狀態** — 共享記錄 (MEMORY.md / workspace)
3. **短回報** — 里程碑式匯報，而非冗長對話
4. **單一協調** — main 負責分配與匯總
5. **先查後動** — 接手前查閱現有成果

### 調用順序建議
```
1. main 分析任務
2. 拆解子任務
3. 並行分發給適合的 Agent
4. 各 Agent 里程碑匯報
5. main 整合結果
```

---

## 模型配置

| 角色 | Model | 備註 |
|------|-------|------|
| main | minimax/MiniMax-M2.7 | 默認，協調者 |
| secretary | minimax/MiniMax-M2.7 | 中文文本閱讀/寫作 |
| dev | github-copilot/claude-opus-4.6 | 程式碼/原型 |
| tester | github-copilot/claude-sonnet-4.6 | 測試/自動化 |
| ta | minimax/MiniMax-M2.7 | 中文文本閱讀/寫作 |
| designer | github-copilot/gemini-3.1-pro-preview | 設計/圖像 |

---

## 服務器狀態

| 服務 | URL | 狀態 | 備註 |
|------|-----|------|------|
| Virtual Office | http://localhost:18899 | ✅ 運行中 | Express 服務器 |
| n8n | http://localhost:5678 | ⚠️ 需修復 | Workflow 需要 import/activate |
| Copilot API (quota) | http://localhost:18899/api/copilot/quota | ✅ 正常 | — |
| Copilot API (analysis) | http://localhost:18899/api/copilot/analysis | ✅ 正常 | — |

---

## 項目背景

- **項目名稱**: Copilot Phase 12
- **目標層次**: Level 3 — 生產級別
- **文檔位置**: `/Users/zachli/.openclaw/workspace/virtual-office/docs/`

---

*本文件由書記維護，是 Copilot Phase 12 項目的正式團隊記錄。*
