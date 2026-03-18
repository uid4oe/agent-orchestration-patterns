# Diary: Step 1 — Core Library

**Date:** 2026-03-18
**Agent:** core-builder
**Step:** `docs/steps/01-core-library.md`
**Commits:** 6 (5 feat + 1 test)
**Tests:** 29 passing

## What Happened

Built the entire `packages/core/` library from empty directories:
- `llm/types.ts` — ChatMessage, LLMResponse, LLMConfig
- `llm/provider.ts` — OpenAI-compatible LLM provider with streaming SSE parser
- `stream/types.ts` — TokenUsage, StreamEvent union, StreamEmitter interface
- `agent/types.ts` — AgentConfig, AgentResult
- `agent/base-agent.ts` — Abstract BaseAgent with run/execute pattern, chatStream helper
- `eval/langfuse.ts` — Optional Langfuse with no-op stubs
- `eval/scorer.ts` — LLM-as-judge scorer
- `eval/datasets.ts` — Dataset loader and eval runner
- `index.ts` — Barrel exports
- 3 test files (29 tests total)

## What Worked Well

- **Step doc code snippets were directly usable** — the agent could follow them closely, reducing ambiguity
- **Commit grouping from commit-guidelines.md** — grouping LLM types + stream types in one commit (shared contract types) was efficient and made sense
- **Test isolation** — mocking fetch for LLM provider tests worked cleanly
- **Agent stayed in scope** — didn't touch server/frontend/patterns

## What Went Wrong / Surprises

- **tsconfig `composite: true` was missing** — the core package's tsconfig needed `composite: true` for project references to work. The step doc didn't mention this because the scaffold was assumed to have it. The server-builder had to add it later.
- **`lastUsage` design decision** — the step doc mentioned tracking usage via `lastUsage` property on the provider but didn't specify the exact mechanism. The agent had to make a design choice about whether to track it on streaming responses (where usage often comes in the final chunk).

## Learnings

- Step docs should mention tsconfig requirements when a package is a project reference
- When a spec says "read from final SSE chunk", be explicit about fallback behavior (Ollama doesn't send usage)
- The `lastUsage` pattern (mutable state on provider) is slightly awkward but pragmatic for streaming

## Changes Made (Feedback Applied)

- Updated `core-builder.md` agent: added note about tsconfig composite requirement
- Updated `server-builder.md` agent: added note to verify project references resolve before coding
