# Obsidian MOC 系統建設計劃

**創建日期：** 2026-04-25  
**目標：** 解決 Agent siloed、資訊碎片化、關聯性唔明顯的問題  
**Zach 意圖：** 探索可能性，全部分階段執行  
**執行者：** OpenClaw 大腦統籌，各 Agent 協作

---

## 📋 現況分析

### 現有 Obsidian Vault 結構
```
~/Documents/Obsidian Vault/
├── HOME.md                    ← AI Agent 控制台 Dashboard
├── Hermes -> ~/.hermes/       ← symlink（外部系統合約）
└── OpenClaw -> ~/.openclaw/workspace/  ← symlink（外部系統）
```

### 痛點
1. **Agent siloed** — Hermes 唔知 OpenClaw 做咗咩，自己 agent 內的相關資訊也散落各處
2. **資訊碎片化** — 日誌、MEMORY、SOUL、TOOLS、AGENTS 之間冇自然連接
3. **Zach 睇唔清** — 打開 Obsidian 都係一嚿嚿冇關聯的檔案
4. **Agent 唔主動建立連結** — 就算同一 agent，相關內容都傾向獨立存在

### 約束條件
- Zach 唔親自寫野，所有寫作由 Agent 代勞
- Mac Mini 係 home server，多數係 agent 用，Zach 只係假日/放工後被動查看
- 唔改變現有 folder 結構，唔搬動現有檔案
- Agent 必須維持現有工作模式，唔因為 Obsidian 而改變路徑

---

## 🎯 目標

1. **建立 MOC（Map of Content）系統** — 主題入口索引，用 `[[links]]` 自然連接相關筆記
2. **強制 Agent 建立連結** — 寫野時主動連結到相關筆記/MOC
3. **提高透明度** — Zach 打開 Obsidian 可以快速了解：近排發生咩？有咩需要關注？
4. **發現關聯** — 就算係同一 agent，相關內容可以通過 MOC 和 backlinks 串連

---

## 🏗️ 實施方案

### 第一階段：創建 MOC 文件結構

#### 1.1 创建 MOCs folder

```
~/Documents/Obsidian Vault/MOCs/
├── MOC-AI-System.md       ← AI 系統總覽
├── MOC-Teaching.md       ← 教學相關總覽
├── MOC-Projects.md       ← 所有項目總覽
└── MOC-Decisions.md      ← 重要決策索引
```

#### 1.2 MOC-AI-System.md 內容模板

```markdown
# MOC-AI-System

## 身份設定
- [[OpenClaw/SOUL]] — 大腦的靈魂與原則
- [[Hermes/SOUL]] — 小心的靈魂與原則
- [[OpenClaw/IDENTITY]] — 身份定義

## 記憶系統
- [[OpenClaw/MEMORY]] — 長期記憶
- [[Hermes/memories/MEMORY]] — 小心的記憶
- [[OpenClaw/HEARTBEAT]] — 心跳系統

## 工具與能力
- [[OpenClaw/TOOLS]] — 可用工具清單
- [[Hermes/memories/USER]] — 用戶資料與偏好

## Agent 指引
- [[OpenClaw/AGENTS]] — sub-agents 身份與職責
- [[OpenClaw/WORKFLOW]] — 工作流程定義
- [[OpenClaw/CODING_WORKFLOW]] — 程式開發工作流

## 最近決策與進展
（由 Agent 動態更新）
- [[OpenClaw/memory/2025-04-22]] — 數學RPG方向確定
- [[OpenClaw/memory/2025-04-24]] — Square Bun 代碼約定

## Sub-agents 狀態
| Agent | 身份 | 最近工作 |
|-------|------|---------|
| 書記 | [[OpenClaw/agents/secretary/IDENTITY]] | ... |
| 師弟 | [[OpenClaw/agents/dev/IDENTITY]] | ... |
| 小詩 | [[OpenClaw/agents/ta/IDENTITY]] | ... |
| T仔 | [[OpenClaw/agents/tester/IDENTITY]] | ... |

## 問題與跟進
（由 Agent 標記需要關注的事項）
```

#### 1.3 MOC-Teaching.md 內容模板

```markdown
# MOC-Teaching

## 教學平台
- [[OpenClaw/projects/ai-learning]] — 中一數學互動教學網站
- [[OpenClaw/projects/math-week-2026]] — 數學週活動

## 遊戲項目
- [[OpenClaw/projects/square-bun]] — 平方包桌遊
- [[OpenClaw/projects/math-rpg]] — 數學RPG遊戲

## 相關技術
- [[OpenClaw/projects/preschool]] — 幼兒聖經遊戲
- [[OpenClaw/projects/homework-duty]] — 功課系統

## 教學資源
- [[OpenClaw/education/hkdse]] — HKDSE試卷與試題庫
- [[OpenClaw/education/lesson-plans]] — 備課記錄

## 最近進展
（由 Agent 動態更新）
```

