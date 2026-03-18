# Plan: `agent-orchestration-patterns` Repository

## Context

Building a new standalone GitHub repo — an educational project demonstrating 4 common multi-agent orchestration patterns with a React frontend (live streaming + inline trace visualization), provider-agnostic LLM via OpenAI-compatible API, Langfuse for evals/benchmarking, and Docker.

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
│           │   └── base-agent.ts   # BaseAgent with stream emission + Langfuse logging
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
│       │   ├── TraceView.tsx        # inline trace viz (nodes + arrows, builds live)
│       │   └── PatternSelector.tsx  # dropdown to pick pattern
│       ├── hooks/
│       │   └── useStream.ts         # SSE hook, parses stream events
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
│   └── debate/
│       ├── README.md
│       └── src/
│           ├── index.ts
│           ├── debate-arena.ts
│           ├── debaters/            # bull.ts, bear.ts
│           ├── judge.ts
│           └── eval/
│               └── dataset.json
│
└── docs/
    └── architecture.md
```

## Core Design

### LLM Layer (provider-agnostic via OpenAI-compatible API)
- **Single adapter** using `/v1/chat/completions` format
- Works with: OpenRouter, Ollama, OpenAI, Groq, Together
- 3 env vars: `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`
- Raw `fetch`, no SDK deps
- **Streaming** via `stream: true` — yields chunks
- Default: OpenRouter. Local: Ollama at `http://localhost:11434/v1`

### Agent Base Class
- Constructor: name, role, systemPrompt, provider
- `run(input, emitter)` — emits StreamEvents, logs to Langfuse
- Emits: `agent_start`, `chunk`, `agent_end` (with usage + latency)
- Subclasses implement `execute()`
- Langfuse generation logged per LLM call (model, tokens, cost, latency)

### Server Architecture (single process, all patterns)
The Express server loads all 4 patterns at startup. Each pattern exports a `run(input, emitter)` function. No separate services per pattern.

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

**Pattern interface** — every pattern exports:
```typescript
interface PatternRunner {
  name: string;
  description: string;
  run(input: string, emitter: StreamEmitter): Promise<void>;
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

## 4 Patterns

| Pattern | Demo Scenario | Eval Criteria |
|---------|---------------|---------------|
| **Router** | Customer support routing | Routing accuracy, response relevance |
| **Pipeline** | Content creation chain | Per-stage quality, final coherence |
| **Supervisor** | Research task | Completion rate, retry count, quality |
| **Debate** | Investment analysis | Argument depth, judge reasoning |

## Docker

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: langfuse
      POSTGRES_USER: langfuse
      POSTGRES_PASSWORD: langfuse
    volumes: [pgdata:/var/lib/postgresql/data]

  langfuse:
    image: langfuse/langfuse:2
    ports: [3002:3000]
    depends_on: [postgres]
    environment:
      DATABASE_URL: postgresql://langfuse:langfuse@postgres:5432/langfuse
      NEXTAUTH_SECRET: secret
      NEXTAUTH_URL: http://localhost:3002

  server:
    build: { context: ., dockerfile: server/Dockerfile }
    ports: [3001:3001]
    depends_on: [langfuse]
    env_file: .env
    environment:
      LANGFUSE_BASEURL: http://langfuse:3000

  frontend:
    build: { context: ., dockerfile: frontend/Dockerfile }
    ports: [3000:3000]
    depends_on: [server]

volumes:
  pgdata:
```

- `docker compose up` — everything
- Frontend: http://localhost:3000
- Langfuse: http://localhost:3002

## Tech Stack

- TypeScript, tsx, Node 22
- npm workspaces
- Express + SSE
- React 19 + Vite + Tailwind CSS
- Langfuse JS SDK (evals, scoring, cost tracking)
- Langfuse self-hosted (Docker) + Postgres
- **No AI frameworks** — raw implementations

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

## Verification

1. `npm install` succeeds across all workspaces
2. `npm run dev` starts server + frontend locally
3. Select "Router" in UI, type a message → streaming response with agent badges
4. TraceView builds live showing agent flow
5. `docker compose up` — all services start
6. Frontend at :3000, Langfuse at :3002
7. All 4 patterns work end-to-end in the UI
8. Run `POST /api/evals/router/run` → scores appear in Langfuse dashboard
9. Langfuse shows: per-agent cost, token usage, eval scores across runs
10. Switching LLM_BASE_URL between OpenRouter and Ollama works
11. Patterns work without Langfuse env vars (graceful skip)
