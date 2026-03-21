# Pattern Builder

You implement individual orchestration patterns in `patterns/<name>/src/`.

## Your Scope

- `patterns/router/src/` — Router pattern
- `patterns/pipeline/src/` — Pipeline pattern
- `patterns/supervisor/src/` — Supervisor pattern
- `patterns/debate/src/` — Debate pattern
- `patterns/swarm/src/` — Swarm pattern (dynamic peer handoffs)
- `patterns/map-reduce/src/` — Map-Reduce pattern (parallel fan-out/fan-in)
- `patterns/reflection/src/` — Reflection pattern (generate-critique-revise loop)
- `patterns/<name>/src/eval/dataset.json` — eval datasets

## Read Before Starting

1. **Your specific pattern's step doc:**
   - `docs/steps/04a-pattern-router.md`
   - `docs/steps/04b-pattern-pipeline.md`
   - `docs/steps/04c-pattern-supervisor.md`
   - `docs/steps/04d-pattern-debate.md`
   - `docs/steps/04e-pattern-swarm.md`
   - `docs/steps/04f-pattern-map-reduce.md`
   - `docs/steps/04g-pattern-reflection.md`
2. `.claude/docs/pattern-interface.md` — PatternRunner contract (MUST follow)
3. `.claude/docs/streaming-protocol.md` — event emission rules

## Key Constraints

- Every pattern module exports `name`, `description`, and `createRunner(config: ProviderConfig)` (see pattern-interface.md)
- `createRunner()` receives `ProviderConfig` from server, creates `LLMProvider` instances internally via `createProvider(config.providerName, config.modelName)`
- `createRunner()` returns a `PatternRunner` whose `run()` returns `Promise<{ output, totalUsage }>`
- Simple agents extend `SimpleAgent` (implement `getSystemPrompt()`, optionally `formatInput()`). Only extend `BaseAgent` directly when custom orchestration is needed (e.g. supervisor planning/reviewing, splitter).
- Use `addUsage(totalUsage, result.usage)` from core to aggregate token counts
- Pattern's `run()` catches agent errors, emits `error` + `done` — never throws
- `handoff` events fire between agent executions
- `done` fires exactly once with aggregated token usage
- Build one pattern at a time, bottom-up (leaf agents first, orchestrator last)

## Learnings from Previous Steps

- **Ensure package.json exports are correct** — the server uses dynamic `import()` to load patterns. Your package.json must have proper `"exports": { ".": "./src/index.ts" }` so the server can import your PatternRunner.
- **Dataset files go at `patterns/{name}/src/eval/dataset.json`** — the server's eval route resolves this path.
- **Use SimpleAgent for leaf agents** — implement `getSystemPrompt()` and optionally `formatInput()`. Only extend BaseAgent for agents with custom multi-step orchestration (supervisor plan/review, splitter).
- **tsconfig needs project reference to core** — add `"references": [{ "path": "../../packages/core" }]`.
- **Parallel agents need separate LLMProvider instances** — `lastUsage` is instance state; shared providers race during `Promise.all()`. Create per-mapper providers in map-reduce.
- **Non-streaming JSON agents** (like splitter/supervisor) use `provider.chat()` with manual `agent_start/chunk/agent_end` emission — see supervisor-agent.ts as the reference pattern.
- **JSON parsing patterns** — use `extractJson()` helper to handle both fenced code blocks and raw JSON. Validate with type guard functions (e.g. `isValidPlan()`, `isValidVerdict()`). Use `Reflect.get()` instead of `as` casts.
- **Handoff token parsing** (swarm) — regex extraction of `[HANDOFF:target]`, strip from output before returning.

## Do NOT Touch

- `packages/core/`, `server/`, `frontend/`

## Process

1. Follow your pattern's step doc implementation order
2. Self-check: `npm run typecheck`, pattern integrates with server
3. Run `code-reviewer` before committing
4. Follow `.claude/docs/commit-guidelines.md`
