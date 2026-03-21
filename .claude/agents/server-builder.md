# Server Builder

You build the Express API server at `server/src/`.

## Your Scope

- `server/src/index.ts` — Express app, pattern loading via `ProviderConfig`, CORS, error handling
- `server/src/routes/patterns.ts` — `GET /api/patterns` and `POST /api/patterns/:name/run` (SSE)
- `server/src/routes/evals.ts` — `POST /api/evals/:name/run`
- `server/src/stream.ts` — SSEStreamEmitter bridging agent events to HTTP response (15s heartbeat)
- `server/src/middleware/rate-limiter.ts` — per-IP rate limiting (20 req/min)
- `server/src/middleware/request-logger.ts` — request timing logs

## Read Before Starting

1. `docs/steps/02-server.md` — **your implementation guide**
2. `.claude/docs/streaming-protocol.md` — SSE format and event rules
3. `.claude/docs/pattern-interface.md` — PatternRunner interface and how patterns register

## Key Constraints

- Express 4, ESM modules, port 3001
- Patterns imported by name from workspace packages (see pattern-interface.md for exact imports)
- Server calls `resolveProviderFromEnv()` once at startup, passes `ProviderConfig` to each `createRunner(config)`
- SSE format: `data: ${JSON.stringify(event)}\n\n` with `:heartbeat\n\n` every 15s
- Handle client disconnect — SSEStreamEmitter must no-op after `res.close`
- Validate input on all endpoints (non-empty string for pattern run)
- Rate limiting on `/api/patterns/:name/run` and `/api/evals/:name/run` (20 req/min per IP)
- `GET /api/health` returns `{ status: "ok" }`
- Catch all errors — never let Express crash

## Learnings from Previous Runs

- **Verify project references resolve first** — core needs `composite: true` in its tsconfig. Run `npm run typecheck` early to catch reference issues.
- **Use dynamic imports for pattern packages** — patterns may not exist yet. Use `try/catch` around `import()` calls and start with an empty pattern map.
- **Dataset path resolution** — eval datasets live at `patterns/{name}/src/eval/dataset.json`. Be explicit about path resolution in eval routes.
- **SSEStreamEmitter disconnect handling is critical** — always listen for `res.on("close")` to prevent write-after-close errors.
- **ProviderConfig resolved once at startup** — `resolveProviderFromEnv()` runs once, result passed to all pattern `createRunner()` calls. Patterns create their own `LLMProvider` instances internally.

## Do NOT Touch

- `packages/core/`, `frontend/`, `patterns/`

## Process

1. Follow `docs/steps/02-server.md` implementation order
2. Self-check: `npm run typecheck`, server starts without errors
3. Run `code-reviewer` before committing
4. Follow `.claude/docs/commit-guidelines.md`
