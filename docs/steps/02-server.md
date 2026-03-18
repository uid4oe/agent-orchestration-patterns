# Step 2: Express Server

**Agent:** `server-builder`
**Branch:** `feat/server`
**Depends on:** Step 1 (core library)
**Blocks:** Steps 4a-4d (patterns need server to test end-to-end)

## Overview

Build the Express API server that loads patterns, exposes SSE streaming endpoints, and bridges agent events to the frontend.

## Implementation Order

### 2.1 StreamEmitter (`stream.ts`)

Wraps an Express `Response` for SSE:

```typescript
class SSEStreamEmitter implements StreamEmitter {
  constructor(private res: Response) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
  }

  emit(event: StreamEvent): void {
    this.res.write(`data: ${JSON.stringify(event)}\n\n`);
    if (event.type === "done") {
      this.res.end();
    }
  }
}
```

- Handle client disconnect: listen for `res.on("close")`, set a flag to stop emitting
- `emit()` should no-op if client disconnected

**Commit:** `feat: add SSEStreamEmitter bridging agent events to SSE`

### 2.2 Pattern Routes (`routes/patterns.ts`)

Two endpoints:

**`GET /api/patterns`**
- Returns `[{ name, description }]` for all registered patterns

**`POST /api/patterns/:name/run`**
- Body: `{ input: string }`
- Validates: pattern exists, input is non-empty string
- Creates `SSEStreamEmitter` from response
- Calls `pattern.run(input, emitter)`
- Error handling: if pattern.run throws, emit error event + done event

```typescript
router.post("/:name/run", async (req, res) => {
  const pattern = patterns[req.params.name];
  if (!pattern) return res.status(404).json({ error: "Pattern not found" });

  const { input } = req.body;
  if (!input || typeof input !== "string") return res.status(400).json({ error: "Input required" });

  const emitter = new SSEStreamEmitter(res);
  try {
    await pattern.run(input, emitter);
  } catch (err) {
    emitter.emit({ type: "error", agent: "system", message: String(err) });
    emitter.emit({ type: "done", totalUsage: { inputTokens: 0, outputTokens: 0 } });
  }
});
```

**Commit:** `feat: add pattern list and SSE run endpoints`

### 2.3 Eval Routes (`routes/evals.ts`)

**`POST /api/evals/:name/run`**
- Loads pattern's eval dataset
- Runs all items through the pattern
- Scores results
- Returns JSON summary
- Uses core eval utilities

**Commit:** `feat: add eval run endpoint`

### 2.4 Server Entry Point (`index.ts`)

- Import and configure Express
- Load `.env` via dotenv
- CORS: allow `http://localhost:3000`
- JSON body parser
- Import all 4 patterns, register in `patterns` map
- Mount routes: `/api/patterns`, `/api/evals`
- Listen on port 3001
- Log startup info (registered patterns, port)

**Commit:** `feat: add Express server entry point with pattern loading`

## Tests

- `test: add tests for SSEStreamEmitter event formatting`
- `test: add tests for pattern routes validation and error handling`

## Done When

- [ ] `npm run dev:server` starts without errors
- [ ] `GET /api/patterns` returns pattern list (empty until patterns are built)
- [ ] `POST /api/patterns/unknown/run` returns 404
- [ ] SSE format is correct: `data: {...}\n\n`
