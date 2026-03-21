# Plan: `agent-orchestration-patterns` Repository

## Context

Building a new standalone GitHub repo — an educational project demonstrating 7 multi-agent orchestration patterns with a React frontend (live streaming + inline trace visualization), provider-agnostic LLM via Vercel AI SDK, Langfuse for evals/benchmarking, and Docker.

## Directory Structure

```
agent-orchestration-patterns/
├── README.md
├── package.json                    # npm workspaces
├── tsconfig.json
├── tsconfig.base.json
├── docker-compose.yml              # server + frontend + langfuse
├── .gitignore
├── .env.example
│
├── packages/
│   └── core/
│       ├── package.json
│       └── src/
│           ├── index.ts
│           ├── llm/
│           │   ├── types.ts        # ChatMessage, LLMResponse, LLMConfig
│           │   └── provider.ts     # OpenAI-compatible adapter (OpenRouter, Ollama, etc.)
│           ├── agent/
│           │   ├── types.ts        # AgentConfig, AgentResult
│           │   ├── base-agent.ts   # BaseAgent with stream emission + Langfuse logging
│           │   └── simple-agent.ts # SimpleAgent for single-prompt agents (extends BaseAgent)
│           ├── stream/
│           │   └── types.ts        # StreamEvent union type, TokenUsage
│           └── eval/
│               ├── langfuse.ts     # Langfuse client init + helpers
│               ├── scorer.ts       # LLM-as-judge scoring functions
│               └── datasets.ts     # load/run test datasets per pattern
│
├── server/
│   ├── package.json
│   ├── Dockerfile
│   └── src/
│       ├── index.ts                # Express server, loads all patterns
│       ├── routes/
│       │   ├── patterns.ts         # POST /api/patterns/:name/run → SSE stream
│       │   └── evals.ts            # POST /api/evals/:pattern/run → run eval suite
│       └── stream.ts               # StreamEmitter: agent events → SSE
│
├── frontend/
│   ├── package.json
│   ├── Dockerfile
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                  # pattern selector + layout
│       ├── components/
│       │   ├── Chat.tsx             # message list + input box
│       │   ├── MessageBubble.tsx    # agent messages with name/role badge
│       │   ├── AgentFlowSummary.tsx # compact live agent trace
│       │   ├── PatternSelector.tsx  # pattern tab buttons
│       │   ├── RightPanel.tsx       # learn panel wrapper
│       │   ├── LearnView.tsx        # per-pattern educational content
│       │   ├── MermaidDiagram.tsx   # SVG architecture diagrams
│       │   ├── CollapsibleSection.tsx # expand/collapse wrapper
│       │   └── SuggestedPrompts.tsx # try-it prompt buttons
│       ├── hooks/
│       │   └── useStream.ts         # SSE hook, parses stream events
│       ├── data/
│       │   └── pattern-content.ts   # structured educational content
│       └── types.ts
│
├── patterns/                        # NOT separate services — loaded by server at startup
│   ├── router/
│   │   ├── README.md
│   │   └── src/
│   │       ├── index.ts             # exports PatternRunner { name, description, run() }
│   │       ├── router-agent.ts
│   │       ├── specialists/         # billing.ts, technical.ts, general.ts
│   │       └── eval/
│   │           └── dataset.json     # test inputs with expected routing + quality criteria
│   ├── pipeline/
│   │   ├── README.md
│   │   └── src/
│   │       ├── index.ts
│   │       ├── pipeline.ts
│   │       ├── stages/              # researcher.ts, writer.ts, editor.ts
│   │       └── eval/
│   │           └── dataset.json
│   ├── supervisor/
│   │   ├── README.md
│   │   └── src/
│   │       ├── index.ts
│   │       ├── supervisor-agent.ts
│   │       ├── workers/             # search.ts, analysis.ts, summary.ts
│   │       └── eval/
│   │           └── dataset.json
│   ├── debate/
│   │   ├── README.md
│   │   └── src/
│   │       ├── index.ts
│   │       ├── debate-arena.ts
│   │       ├── debaters/            # bull.ts, bear.ts
│   │       ├── judge.ts
│   │       └── eval/
│   │           └── dataset.json
│   ├── swarm/
│   │   ├── README.md
│   │   └── src/
│   │       ├── index.ts
│   │       ├── swarm-runner.ts
│   │       ├── agents/              # triage.ts, sales.ts, support.ts, billing.ts
│   │       └── eval/
│   │           └── dataset.json
│   ├── map-reduce/
│   │   ├── README.md
│   │   └── src/
│   │       ├── index.ts
│   │       ├── map-reduce-runner.ts
│   │       ├── agents/              # splitter.ts, mapper.ts, reducer.ts
│   │       └── eval/
│   │           └── dataset.json
│   └── reflection/
│       ├── README.md
│       └── src/
│           ├── index.ts
│           ├── reflection-runner.ts
│           ├── agents/              # generator.ts, critic.ts
│           └── eval/
│               └── dataset.json
│
└── docs/
    └── architecture.md
```

