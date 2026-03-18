# Streaming Protocol

## Overview

All agent execution flows through a streaming protocol. Agents emit `StreamEvent` objects via a `StreamEmitter`. The server bridges these to SSE. The frontend parses them with `useStream`.

## Stream Events

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

## Event Flow

```
agent_start("router", "classifier")
  chunk("router", "Analyzing intent...")
  chunk("router", "This is a billing question.")
agent_end("router", { durationMs: 300, usage: { inputTokens: 150, outputTokens: 20 } })
handoff("router", "billing", "billing intent detected")
agent_start("billing", "specialist")
  chunk("billing", "I can help with your invoice...")
  chunk("billing", "Let me look into that.")
agent_end("billing", { durationMs: 800, usage: { inputTokens: 200, outputTokens: 150 } })
done({ inputTokens: 350, outputTokens: 170 })
```

## StreamEmitter Interface

```typescript
interface StreamEmitter {
  emit(event: StreamEvent): void;
}
```

The server creates a `StreamEmitter` that writes each event as an SSE line:
```
data: {"type":"agent_start","agent":"router","role":"classifier"}

data: {"type":"chunk","agent":"router","content":"Analyzing..."}

data: {"type":"done","totalUsage":{"inputTokens":350,"outputTokens":170}}
```

## Rules

- Every agent execution MUST be wrapped in `agent_start` / `agent_end`
- `chunk` events stream LLM output tokens as they arrive
- `handoff` events fire BETWEEN agent executions, not during
- `agent_end` MUST include `durationMs` and `usage`
- `done` fires exactly once, at the very end, with aggregated totals
- `error` can fire at any point; the stream should still end with `done`