#### 1.4 MOC-Projects.md 內容模板

```markdown
# MOC-Projects

## 活躍項目
（列出所有項目的概覽與連結）

## 項目狀態總覽
| 項目 | 狀態 | 最近更新 |
|------|------|---------|
| ai-learning | active | ... |
| square-bun | active | ... |
| math-rpg | planning | ... |
| math-week-2026 | active | ... |

## 需要關注的項目
（由 Agent 標記需要 Zach 注意的事項）
```

#### 1.5 MOC-Decisions.md 內容模板

```markdown
# MOC-Decisions

## 重要決策記錄

### 架構決定
| 日期 | 決策 | 相關檔案 |
|------|------|---------|
| 2026-04-22 | 數學RPG繼續用Phaser | [[math-rpg]] |
| 2026-04-24 | Square Bun代碼約定 | [[square-bun/CODE-CONVENTIONS]] |

## 待確認事項
（由 Agent 標記等待 Zach 確認的決定）
```

---

### 第二階段：建立連結習慣

#### 2.1 核心原則

**每當 Agent 創建或更新任何筆記時：**

1. **主動搜尋相關內容**
   - 喺同一 topic 下搵其他相關筆記
   - 搜尋 MEMORY.md 睇有冇相關歷史決定
   - 搵相關的 MOC

2. **加入雙向連結**
   - 用 `[[filename]]` 或 `[[filename#heading]]` 連結到相關筆記
   - 確保連結有意義，唔係為連結而連結

3. **更新相關 MOC**
   - 如果係重要進展/決定，更新對應 MOC 的 "最近進展" 區塊

#### 2.2 具體應用場景

**場景A：書記寫每日日誌**
```
1. 打開 memory/YYYY-MM-DD.md
2. 搜尋 MEMORY.md 相關內容
3. 加入連結：
   - 涉及 [[square-bun]] 的討論 → 連結到 square-bun 項目
   - 涉及 [[math-rpg]] 的決定 → 連結到相應決策記錄
4. 如果有重要決定 → 更新 MOC-Decisions.md
```

**場景B：師弟完成一個功能**
```
1.喺對應的項目 folder 更新 README 或進度筆記
2. 主動連結到相關的技術筆記
3. 如果係重要功能 → 更新 MOC-Projects.md
```

**場景C：T仔發現Bug**
```
1. 喺 memory/YYYY-MM-DD.md 記錄
2. 連結到相關的項目筆記
3. 如果係已解決的問題 → 更新 MOC 相關區塊
```

#### 2.3 連結品質標準

| 標準 | 描述 |
|------|------|
| **有意義** | 連結的筆記確實與當前內容相關 |
| **具體** | 優先用 `[[file#heading]]` 而唔係整個文件 |
| **更新MOC** | 重要進展/決定要同步到 MOC |
| **避免孤島** | 確保冇筆記完全冇被任何嘢連結 |

---

### 第三階段：每週 Link Maintenance

#### 3.1 執行頻率
每週一次，由大腦統籌，一個 subagent 執行

#### 3.2 檢查清單

```
1. 搵出過去7日新建的孤立筆記（冇被任何嘢連結）
2. 將佢哋連結到相關的 MOC 或其他筆記
3. 檢查 MOC 的 "最近進展" 是否過時
4. 如果發現新的主題集群 → 建議新建 MOC 或更新現有 MOC
5. 清理過時的連結（如某項目已归档）
```

#### 3.3 執行 prompt

```
每週 Link Maintenance Task:

1. 搜尋過去7日內修改的筆記
2. 對每個筆記：
   a. 確認佢被其他筆記連結（backlinks）
   b. 如果係孤立筆記 → 主動建立連結
3. 更新 MOC-AI-System.md 的 "最近決策與進展" 區塊
4. 報告：
   - 發現的孤立筆記數量
   - 建立的連結數量
   - 任何建議的新 MOC 或重組
```

---

### 第四階段：Zach 的使用方式

#### 4.1 開啟 Obsidian 的預期流程

```
1. 打開 Obsidian
2. 睇 HOME.md（AI 控制台 Dashboard）
3. 點擊感興趣的 MOC（如 MOC-AI-System）
4. 通過 MOC 的連結快速導航到相關內容
5. 使用 Graph View 視覺化了解筆記之間的關聯
```

#### 4.2 Zachary 可以關注的資訊

