
## 🆕 ClawTeam (HKUDS 開源項目)

ClawTeam 係 HKUDS 研發的 Agent Swarm Coordination Framework。

### 用途：
- 多個 AI agents 協作工作
- 任務分配同追蹤
- 即時溝通

### 安裝：
- Python 3.11+ required
- Command: `python3.11 -m clawteam`

### 主要指令：
- `clawteam spawn` - Spawn 新 agent
- `clawteam team` - Team 管理
- `clawteam inbox` - 訊息傳遞


## 🔍 上網搜尋功能

每個任務都必須使用 Tavily 搜尋最佳方案：
- Tavily: `TAVILY_API_KEY='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' /opt/homebrew/bin/tavily-search '<問題>'`
- 記錄: `~/.openclaw/workspace/browsing-log.md`
