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

- Constructor takes `LLMConfig` (or reads from env with validation)
- `chat(messages: ChatMessage[]): Promise<LLMResponse>` — non-streaming
- `chatStream(messages: ChatMessage[]): AsyncGenerator<string>` — streaming, yields content chunks
- Uses raw `fetch`, no SDK
- Measures latency internally

**Env validation on construction:**
```typescript
const baseUrl = config?.baseUrl ?? process.env.LLM_BASE_URL;
const apiKey = config?.apiKey ?? process.env.LLM_API_KEY;
const model = config?.model ?? process.env.LLM_MODEL;
if (!baseUrl || !apiKey || !model) {
  throw new Error("LLM_BASE_URL, LLM_API_KEY, and LLM_MODEL are required");
}
```

**SSE streaming parser for `chatStream()`:**
```typescript
async *chatStream(messages: ChatMessage[]): AsyncGenerator<string> {
  const res = await fetch(`${this.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.apiKey}`,
    },
    body: JSON.stringify({ model: this.model, messages, stream: true }),
  });

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop()!; // keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") return;

      const parsed = JSON.parse(data);
      const content = parsed.choices?.[0]?.delta?.content;
      if (content) yield content;
    }
  }
}
```

**Token usage extraction** — read from the final non-streamed call or from `usage` field in the last SSE chunk (OpenRouter includes this). Default to `{ inputTokens: 0, outputTokens: 0 }` if provider doesn't report usage (Ollama).

**Error handling** — if `fetch` fails or returns non-200, throw with status and body. Callers (BaseAgent) handle the error.

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

```typescript
abstract class BaseAgent {
  constructor(protected config: AgentConfig) {}

  async run(input: string, emitter: StreamEmitter): Promise<AgentResult> {
    const start = Date.now();
    emitter.emit({ type: "agent_start", agent: this.config.name, role: this.config.role });

    try {
      const result = await this.execute(input, emitter);
      const durationMs = Date.now() - start;
      emitter.emit({ type: "agent_end", agent: this.config.name, durationMs, usage: result.usage });
      return { ...result, durationMs };
    } catch (err) {
      emitter.emit({ type: "error", agent: this.config.name, message: String(err) });
      throw err; // re-throw — pattern orchestrator catches and emits "done"
    }
  }

  protected abstract execute(input: string, emitter: StreamEmitter): Promise<AgentResult>;

  /** Helper: stream LLM response, emit chunks, return full output + usage */
  protected async chatStream(
    messages: ChatMessage[],
    emitter: StreamEmitter
  ): Promise<{ output: string; usage: TokenUsage }> {
    let output = "";
    for await (const chunk of this.config.provider.chatStream(messages)) {
      output += chunk;
      emitter.emit({ type: "chunk", agent: this.config.name, content: chunk });
    }
    const usage = this.config.provider.lastUsage ?? { inputTokens: 0, outputTokens: 0 };
    return { output, usage };
  }
}
```

**Error handling contract:**
- `execute()` may throw — BaseAgent emits `error` event AND re-throws
- Pattern orchestrators (router, pipeline, etc.) catch errors and emit `done`
- This means agents don't swallow errors — the orchestrator decides what to do

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
