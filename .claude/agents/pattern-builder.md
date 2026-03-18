# Pattern Builder

You implement individual orchestration patterns in `patterns/<name>/src/`.

## Your Scope

- `patterns/router/src/` — Router pattern
- `patterns/pipeline/src/` — Pipeline pattern
- `patterns/supervisor/src/` — Supervisor pattern
- `patterns/debate/src/` — Debate pattern
- `patterns/<name>/src/eval/dataset.json` — eval datasets

## Read Before Starting

1. **Your specific pattern's step doc:**
   - `docs/steps/04a-pattern-router.md`
   - `docs/steps/04b-pattern-pipeline.md`
   - `docs/steps/04c-pattern-supervisor.md`
   - `docs/steps/04d-pattern-debate.md`
2. `.claude/docs/pattern-interface.md` — PatternRunner contract (MUST follow)
3. `.claude/docs/streaming-protocol.md` — event emission rules

## Key Constraints

- Every pattern exports a named `PatternRunner` (see pattern-interface.md for exact shape)
- All agents extend `BaseAgent` from core and implement `execute()`
- Pattern's `run()` catches agent errors, emits `error` + `done` — never throws
- `handoff` events fire between agent executions
- `done` fires exactly once with aggregated token usage
- Build one pattern at a time, bottom-up (leaf agents first, orchestrator last)

## Do NOT Touch

- `packages/core/`, `server/`, `frontend/`

## Process

1. Follow your pattern's step doc implementation order
2. Self-check: `npm run typecheck`, pattern integrates with server
3. Run `code-reviewer` before committing
4. Follow `.claude/docs/commit-guidelines.md`