| 資訊類型 | 位置 |
|---------|------|
| 近排重要決定 | MOC-Decisions.md |
| 各項目狀態 | MOC-Projects.md |
| AI 系統整體狀況 | MOC-AI-System.md |
| 教學相關項目 | MOC-Teaching.md |
| Agent 需要 Zach 確認的事項 | 各 MOC 的 "待確認" 區塊 |

---

## 📁 最終 Vault 結構

```
~/Documents/Obsidian Vault/
├── HOME.md                    ← AI Agent 控制台 Dashboard（不變）
├── MOCs/                      ← 新增：主題索引
│   ├── MOC-AI-System.md       ← AI 系統總覽
│   ├── MOC-Teaching.md        ← 教學相關總覽
│   ├── MOC-Projects.md        ← 所有項目總覽
│   └── MOC-Decisions.md       ← 重要決策索引
├── Hermes -> ~/.hermes/       ← symlink（外部系統合約，不變）
└── OpenClaw -> ~/.openclaw/workspace/  ← symlink（外部系統，不變）
```

**關鍵原則：**
- 唔搬動任何現有檔案
- MOCs 係新增的入口文件，唔改變現有檔案的位置
- 現有 symlinks 維持不變，Agent 繼續喺自己的 folder 工作

---

## 🚀 執行次序

### Phase 1：創建 MOC 文件（立即）
1. 在 `~/Documents/Obsidian Vault/MOCs/` 創建 4 個 MOC 文件
2. 填入初始內容（基於現有資料）
3. 更新 HOME.md 加入 MOCs 的連結

### Phase 2：建立連結習慣（即時生效）
1. 大腦向所有 Agent 發出連結習慣的系統 prompt
2. 所有 Agent 喺寫野時強制執行連結原則
3. 初期每週回顧一次，確保習慣形成

### Phase 3：每週 Link Maintenance（持續）
1. 建立每週 cron job 執行 Link Maintenance
2. 由大腦統籌，subagent 執行
3. 維護 MOC 的時效性

### Phase 4：觀察與調整（1個月後）
1. 評估連結習慣的執行效果
2. 根據實際使用調整 MOC 結構
3. 如有需要，細化 MOC 或增加新 MOC

---

## 📝 系統 Prompt（供 Agent 使用）

### 連結原則

```
【連結原則 — 請嚴格遵守】

當你創建或更新任何筆記時，必須：

1. 主動搜尋相關內容
   - 喺同一 topic 下搵其他相關筆記
   - 搜尋 MEMORY.md 睇有冇相關歷史決定
   - 搵相關的 MOC

2. 加入雙向連結
   - 用 [[filename]] 或 [[filename#heading]] 連結到相關筆記
   - 確保連結有意義，唔係為連結而連結

3. 更新相關 MOC
   - 如果係重要進展/決定，更新對應 MOC 的 "最近進展" 區塊
   - 如果係待確認事項，加入 MOC 的 "待確認" 區塊

4. 避免孤島
   - 確保你寫的筆記唔會完全冇被任何嘢連結
   - 如果發現孤立筆記，主動建立連結
```

### MOC 更新原則

```
【MOC 更新原則】

當你完成以下任何一項工作，必須更新相關 MOC：

1. 重要決定
   → 更新 MOC-Decisions.md

2. 項目重大進展/完成
   → 更新 MOC-Projects.md

3. AI 系統相關變更（身份、工具、記憶系統等）
   → 更新 MOC-AI-System.md

4. 教學相關項目變更
   → 更新 MOC-Teaching.md

更新方式：
- 喺 MOC 的 "最近進展" 或 "最近決策" 區塊加入簡短描述
- 包含日期、相關檔案連結
- 保持描述簡潔，幾句話講完
```

---

## ✅ 成功標準

| 標準 | 衡量方式 |
|------|---------|
| Agent 建立連結的習慣 | 每月 link audit，連接數穩定增長 |
| MOC 嘅時效性 | 每週 MOC 有更新 |
| 冇孤立筆記 | 每週 audit 發現的孤立筆記 < 5 |
| Zach 可以快速了解近況 | 打開 Obsidian 後 5 分鐘內可以回答：近排發生咩？有咩要關注？ |
| 資訊關聯性提升 | Graph View 可以睇到明顯的 cluster |

---

## 🔧 維護與調整

- **每週 Link Maintenance** — 持續執行，確保系統保持連貫
- **每月回顧** — 大腦評估系統運作，調整 MOC 結構或新增 MOC
- **Zach 反饋** — 如有任何問題，通過 Hermes/OpenClaw 反映

---

**計劃版本：** v1.0  
**下次審閱：** 2026-05-02  
**負責人：** OpenClaw 大腦統籌
