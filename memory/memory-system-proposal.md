# Memory System 改善方案
_Date: 2026-04-01 | Author: 大腦 (Boss) | Reviewer: Opus (pending)_

---

## 現有系統 vs Claude Code

| 功能 | Claude Code | OpenClaw | 評估 |
|------|-------------|----------|------|
| Daily logs | `logs/YYYY/MM/YYYY-MM-DD.md` | `memory/YYYY-MM-DD.md` | ✅ 我哋有 |
| Memory taxonomy | 4-type (user/feedback/project/reference) | 冇 | ⚠️ 可加 |
| Index vs content 分離 | MEMORY.md = pure index | MEMORY.md = actual memory | ❌ 唔好改 |
| Size control | MAX 200 lines | 冇 | ⚠️ 可加 |
| Auto Dream (每晚整合) | ✅ 有 | ❌ 冇 | 🔴 值得加 |
| KAIROS (proactive tick) | ✅ 有 | ❌ 唔適用 | ❌ 唔需要 |
| Vector search | 純文字 index | ✅ LanceDB vector search | ✅ 我哋更強 |
| Flush before compaction | ✅ 有 | ✅ 有 | ✅ 一樣 |

**核心發現：OpenClaw 底層 vector search 已經比 Claude Code 先進。但係冇 Auto Dream 自動記憶整合。**

---

## 方案：兩階段改善

### Phase 1：Writing Convention + Size Control（P1，低風險）

**目標：** 借用 Claude Code 概念，唔改架構

#### 1.1 Memory Taxonomy Writing Convention

喺 MEMORY.md 頂部加入：

```markdown
## 記憶分類（共識）

- **user** — Zach 的基本資料、偏好、語言、工作風格
- **feedback** — 咩work/咩唔work（重要經驗教訓）
- **project** — 項目上下文、狀態、技術棧
- **reference** — 參考資料（URL、API、工具設定）

寫記憶時考慮分類，但唔係强制——vector search 照常工作。
```

#### 1.2 MEMORY.md Size Control

目標：避免 MEMORY.md 無限增長

**做法：**
- 設定軟上限：每 section 不超過 50 行
- 超過時將舊內容移到 `memory/archive/MEMORY-2026-Q1.md`
- 每季度歸檔一次

**呢個係自然演化，唔係顛覆現有系統。**

#### 1.3 Topic Files (極少數關鍵長期記憶)

祇為最重要、極少變動的長期記憶建立 topic files：
- `topic-identity.md` — Zach 基本資料
- `topic-projects.md` — 活躍項目清單
- `topic-blockers.md` — P0 阻斷

**避免：** 為每個項目創建獨立 topic file（太碎片化）

---

### Phase 2：Auto Dream 概念引入（P2，中風險）

**目標：** 加入定期記憶整合機制

Claude Code 的 Auto Dream：
- 每 24h + 5 sessions 自動運行
- 四階段：Orientation → Signal gathering → Consolidation → Pruning
- 將相對日期轉 absolute、去矛盾、去重
- 保持 MEMORY.md ≤200 行

**OpenClaw 適配：**

由於我哋唔係 always-on，無法完全複製 KAIROS tick loop。

**可行方案：**
```yaml
# HEARTBEAT.md 加入每週 Dream Task
### 每週六 20:00 — Memory Dream (如果 5+ sessions 未整合)
1. 讀取本週所有 memory/YYYY-MM-DD.md
2. 識別：
   - 矛盾記錄（邊個啱？）
   - 重複記錄（合併）
   - 相對日期（轉 absolute）
   - 過時筆記（標記刪除）
3. 更新 MEMORY.md
4. 輸出整合報告
```

**限制：**
- OpenClaw 冇 session count tracking
- 需要手動觸發或靠 cron
- vector search 會自動覆蓋呢啲改動

---

## 風險評估

| 改動 | 風險 | 原因 |
|------|------|------|
| Taxonomy writing convention | 🟢 極低 | 純 convention，唔影響功能 |
| MEMORY.md size control | 🟢 低 | 自然歸檔，唔影響現有系統 |
| Topic files (少數) | 🟡 中 | 佔少數，vector search 照常 |
| Auto Dream 概念 | 🟡 中 | 需要定期手動/ cron 觸發 |

**唔好做：**
- ❌ 把 MEMORY.md 變純 index（降 vector search quality）
- ❌ 抄 KAIROS tick loop（OpenClaw 係 event-driven，唔適用）
- ❌ 抄 extractMemories（OpenClaw flush system 已有類似功能）

---

## 實施時間線

| 階段 | 內容 | 時間 |
|------|------|------|
| P1.1 | Taxonomy convention 加入 MEMORY.md | 今日 |
| P1.2 | MEMORY.md size control 規則 | 今日 |
| P1.3 | Critical topic files (3個) | 明日 |
| P2 | 每週 Dream cron job | 本週內 |

---

## 待 Opus 審視問題

1. Phase 1 的 taxonomy convention 係咪足夠簡單，唔會增加 cognitive load？
2. Phase 2 的 Auto Dream 概念喺 OpenClaw 係咪真的可行？，定係應該放棄？
3. Topic files 數量（3個）係咪合理？
4. 有冇其他我忽略咗嘅風險？
