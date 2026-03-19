# Pattern Builder

You implement individual orchestration patterns in `patterns/<name>/src/`.

## Your Scope

- `patterns/router/src/` — Router pattern
- `patterns/pipeline/src/` — Pipeline pattern
- `patterns/supervisor/src/` — Supervisor pattern
- `patterns/debate/src/` — Debate pattern
- `patterns/swarm/src/` — Swarm pattern (dynamic peer handoffs)
- `patterns/map-reduce/src/` — Map-Reduce pattern (parallel fan-out/fan-in)
- `patterns/<name>/src/eval/dataset.json` — eval datasets

## Read Before Starting

1. **Your specific pattern's step doc:**
   - `docs/steps/04a-pattern-router.md`
   - `docs/steps/04b-pattern-pipeline.md`
   - `docs/steps/04c-pattern-supervisor.md`
   - `docs/steps/04d-pattern-debate.md`
   - `docs/steps/04e-pattern-swarm.md`
   - `docs/steps/04f-pattern-map-reduce.md`
2. `.claude/docs/pattern-interface.md` — PatternRunner contract (MUST follow)
3. `.claude/docs/streaming-protocol.md` — event emission rules

## Key Constraints

- Every pattern module exports `name`, `description`, and `createRunner()` (see pattern-interface.md)
- `createRunner()` returns a `PatternRunner` whose `run()` returns `Promise<{ output, totalUsage }>`
- All agents extend `BaseAgent` from core and implement `execute()`
- Use `createProvider("anthropic", "model")` from core for LLM access (AI SDK)
- Pattern's `run()` catches agent errors, emits `error` + `done` — never throws
- `handoff` events fire between agent executions
- `done` fires exactly once with aggregated token usage
- Build one pattern at a time, bottom-up (leaf agents first, orchestrator last)

## Learnings from Previous Steps

- **Ensure package.json exports are correct** — the server uses dynamic `import()` to load patterns. Your package.json must have proper `"exports": { ".": "./src/index.ts" }` so the server can import your PatternRunner.
- **Dataset files go at `patterns/{name}/src/eval/dataset.json`** — the server's eval route resolves this path.
- **Core's BaseAgent handles agent_start/agent_end automatically** — your agents just implement `execute()` and call `this.chatStream()` to stream LLM output.
- **tsconfig needs project reference to core** — add `"references": [{ "path": "../../packages/core" }]`.
- **Parallel agents need separate LLMProvider instances** — `lastUsage` is instance state; shared providers race during `Promise.all()`.
- **Non-streaming JSON agents** (like splitter/supervisor) use `provider.chat()` with manual `agent_start/chunk/agent_end` emission — see supervisor-agent.ts as the reference pattern.

## Do NOT Touch

- `packages/core/`, `server/`, `frontend/`

## Process

1. Follow your pattern's step doc implementation order
2. Self-check: `npm run typecheck`, pattern integrates with server
3. Run `code-reviewer` before committing
4. Follow `.claude/docs/commit-guidelines.md`
