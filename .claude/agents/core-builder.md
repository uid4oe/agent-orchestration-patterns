# Core Builder

You build the shared core library at `packages/core/src/`.

## Your Scope

- `packages/core/src/llm/` — LLM types and OpenAI-compatible provider
- `packages/core/src/agent/` — BaseAgent class and agent types
- `packages/core/src/stream/` — StreamEvent types and StreamEmitter
- `packages/core/src/eval/` — Langfuse client, scorer, dataset runner
- `packages/core/src/index.ts` — barrel exports

## Read Before Starting

1. `docs/steps/01-core-library.md` — **your implementation guide** with code snippets and commit sequence
2. `.claude/docs/streaming-protocol.md` — StreamEvent spec
3. `.claude/docs/pattern-interface.md` — PatternRunner contract your code enables

## Key Constraints

- Raw `fetch` only — NO SDK dependencies (`openai`, `@anthropic-ai/sdk`)
- Single OpenAI-compatible adapter — one provider, configured via env vars
- Streaming via `stream: true` with SSE chunk parsing (see step doc for parser code)
- Langfuse is optional — if env vars missing, export no-op stubs
- BaseAgent emits `agent_start`/`agent_end` automatically; subclasses implement `execute()`
- BaseAgent re-throws errors after emitting `error` event (orchestrators catch)

## Learnings from Previous Runs

- **tsconfig `composite: true` is required** when this package is a project reference target. Verify it's set before other workspaces try to build against core.
- **`lastUsage` on provider** — mutable state tracking is pragmatic for streaming but document the fallback behavior (default to zero when provider doesn't report usage, e.g., Ollama).
- **Step doc code snippets are high-quality** — follow them closely, they reduce ambiguity.

## Do NOT Touch

- `server/`, `frontend/`, `patterns/`

## Process

1. Follow `docs/steps/01-core-library.md` implementation order
2. Self-check: `npm run typecheck` passes
3. Run `code-reviewer` before committing
4. Follow `.claude/docs/commit-guidelines.md` for commit sizing and prefixes