## Core Design

### LLM Layer (provider-agnostic via Vercel AI SDK)
- **Vercel AI SDK** (`ai` + `@ai-sdk/*` provider packages) for unified multi-provider access
- Supported providers: `"anthropic"`, `"openai"`, `"google"` (extensible)
- Factory: `createProvider("anthropic", "claude-sonnet-4-20250514")`
- **Streaming** via AI SDK's `streamText` — yields content chunks
- `LLMProvider` class wraps AI SDK behind a stable API (`chat`, `chatStream`, `lastUsage`)

### Agent Base Class
- Constructor: name, role, systemPrompt, provider
- `run(input, emitter)` — emits StreamEvents, logs to Langfuse
- Emits: `agent_start`, `chunk`, `agent_end` (with usage + latency)
- Subclasses implement `execute()`
- Langfuse generation logged per LLM call (model, tokens, cost, latency)

### Server Architecture (single process, all patterns)
The Express server loads all 7 patterns at startup. Each pattern exports a `run(input, emitter)` function. No separate services per pattern.

```
┌─────────────────────────────────────────────────────┐
│  Express Server (:3001)                             │
│                                                     │
│  startup:                                           │
│    patterns = {                                     │
│      router:     import("../patterns/router"),      │
│      pipeline:   import("../patterns/pipeline"),    │
│      supervisor:  import("../patterns/supervisor"), │
│      debate:     import("../patterns/debate"),      │
│    }                                                │
│                                                     │
│  routes:                                            │
│    GET  /api/patterns          → list all patterns  │
│    POST /api/patterns/:name/run → SSE stream        │
│    POST /api/evals/:name/run   → run eval suite     │
└─────────────────────────────────────────────────────┘
```

**Pattern module** — every pattern package exports:
```typescript
export const name: string;        // "router", "pipeline", etc.
export const description: string; // one-line for the UI
export function createRunner(config: ProviderConfig): PatternRunner;

// PatternRunner (from core):
interface PatternRunner {
  run(input: string, emitter: StreamEmitter): Promise<{ output: string; totalUsage: TokenUsage }>;
}
```

### Request flow
```
1. User types "My invoice is wrong" in React UI, selects "Router"
2. Frontend: POST /api/patterns/router/run { input: "My invoice is wrong" }
   (with Accept: text/event-stream)
3. Server: looks up patterns["router"], creates StreamEmitter over SSE response
4. Server: calls router.run(input, emitter)
5. Router agent classifies intent → emits agent_start, chunk, agent_end
6. Router hands off to billing specialist → emits handoff event
7. Billing agent responds → emits agent_start, chunk, agent_end
8. Orchestrator emits done → SSE closes
9. Frontend: useStream() dispatches events to Chat + TraceView
```

### Stream Event Types
```typescript
type StreamEvent =
  | { type: "agent_start"; agent: string; role: string }
  | { type: "chunk"; agent: string; content: string }
  | { type: "handoff"; from: string; to: string; reason: string }
  | { type: "agent_end"; agent: string; durationMs: number; usage: TokenUsage }
  | { type: "error"; agent: string; message: string }
  | { type: "done"; totalUsage: TokenUsage }

type TokenUsage = { inputTokens: number; outputTokens: number }
```

