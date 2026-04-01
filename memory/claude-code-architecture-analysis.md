# Claude Code Architecture Analysis & Self-Improvement
_Date: 2026-04-01 | Author: 大腦 (Boss)_

---

## Part 1: Claude Code 關鍵架構分析（public knowledge）

以下全部係媒體/安全研究员的公開分析，唔係我睇咗源碼。

### 1.1 核心數據
| 指標 | 數值 |
|------|------|
| 文件數 | ~1,900 TypeScript files |
| 代碼行數 | 512,000+ lines |
| 內建工具 | ~40 個 |
| Slash commands | ~50 個 |
| Query engine | 46,000 lines（最大模組）|
| Tool definition | 29,000 lines（僅基礎定義）|

### 1.2 四大核心系統

#### 🔧 Tool System（工具系統）
- 每個工具係**獨立插件**，權限分級（permission-gated）
- 工具包括：Read, Write, Edit, Bash, Grep, Glob, WebFetch, Agent, LSP, MCP...
- **Typed interface**: `Tool { name, permissions, execute(context) }`
- 29,000 行只用嚟定義工具介面，說明佢哋對工具合約睇得好重

#### 🧠 Query Engine（查詢引擎）
- 46,000 行，最大單一模組
- 職責：LLM API 調用、streaming、caching、orchestration
- 相當於佢嘅「大腦」——所有模型交互經過呢度

#### 🌐 Multi-Agent Orchestration（多代理協調）
- Claude Code 可以 spawn sub-agents（佢哋叫 "swarms"）
- 每個 sub-agent 喺自己嘅 context 運行，有特定工具權限
- 可以并行處理復雜任務

#### 💾 Persistent Memory System（持久記憶系統）
- **File-based memory directory**
- 跨 session 儲存：用戶 context、project context、preferences
- 呢個唔係簡單嘅 KV store，而係有結構嘅記憶層

### 1.3 其他技術亮點
| 選擇 | 原因 |
|------|------|
| **Bun runtime** | 快速啟動、dead code elimination 做 feature flags |
| **Ink (React for CLI)** | Terminal UI component-based，同 web app 一樣 |
| **Zod v4 validation** | 所有工具輸入、API 回應、config file 都係 typed |
| **IDE Bridge** | VS Code/JetBrains 通過 JWT-authenticated channels 連接 |
| **Lazy-loaded modules** | OpenTelemetry、gRPC 等重型依賴延遲加載 |

### 1.4 設計模式總結

```
Claude Code Architecture:
┌─────────────────────────────────────────────┐
│  CLI Entry (main.tsx, 785KB)                │
├─────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │ Tool System │  │  Query Engine (46K) │  │
│  │ (~40 tools) │  │  - API calls        │  │
│  │ permission- │  │  - streaming        │  │
│  │ gated       │  │  - caching          │  │
│  └─────────────┘  │  - orchestration    │  │
│                   └──────────────────────┘  │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │ Multi-Agent │  │  Memory System       │  │
│  │ (swarms)    │  │  - user context      │  │
│  │             │  │  - project context   │  │
│  └─────────────┘  │  - preferences       │  │
│                   └──────────────────────┘  │
│  ┌─────────────────────────────────────┐   │
│  │ IDE Bridge (JWT-authenticated)       │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## Part 2: 我目前架構問題分析

### 2.1 現有組件
- `SOUL.md` — 角色定義
- `MEMORY.md` — 長期記憶（flat file）
- `AGENTS.md` — 團隊分工
- `TOOLS.md` — 工具備忘
- `HEARTBEAT.md` — 定時任務
- `memory/YYYY-MM-DD.md` — 每日日誌
- `SKILL.md` files — 各技能定義（分散）

### 2.2 問題清單

| # | 問題 | 嚴重性 | 影響 |
|---|------|--------|------|
| 1 | **冇分層架構** — 所有野溝埋一齊 | 高 | 記憶、工具、角色定義全部係 flat files，唔同關注點冇分開 |
| 2 | **工具定義唔結構化** — SKILL.md 係自由格式 | 高 | 工具冇 typed interface，唔知道邊個工具做咗乜 |
| 3 | **冇 Query Engine** — 直接 call tools | 高 | 唔能麼做 caching、streaming control、fallback |
| 4 | **Subagent 係 basic spawn** — 冇 orchestration | 中 | 唔能并行、冇 task coordination、冇結果 aggregate |
| 5 | **記憶系統係 flat file** — 冇分層 | 中 | short-term/long-term/experience 全部一齊，難維護 |
| 6 | **冇 Slash commands** — 只有 heartbeat prompt | 低 | 用戶互動方式有限 |
| 7 | **冇 schema validation** — 所有野 stringly-typed | 低 | 工具輸入輸出冇保證，容易 crash |
| 8 | **冇 IDE Bridge** — 唔能 VS Code 集成 | 低 | 技術上複雜，長期可以考慮 |

### 2.3 核心問題

> **我的記憶系統唔係「系統」，只係一堆檔案。**

Claude Code 嘅工具系統有 29,000 行定義，我嘅工具（TOOLS.md + SKILL.md）零散且自由格式。
Claude Code 有 46,000 行 query engine，我直接 call API 冇 intermediary。
Claude Code 有 persistent memory directory，我只有 flat files。

---

## Part 3: 改善建議

### 3.1 短中期可行改動（P1-P2）

#### P1: 結構化工具定義
```
workspace/
  tools/
    skillName/
      SKILL.md          # 現有格式
      TOOL.md           # 新增：typed tool definition
      schema.json       # 新增：Zod-like input/output schemas
      permissions.md    # 新增：工具權限分級
