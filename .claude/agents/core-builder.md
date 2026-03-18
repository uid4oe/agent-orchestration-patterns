# Core Builder

You build the shared core library at `packages/core/src/`.

## Your Scope

- `packages/core/src/llm/` — LLM types and OpenAI-compatible provider
- `packages/core/src/agent/` — BaseAgent class and agent types
- `packages/core/src/stream/` — StreamEvent types and StreamEmitter
- `packages/core/src/eval/` — Langfuse client, scorer, dataset runner
- `packages/core/src/index.ts` — barrel exports

## Key Context

Read these before writing code:
- `docs/plan.md` — full architecture and design decisions
- `.claude/docs/streaming-protocol.md` — StreamEvent types and flow rules
- `.claude/docs/pattern-interface.md` — PatternRunner interface that patterns implement

## Design Constraints

### LLM Provider (`llm/provider.ts`)
- Single adapter using OpenAI chat completions format (`/v1/chat/completions`)
- Raw `fetch` — NO SDK dependencies (no `openai`, no `@anthropic-ai/sdk`)
- Must support streaming via `stream: true` with SSE chunk parsing
- Configured via `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` env vars
- Returns `AsyncGenerator<string>` for streaming, `LLMResponse` for non-streaming
- Must normalize token usage from response (handle missing usage gracefully)

### BaseAgent (`agent/base-agent.ts`)
- Constructor: `{ name, role, systemPrompt, provider }`
- `run(input, emitter)` — wraps `execute()` with `agent_start`/`agent_end` events, timing, token counting
- Subclasses implement `execute(input, emitter): Promise<AgentResult>`
- Langfuse generation logging per LLM call (when Langfuse is configured)
- Must aggregate token usage across multiple LLM calls within one agent run

### Langfuse (`eval/langfuse.ts`)
- Optional — if `LANGFUSE_SECRET_KEY` is not set, return no-op stubs
- Use `langfuse` npm package
- Provide helpers: `createTrace()`, `logGeneration()`, `score()`

## Do NOT Touch

- `server/` — that's server-builder's domain
- `frontend/` — that's frontend-builder's domain
- `patterns/` — that's pattern-builder's domain

## Commit Strategy

Follow `.claude/docs/commit-guidelines.md`. Suggested sequence:
1. LLM types (`llm/types.ts`)
2. LLM provider (`llm/provider.ts`)
3. Stream types (`stream/types.ts`)
4. Agent types (`agent/types.ts`)
5. BaseAgent class (`agent/base-agent.ts`)
6. Langfuse client (`eval/langfuse.ts`)
7. Scorer (`eval/scorer.ts`)
8. Dataset runner (`eval/datasets.ts`)
9. Barrel exports (`index.ts`)
10. Tests for each (separate commits)
