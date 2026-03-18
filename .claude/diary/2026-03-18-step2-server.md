# Diary: Step 2 — Express Server

**Date:** 2026-03-18
**Agent:** server-builder
**Step:** `docs/steps/02-server.md`
**Commits:** 5 (4 feat + 1 test)
**Tests:** 14 new (43 total)

## What Happened

Built the Express server at `server/src/`:
- `stream.ts` — SSEStreamEmitter implementing StreamEmitter, handles disconnect
- `routes/patterns.ts` — GET list + POST run with SSE streaming
- `routes/evals.ts` — POST eval run endpoint
- `index.ts` — Express app with CORS, dotenv, dynamic pattern loading
- 2 test files (14 tests)

## What Worked Well

- **Dynamic imports with try/catch for missing patterns** — since pattern packages don't exist yet, the server gracefully handles `import()` failures and starts with 0 patterns. This was a smart adaptation.
- **SSEStreamEmitter disconnect handling** — clean pattern of `res.on("close")` with a `closed` flag
- **Route validation** — proper 400/404 responses before hitting SSE
- **Test mocking** — Express response mocking for SSE tests was straightforward

## What Went Wrong / Surprises

- **Core tsconfig needed `composite: true`** — the server's project reference to core failed until this was added. This was a cascade from Step 1 not setting it.
- **Pattern workspace imports** — the server `package.json` already listed `@agent-patterns/router` etc. as dependencies, but those packages don't exist. The agent correctly used dynamic imports with try/catch instead of static imports that would crash.
- **Eval route coupling** — the eval route imports from core's eval utilities. The step doc didn't specify exactly how to wire up the dataset path resolution (patterns store datasets at `patterns/{name}/src/eval/dataset.json`). The agent had to infer this.

## Learnings

- When a step depends on packages that don't exist yet, always use dynamic imports with try/catch
- Step docs should be explicit about cross-workspace file path resolution
- SSEStreamEmitter is a simple but critical piece — disconnect handling prevents memory leaks and write-after-close errors
- The patterns map design (Record<string, PatternRunner>) is clean and extensible

## Changes Made (Feedback Applied)

- Updated `server-builder.md` agent: added note about verifying project references
- Updated `pattern-builder.md` agent: will add note about ensuring the pattern's package.json exports are correct so server can import
- Created feedback loop system at `.claude/docs/feedback-loop.md`
