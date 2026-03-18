# Step 1: Core Library

**Agent:** `core-builder`
**Branch:** `feat/core-library`
**Depends on:** nothing (first step)
**Blocks:** all subsequent steps

## Overview

Build the shared library at `packages/core/src/`. Everything else depends on this — LLM provider, agent base class, stream types, and Langfuse integration.

## Implementation Order

### 1.1 LLM Types (`llm/types.ts`)

```typescript
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMResponse {
  content: string;
  usage: TokenUsage;
  model: string;
  latencyMs: number;
}

interface LLMConfig {
  baseUrl: string;    // from LLM_BASE_URL
  apiKey: string;     // from LLM_API_KEY
  model: string;      // from LLM_MODEL
  temperature?: number;
  maxTokens?: number;
}
```

**Commit:** `feat: add LLM types and ChatMessage interface`

### 1.2 Stream Types (`stream/types.ts`)

```typescript
interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

type StreamEvent =
  | { type: "agent_start"; agent: string; role: string }
  | { type: "chunk"; agent: string; content: string }
  | { type: "handoff"; from: string; to: string; reason: string }
  | { type: "agent_end"; agent: string; durationMs: number; usage: TokenUsage }
  | { type: "error"; agent: string; message: string }
  | { type: "done"; totalUsage: TokenUsage }

interface StreamEmitter {
  emit(event: StreamEvent): void;
}
```

**Commit:** `feat: add StreamEvent types and StreamEmitter interface`

### 1.3 LLM Provider (`llm/provider.ts`)

Single class using OpenAI-compatible `/v1/chat/completions`:

- Constructor takes `LLMConfig` (or reads from env)
- `chat(messages: ChatMessage[]): Promise<LLMResponse>` — non-streaming
- `chatStream(messages: ChatMessage[]): AsyncGenerator<string>` — streaming, yields content chunks
- Uses raw `fetch`, no SDK
- Handles streaming SSE parsing (`data: [DONE]`, `data: {...}`)
- Extracts token usage from final response (handle missing gracefully — Ollama may not report it)
- Measures latency internally

**Commit:** `feat: implement OpenAI-compatible LLM provider with streaming`

### 1.4 Agent Types (`agent/types.ts`)

```typescript
interface AgentConfig {
  name: string;
  role: string;
  systemPrompt: string;
  provider: LLMProvider;
}

interface AgentResult {
  output: string;
  usage: TokenUsage;
  durationMs: number;
}
```

**Commit:** `feat: add AgentConfig and AgentResult types`

### 1.5 BaseAgent (`agent/base-agent.ts`)

Abstract class:

- Constructor takes `AgentConfig`
- `run(input: string, emitter: StreamEmitter): Promise<AgentResult>`:
  - Emits `agent_start` with name and role
  - Calls `this.execute(input, emitter)` (abstract)
  - Measures duration
  - Emits `agent_end` with duration and token usage
  - Returns `AgentResult`
  - Catches errors → emits `error` event, re-throws
- Protected `chatStream(messages, emitter)` helper:
  - Calls provider.chatStream()
  - For each chunk: emits `chunk` event AND accumulates full response
  - Returns full response + usage
- Subclasses implement `execute(input, emitter): Promise<AgentResult>`

**Commit:** `feat: implement BaseAgent with streaming and event emission`

### 1.6 Langfuse Integration (`eval/langfuse.ts`)

- Check for `LANGFUSE_SECRET_KEY` env var — if missing, export no-op stubs
- Initialize Langfuse client
- Export helpers:
  - `createTrace(name)` → returns trace object
  - `logGeneration({ trace, name, model, input, output, usage, latencyMs })`
  - `score({ trace, name, value, comment })`
- Wire into BaseAgent: if Langfuse is configured, log each LLM call as a generation

**Commit:** `feat: add optional Langfuse integration for eval logging`

### 1.7 Eval Scorer (`eval/scorer.ts`)

- `scoreLLMAsJudge({ provider, criteria, input, output })` — asks LLM to rate output 0-1 on given criteria
- Returns `{ score: number; reasoning: string }`

**Commit:** `feat: add LLM-as-judge scorer for eval`

### 1.8 Dataset Runner (`eval/datasets.ts`)

- `loadDataset(path)` — reads JSON dataset file
- `runEval({ pattern, dataset, provider, scorer })` — runs all items, collects scores
- Returns `{ results: Array<{ input, output, scores }>, averages }`

**Commit:** `feat: add eval dataset loader and runner`

### 1.9 Barrel Exports (`index.ts`)

Export everything from a single entry point.

**Commit:** `feat: add core barrel exports`

## Tests

After all implementation:
- `test: add tests for LLM provider streaming and error handling`
- `test: add tests for BaseAgent event emission`
- `test: add tests for StreamEmitter`

## Done When

- [ ] `npm run typecheck` passes for packages/core
- [ ] LLM provider can call OpenRouter and Ollama
- [ ] BaseAgent emits correct stream events in order
- [ ] Langfuse logging works when configured, silently skips when not