```

好處：工具變成可發現、可類型檢查、有明確介面。

#### P2: 分層記憶系統
```
MEMORY.md  # 長期記憶（精選）
memory/
  2026-04-01.md         # 今日（short-term）
  working/              # 新增：中間工作狀態
    active-tasks.md      # 目前進行中的任務
    blockers.md          # 阻斷
    recent-decisions.md  # 最近決定
  archive/              # 新增：歸檔
```

唔再係「所有記憶喺同一個檔案」，而係分層。

#### P3: Multi-Agent Coordination Layer
目前 subagent 只係 basic spawn。參考 Claude Code swarm concept，可以加：
- Task queue with dependencies
- Parallel execution with aggregation
- Shared context between agents

呢個比較複雜，可能需要 Zach 批准先可以做。

### 3.2 長期可以考慮（P3）

| 項目 | 描述 | 難度 |
|------|------|------|
| IDE Bridge | 連接 VS Code/JetBrains | 高 |
| Query Engine | 做 API call intermediary | 高 |
| Zod Validation | 所有工具輸入 output typed | 中 |
| Slash Commands | 結構化命令系統 | 低 |

---

## Part 4: 立即行動

**今日完成：**
- [x] 閱讀 Claude Code public analysis
- [x] 完成本報告

**明日（2026-04-02）行動：**
- [ ] 重構 TOOLS.md → tools/ 目錄結構
- [ ] 為每個 skill 建立 schema.json
- [ ] 將 MEMORY.md 分層

**準備匯報：**
- [ ] 向 Zach 展示改善建議
- [ ] 獲得批准後執行 P1

---

---

## Part 5: 驗證 Public Claims vs Actual Source Code

### 5.1 Tool System（Tool.ts 792 lines）
**Public claim:** 29,000 lines tool definition
**Actual:** Tool.ts is 792 lines, but each tool implementation is massive:
- BashTool.tsx: **160KB** single file
- ToolUseContext: massive context object with all dependencies

**Tool Interface (actual code):**
```typescript
export type Tool<Input, Output, P> = {
  aliases?: string[]
  searchHint?: string
  call(args, context, canUseTool, parentMessage, onProgress?): Promise<ToolResult<Output>>
  description(...): Promise<string>
  readonly inputSchema: Input
  readonly inputJSONSchema?: ToolInputJSONSchema
  outputSchema?: z.Z
}
```

### 5.2 Memory System (memdir.ts 21KB source + actual source)
**Public claim:** File-based persistent memory
**Actual (verified from source):**

```
memory/
├── MEMORY.md          # Entrypoint (INDEX only, max 200 lines, 25KB)
├── user_role.md       # Topic file
├── feedback_*.md       # Topic files  
├── project_*.md        # Topic files
└── reference_*.md      # Topic files
```

**4 Memory Types (typed taxonomy):**
- `user` — who the user is
- `feedback` — what works/doesn't work
- `project` — project context
- `reference` — reference info

**Two-Step Memory Saving:**
1. Write topic file with frontmatter (name, description, type)
2. Add pointer to MEMORY.md index (one line, <150 chars)

**Size Controls:**
- MAX_ENTRYPOINT_LINES = 200
- MAX_ENTRYPOINT_BYTES = 25,000
- Topic entries: one line under ~200 chars

**vs Other Persistence:**
- Plans: for approach alignment on non-trivial tasks
- Tasks: discrete steps within current conversation
- Memory: for future conversations

**New Discovery:**
- `extractMemories/` — automatic memory extraction system
- `teamMemorySync/` — team memory synchronization
- `Kairos mode` — daily append-only logs instead of index

### 5.3 BashTool Implementation
- BashTool.tsx: **160KB** — one tool, one massive file
- Uses streaming, progress callbacks, permission checks

### 5.4 Coordinator / Multi-Agent
- `coordinator/` directory exists
- Sub-agents have their own context and permissions
- `createSubagentContext()` clones parent's state

### 5.5 New Features Found (not in public reports)
- `buddy/` — companion sprite system
- `Kairos mode` — assistant mode feature flag
- `teamMemorySync/` — team memory
- `extractMemories/` — auto memory extraction
- Feature flags: PROACTIVE, KAIROS, BRIDGE_MODE, DAEMON, VOICE_MODE, AGENT_TRIGGERS, MONITOR_TOOL

---

## 參考來源

**Public Articles:**
1. [LowCode Agency - Claude Code Source Code Leaked](https://www.lowcode.agency/blog/claude-code-source-code-leaked)
2. [Penligent - Claude Code Source Map Leak](https://www.penligent.ai/hackinglabs/claude-code-source-map-leak-what-was-exposed-and-what-it-means)
3. [Dev.to - Claude Code's Entire Source Code Was Just Leaked](https://dev.to/gabrielanhaia/claude-codes-entire-source-code-was-just-leaked-via-npm-source-maps-heres-whats-inside-cjo)
4. [VentureBeat - Claude Code's source code appears to have leaked](https://venturebeat.com/technology/claude-codes-source-code-appears-to-have-leaked-heres-what-we-know)
5. [CNBC - Anthropic leaks part of Claude Code's internal source code](https://www.cnbc.com/2026/03/31/anthropic-leak-claude-code-internal-source.html)

**Actual Source Code (GitHub mirrors):**
- [sleeplessai/claude-code-leaked-source](https://github.com/sleeplessai/claude-code-leaked-source)
- [chatgptprojects/claude-code](https://github.com/chatgptprojects/claude-code)
- [instructkr/claude-code](https://github.com/instructkr/claude-code)

**Files Analyzed:**
- `src/Tool.ts` (792 lines) — Tool type definition
- `src/memdir/memdir.ts` (21KB) — Memory directory system
- `src/memdir/findRelevantMemories.ts` — Memory search
- `src/tools/BashTool/` — BashTool structure (160KB .tsx file)
