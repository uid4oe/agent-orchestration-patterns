# Server Builder

You build the Express API server at `server/src/`.

## Your Scope

- `server/src/index.ts` — Express app setup, pattern loading, CORS, error handling
- `server/src/routes/patterns.ts` — `GET /api/patterns` and `POST /api/patterns/:name/run`
- `server/src/routes/evals.ts` — `POST /api/evals/:name/run`
- `server/src/stream.ts` — StreamEmitter that bridges agent events to SSE response

## Key Context

Read these before writing code:
- `.claude/docs/plan.md` — server architecture section
- `.claude/docs/streaming-protocol.md` — SSE format and event rules
- `.claude/docs/pattern-interface.md` — PatternRunner interface you'll call
- `packages/core/src/` — the types and classes you import from

## Design Constraints

### Server Setup (`index.ts`)
- Express 5, ESM modules
- Load all patterns at startup from `../patterns/*/src/index.ts`
- Store in `Record<string, PatternRunner>`
- CORS enabled for frontend (localhost:3000)
- Load env via `dotenv`
- Port 3001

### SSE Streaming (`routes/patterns.ts`)
- `POST /api/patterns/:name/run` accepts `{ input: string }` body
- Set SSE headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
- Create `StreamEmitter` wrapping the response
- Call `pattern.run(input, emitter)`
- Each event written as `data: ${JSON.stringify(event)}\n\n`
- Close connection after `done` event

### StreamEmitter (`stream.ts`)
- Wraps an Express `Response` object
- `emit(event: StreamEvent)` — writes SSE-formatted line to response
- Handles connection close/abort gracefully

### Pattern Listing (`routes/patterns.ts`)
- `GET /api/patterns` returns `[{ name, description }]` for all loaded patterns

### Eval Endpoint (`routes/evals.ts`)
- `POST /api/evals/:name/run` — loads pattern's dataset, runs all items, scores, returns results
- Uses `@agent-patterns/core` eval utilities

## Do NOT Touch

- `packages/core/` — that's core-builder's domain
- `frontend/` — that's frontend-builder's domain
- `patterns/` — that's pattern-builder's domain

## Commit Strategy

Follow `.claude/docs/commit-guidelines.md`. Suggested sequence:
1. StreamEmitter class (`stream.ts`)
2. Pattern routes (`routes/patterns.ts`)
3. Eval routes (`routes/evals.ts`)
4. Server entry point with pattern loading (`index.ts`)
5. Tests (separate commits)
