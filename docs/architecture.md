# Architecture

## System Overview

```mermaid
graph TB
    subgraph Frontend ["Frontend (React + Vite :3000)"]
        UI[Pattern Selector + Chat + Trace View]
        Hook[useStream Hook]
        UI --> Hook
    end

    subgraph Server ["Express Server :3001"]
        Routes["/api/patterns/:name/run"]
        SSE[SSEStreamEmitter]
        EvalRoute["/api/evals/:name/run"]
        Routes --> SSE
    end

    subgraph Patterns ["Pattern Runners"]
        R[Router]
        P[Pipeline]
        S[Supervisor]
        D[Debate]
    end

    subgraph Core ["@agent-patterns/core"]
        BA[BaseAgent]
        LLM[LLMProvider]
        ST[StreamEmitter]
        EV[Eval Utilities]
        BA --> LLM
        BA --> ST
    end

    Hook -->|"POST + SSE"| Routes
    SSE --> R & P & S & D
    R & P & S & D --> BA
    LLM -->|"Vercel AI SDK"| Provider["Anthropic / OpenAI / Google"]
    EvalRoute --> EV
```

## Streaming Flow

Every pattern run follows the same SSE streaming protocol. The server wraps an Express response in an `SSEStreamEmitter`, which agents use to emit events as they execute.

```mermaid
sequenceDiagram
    participant Client as React Frontend
    participant Server as Express Server
    participant Pattern as Pattern Runner
    participant Agent as BaseAgent
    participant LLM as LLM Provider

    Client->>Server: POST /api/patterns/:name/run {input}
    Server->>Server: Set SSE headers (text/event-stream)
    Server->>Pattern: runner.run(input, emitter)

    Pattern->>Agent: agent.run(input, emitter)
    Agent-->>Client: SSE: agent_start {agent, role}
    Agent->>LLM: chatStream(messages)
    loop Each chunk
        LLM-->>Agent: text chunk
        Agent-->>Client: SSE: chunk {agent, content}
    end
    Agent-->>Client: SSE: agent_end {agent, durationMs, usage}

    Pattern-->>Client: SSE: handoff {from, to, reason}

    Note over Pattern,Agent: Next agent runs...

    Pattern-->>Client: SSE: done {totalUsage}
    Server->>Server: res.end()
```

### Event Types

```
agent_start  -> An agent begins processing
chunk        -> Streaming text content from an agent
handoff      -> Control transfers between agents
agent_end    -> Agent finished (includes duration + token usage)
error        -> Agent-level error occurred
done         -> Pattern run complete (includes total token usage)
```

Events are JSON-encoded and sent as SSE `data:` lines:

```
data: {"type":"agent_start","agent":"router","role":"classifier"}

data: {"type":"chunk","agent":"router","content":"BILLING"}

data: {"type":"agent_end","agent":"router","durationMs":342,"usage":{"inputTokens":85,"outputTokens":1}}

data: {"type":"handoff","from":"router","to":"billing","reason":"billing intent detected"}

data: {"type":"done","totalUsage":{"inputTokens":230,"outputTokens":145}}
```

## Pattern Interface

Every pattern exports the same shape. The server dynamically imports all four at startup.

```mermaid
classDiagram
    class PatternModule {
        +name: string
        +description: string
        +createRunner() PatternRunner
    }

    class PatternRunner {
        +run(input: string, emitter: StreamEmitter) Promise~Result~
    }

    class StreamEmitter {
        +emit(event: StreamEvent) void
    }

    class BaseAgent {
        +run(input: string, emitter: StreamEmitter) Promise~AgentResult~
        #execute(input: string, emitter: StreamEmitter) Promise~AgentResult~
        #chatStream(messages, emitter) Promise~Result~
    }

    PatternModule --> PatternRunner : creates
    PatternRunner --> StreamEmitter : emits events to
    PatternRunner --> BaseAgent : orchestrates
    BaseAgent --> StreamEmitter : emits events to
```

## Workspace Dependencies

```mermaid
graph TD
    Core["@agent-patterns/core"]
    Server["server"]
    Frontend["frontend"]
    Router["@agent-patterns/router"]
    Pipeline["@agent-patterns/pipeline"]
    Supervisor["@agent-patterns/supervisor"]
    Debate["@agent-patterns/debate"]

    Server --> Core
    Server --> Router
    Server --> Pipeline
    Server --> Supervisor
    Server --> Debate
    Router --> Core
    Pipeline --> Core
    Supervisor --> Core
    Debate --> Core
    Frontend -.->|"type-only imports"| Core
```

Strict boundaries: `packages/core` imports nothing from other workspaces. The frontend only uses type-only imports from core (no runtime dependencies). Patterns depend exclusively on core.

## LLM Provider Layer

The `LLMProvider` class wraps Vercel AI SDK behind a stable internal API. It supports three providers via `createProvider()`:

| Provider | Package | Example Model |
|----------|---------|---------------|
| `anthropic` | `@ai-sdk/anthropic` | `claude-sonnet-4-20250514` |
| `openai` | `@ai-sdk/openai` | `gpt-4o-mini` |
| `google` | `@ai-sdk/google` | `gemini-2.0-flash` |

Two methods: `chat()` for single-shot responses (used by supervisor planning/review), and `chatStream()` for streaming (used by all agent `execute()` calls via `BaseAgent.chatStream()`).

## Eval System

The eval system runs pattern test datasets and scores outputs using LLM-as-judge.

```mermaid
graph LR
    Dataset["dataset.json<br/>(test inputs + criteria)"] --> Runner["runEval()"]
    Runner --> Pattern["Pattern.run()"]
    Pattern --> Output["Agent output"]
    Output --> Scorer["scoreLLMAsJudge()"]
    Scorer --> LLM["Eval LLM"]
    LLM --> Scores["Score 0-10 + reasoning"]
    Scores -.-> Langfuse["Langfuse (optional)"]
```

- Each pattern has an `eval/dataset.json` with test inputs and expected behaviors
- `POST /api/evals/:name/run` runs the full dataset and returns scored results
- Langfuse integration is optional -- if `LANGFUSE_*` env vars are missing, logging is skipped
- Eval uses a separate `EVAL_MODEL` env var (defaults to `gpt-4o-mini`)

## Frontend Architecture

The React app uses a single `useStream` hook to manage all SSE state. The hook connects to the server, parses SSE events, and reduces them into chat messages and trace graph data.

| Component | Role |
|-----------|------|
| `PatternSelector` | Dropdown to pick which pattern to run |
| `Chat` | Message list with agent name/role badges + input box |
| `TraceView` | Live trace visualization -- agents as nodes, handoffs as edges |
| `useStream` | SSE hook -- parses events, maintains messages + trace state |

The chat panel and trace panel update simultaneously as events stream in. The trace view builds a live graph showing agent execution flow with status indicators, token counts, and latency.
