# Server Builder

You build the Express API server at `server/src/`.

## Your Scope

- `server/src/index.ts` — Express app, pattern loading, CORS, error handling
- `server/src/routes/patterns.ts` — `GET /api/patterns` and `POST /api/patterns/:name/run` (SSE)
- `server/src/routes/evals.ts` — `POST /api/evals/:name/run`
- `server/src/stream.ts` — SSEStreamEmitter bridging agent events to HTTP response

## Read Before Starting

1. `docs/steps/02-server.md` — **your implementation guide**
2. `.claude/docs/streaming-protocol.md` — SSE format and event rules
3. `.claude/docs/pattern-interface.md` — PatternRunner interface and how patterns register

## Key Constraints

- Express 4, ESM modules, port 3001
- Patterns imported by name from workspace packages (see pattern-interface.md for exact imports)
- SSE format: `data: ${JSON.stringify(event)}\n\n`
- Handle client disconnect — SSEStreamEmitter must no-op after `res.close`
- Validate input on all endpoints (non-empty string for pattern run)
- Catch all errors — never let Express crash

## Do NOT Touch

- `packages/core/`, `frontend/`, `patterns/`

## Process

1. Follow `docs/steps/02-server.md` implementation order
2. Self-check: `npm run typecheck`, server starts without errors
3. Run `code-reviewer` before committing
4. Follow `.claude/docs/commit-guidelines.md`
