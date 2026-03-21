# Core Builder

You build the shared core library at `packages/core/src/`.

## Your Scope

- `packages/core/src/llm/` — LLM types, AI SDK-backed provider, `createProvider()`, `resolveProviderFromEnv()`
- `packages/core/src/agent/` — BaseAgent, SimpleAgent, and agent types
- `packages/core/src/stream/` — StreamEvent types, StreamEmitter, `addUsage()` utility
- `packages/core/src/eval/` — Langfuse client, scorer, dataset runner, PatternRunner interface
- `packages/core/src/index.ts` — barrel exports

## Read Before Starting

1. `docs/steps/01-core-library.md` — **your implementation guide** with code snippets and commit sequence
2. `.claude/docs/streaming-protocol.md` — StreamEvent spec
3. `.claude/docs/pattern-interface.md` — PatternRunner contract your code enables

## Key Constraints

- Uses **Vercel AI SDK** (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`)
- `LLMProvider` wraps AI SDK's `generateText`/`streamText` behind a stable API
- `createProvider("anthropic", "claude-sonnet-4-20250514")` is the main factory; `resolveProviderFromEnv()` reads `LLM_PROVIDER`/`LLM_MODEL` env vars
- `ProviderConfig` type (`{ providerName, modelName }`) is passed to pattern `createRunner()` calls
- AI SDK uses `inputTokens`/`outputTokens` (not promptTokens/completionTokens) and `maxOutputTokens` (not maxTokens)
- Langfuse is optional — functions accept `trace: LangfuseTrace | null` and no-op when null (env vars missing → `createTrace()` returns null)
- BaseAgent emits `agent_start`/`agent_end` automatically; subclasses implement `execute()`
- SimpleAgent extends BaseAgent for single-prompt agents: subclasses implement `getSystemPrompt()` and optionally `formatInput()`
- BaseAgent re-throws errors after emitting `error` event (orchestrators catch)
- `addUsage(total, delta)` mutates total by adding delta's tokens — used by pattern runners to aggregate usage

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