### Langfuse Integration (Evals & Benchmarking — NOT tracing)
- **Langfuse self-hosted** via Docker (Postgres + Langfuse server)
- **Per-agent generation logging**: each LLM call logged as a Langfuse generation with model, tokens, cost, latency
- **Traces**: each pattern run = one Langfuse trace, agents = spans within it
- **Eval datasets**: each pattern has a `dataset.json` with test inputs + expected behaviors
- **Scoring**: LLM-as-judge scorer evaluates agent outputs on criteria:
  - Router: correct routing accuracy
  - Pipeline: output quality at each stage (coherence, completeness)
  - Supervisor: task completion, retry efficiency
  - Debate: argument quality, judge reasoning quality
- **Benchmark endpoint**: `POST /api/evals/:pattern/run` runs all dataset items, scores them, pushes results to Langfuse
- **Langfuse dashboard**: compare runs across models, track quality over time, see cost breakdowns
- **Optional**: Langfuse is not required to run patterns — if `LANGFUSE_*` env vars are missing, logging is skipped

### React Frontend
- **Single app**, pattern selector at top
- **Chat panel** (left): streaming messages with agent name/role badges
- **Trace panel** (right): inline viz building live
  - Agents as nodes, handoffs as arrows
  - Each node: name, status, token count, latency
- Tailwind CSS
- `useStream` hook for SSE

## 7 Patterns

| Pattern | Demo Scenario | Eval Criteria |
|---------|---------------|---------------|
| **Router** | Customer support routing | Routing accuracy, response relevance |
| **Pipeline** | Content creation chain | Per-stage quality, final coherence |
| **Supervisor** | Research task | Completion rate, retry count, quality |
| **Debate** | Investment analysis | Argument depth, judge reasoning |
| **Swarm** | Dynamic agent handoffs | Handoff accuracy, multi-hop routing |
| **Map-Reduce** | Multi-faceted analysis | Subtask decomposition, synthesis quality |
| **Reflection** | Iterative writing refinement | Revision depth, critique specificity |

## Docker

Pre-built multi-platform images (amd64 + arm64) are published to GHCR via GitHub Actions on every push to main.

```bash
# Pull and run pre-built images
docker compose up

# Build locally instead
docker compose up --build

# With Langfuse for evals (optional profile)
docker compose --profile langfuse up
```

- Frontend: http://localhost:3000
- Server API: http://localhost:3001
- Langfuse: http://localhost:3002 (langfuse profile only)

## Tech Stack

- TypeScript, tsx, Node 22
- npm workspaces
- Express + SSE
- React 19 + Vite + Tailwind CSS
- Langfuse JS SDK (evals, scoring, cost tracking)
- Langfuse self-hosted (Docker) + Postgres
- **Vercel AI SDK** (`ai` + `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`) for provider-agnostic LLM access

## Build Order

1. Scaffold: root config, directories, package.json files, tsconfig, .gitignore, .env.example
2. Core — LLM types + OpenAI-compatible provider with streaming
3. Core — StreamEvent types
4. Core — BaseAgent class with stream emission
5. Core — Langfuse client init + generation logging in BaseAgent
6. Server — Express with SSE endpoint
7. Pattern: Router (validates full stack end-to-end)
8. Frontend — React app with Chat + TraceView + useStream
9. Pattern: Pipeline
10. Pattern: Supervisor
11. Pattern: Debate
12. Eval — datasets per pattern + LLM-as-judge scorer + eval endpoint
13. Dockerfiles + docker-compose.yml (including Langfuse + Postgres)
14. READMEs with Mermaid diagrams
15. Root README with quick start + screenshots
16. Educational content — Learn tab with per-pattern docs, architecture, best practices, Try-it prompts

## Verification

1. `npm install` succeeds across all workspaces
2. `npm run dev` starts server + frontend locally
3. Select "Router" in UI, type a message → streaming response with agent badges
4. TraceView builds live showing agent flow
5. `docker compose up` — all services start
6. Frontend at :3000, Langfuse at :3002
7. All 7 patterns work end-to-end in the UI
8. Run `POST /api/evals/router/run` → scores appear in Langfuse dashboard
9. Langfuse shows: per-agent cost, token usage, eval scores across runs
10. Switching LLM_BASE_URL between OpenRouter and Ollama works
11. Patterns work without Langfuse env vars (graceful skip)
