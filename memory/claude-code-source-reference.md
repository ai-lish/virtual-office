# Claude Code Source Code Reference
_Last updated: 2026-04-01_

## Source Code Mirrors (Leaked 2026-03-31)

| Repo | URL | Notes |
|------|-----|-------|
| sleeplessai | https://github.com/sleeplessai/claude-code-leaked-source | Main mirror |
| chatgptprojects | https://github.com/chatgptprojects/claude-code | Alternative |
| instructkr | https://github.com/instructkr/claude-code | Python porting workspace |

## Key Files Analyzed

| File | Size | Key Content |
|------|------|-------------|
| `src/Tool.ts` | 792 lines | Tool type definition, interface |
| `src/memdir/memdir.ts` | 21KB | Memory directory system |
| `src/memdir/findRelevantMemories.ts` | 5KB | Memory search |
| `src/tools/BashTool/BashTool.tsx` | 160KB | Bash tool implementation |

## Directory Structure

```
src/
├── main.tsx                  # Entrypoint
├── Tool.ts                   # Tool type definitions
├── tools.ts                  # Tool registry
├── QueryEngine.ts            # LLM query engine (46K lines claimed)
├── context.ts                # System/user context
├── memdir/                   # Memory directory system
│   ├── memdir.ts            # Core memory logic
│   ├── findRelevantMemories.ts
│   ├── memoryAge.ts
│   ├── memoryTypes.ts
│   ├── paths.ts
│   ├── teamMemPaths.ts      # Team memory (feature gated)
│   └── teamMemPrompts.ts
├── extractMemories/          # Auto memory extraction
├── teamMemorySync/           # Team memory sync
├── coordinator/               # Multi-agent coordinator
├── commands/                 # Slash commands (~50)
├── tools/                    # Tool implementations (~40)
│   ├── AgentTool/
│   ├── BashTool/
│   ├── FileReadTool/
│   ├── FileWriteTool/
│   ├── FileEditTool/
│   ├── GlobTool/
│   ├── GrepTool/
│   ├── WebFetchTool/
│   ├── WebSearchTool/
│   ├── TaskCreateTool/
│   ├── TaskUpdateTool/
│   └── ... (40+ tools)
├── components/               # Ink UI components (~140)
├── skills/                   # Skill system
├── bridge/                   # IDE integration (JWT-auth)
├── buddy/                    # Companion sprite
├── state/                    # State management
├── schemas/                  # Zod config schemas
├── types/
│   ├── permissions.ts
│   ├── tools.ts
│   └── message.ts
└── services/
    ├── mcp/                  # MCP server connection
    ├── analytics/            # GrowthBook feature flags
    └── compact/              # Context compression
```

## Tool Interface (Tool.ts)

```typescript
export type Tool<Input, Output, P> = {
  aliases?: string[]
  searchHint?: string
  call(
    args: z.infer<Input>,
    context: ToolUseContext,
    canUseTool: CanUseToolFn,
    parentMessage: AssistantMessage,
    onProgress?: ToolCallProgress<P>,
  ): Promise<ToolResult<Output>>
  description(
    input: z.infer<Input>,
    options: { isNonInteractiveSession: boolean; toolPermissionContext: ToolPermissionContext; tools: Tools }
  ): Promise<string>
  readonly inputSchema: Input
  readonly inputJSONSchema?: ToolInputJSONSchema
  outputSchema?: z.Z
}

export type ToolUseContext = {
  options: {
    commands: Command[]
    debug: boolean
    mainLoopModel: string
    tools: Tools
    verbose: boolean
    thinkingConfig: ThinkingConfig
    mcpClients: MCPServerConnection[]
    mcpResources: Record<string, ServerResource[]>
    isNonInteractiveSession: boolean
    agentDefinitions: AgentDefinitionsResult
    maxBudgetUsd?: number
    customSystemPrompt?: string
    appendSystemPrompt?: string
    refreshTools?: () => Tools
  }
  abortController: AbortController
  readFileState: FileStateCache
  getAppState(): AppState
  setAppState(f: (prev: AppState) => AppState): void
  messages: Message[]
  toolDecisions?: Map<string, { source: string; decision: 'accept' | 'reject'; timestamp: number }>
  localDenialTracking?: DenialTrackingState
  contentReplacementState?: ContentReplacementState
  // ... many more
}
```

## Memory System (memdir.ts)

### Memory Types (4-type taxonomy)
- `user` — who the user is
- `feedback` — what works/doesn't work
- `project` — project context
- `reference` — reference info

### Two-Step Memory Saving
1. Write topic file with frontmatter:
```markdown
---
name: User Role
description: The user is a Hong Kong math teacher
type: user
---
```
2. Add pointer to MEMORY.md (one line, <150 chars):
```
- [User Role](user_role.md) — Hong Kong math teacher
```

### Size Limits
- MAX_ENTRYPOINT_LINES = 200
- MAX_ENTRYPOINT_BYTES = 25,000
- Topic entries: one line under ~200 chars

### vs Other Persistence
- **Plans**: approach alignment on non-trivial tasks
- **Tasks**: discrete steps within current conversation
- **Memory**: for future conversations

### Kairos Mode (new feature)
- Daily append-only logs: `logs/YYYY/MM/YYYY-MM-DD.md`
- Separate from MEMORY.md index
- `/dream` skill distills logs into topic files

## Feature Flags (GrowthBook)
- PROACTIVE
- KAIROS
- BRIDGE_MODE
- DAEMON
- VOICE_MODE
- AGENT_TRIGGERS
- MONITOR_TOOL
- TEAMMEM (team memory)

## Slash Commands (~50)
- /commit, /review, /compact
- /mcp, /config, /doctor
- /login, /logout
- /memory, /skills, /tasks
- /vim, /diff, /cost
- /theme, /context
- /pr_comments, /resume
- /share, /desktop, /mobile

## Tech Stack
| Category | Technology |
|----------|------------|
| Runtime | Bun |
| Language | TypeScript (strict) |
| Terminal UI | React + Ink |
| CLI Parsing | Commander.js |
| Schema Validation | Zod v4 |
| Code Search | ripgrep |
| Protocols | MCP SDK, LSP |
| API | Anthropic SDK |
| Telemetry | OpenTelemetry + gRPC |
| Feature Flags | GrowthBook |
| Auth | OAuth 2.0, JWT, macOS Keychain |

## Key Architecture Patterns

1. **Tool System**: Each tool is a self-contained module with typed input/output
2. **Permission Gates**: Every tool checks permissions before execution
3. **Context Injection**: ToolUseContext passed to every tool call
4. **Progress Callbacks**: Streaming progress via ToolCallProgress
5. **Lazy Loading**: Heavy deps (OpenTelemetry 400KB, gRPC 700KB) deferred
6. **Memory Taxonomy**: Strict 4-type classification
7. **Index vs Content**: MEMORY.md is index only, actual memories in topic files
