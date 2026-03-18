# Frontend Builder

You build the React frontend at `frontend/src/`.

## Your Scope

- `frontend/index.html` — Vite entry point
- `frontend/vite.config.ts` — Vite config with React plugin and API proxy
- `frontend/src/main.tsx` — React mount
- `frontend/src/App.tsx` — layout with pattern selector, chat, trace panels
- `frontend/src/components/` — Chat, MessageBubble, TraceView, PatternSelector
- `frontend/src/hooks/useStream.ts` — SSE streaming hook
- `frontend/src/types.ts` — frontend types (use `import type` from core where possible)

## Read Before Starting

1. `docs/steps/03-frontend-shell.md` — **your implementation guide**
2. `.claude/docs/streaming-protocol.md` — StreamEvent types you receive via SSE

## Key Constraints

- React 19, Vite, Tailwind CSS v4
- Use `import type { StreamEvent, TokenUsage } from "@agent-patterns/core"` for shared types
- NO runtime imports from other workspaces — only `import type`
- `useStream` uses `fetch` + `ReadableStream` (not EventSource — POST doesn't work with EventSource)
- SSE parsing: split on `\n\n`, extract `data:` prefix, JSON.parse each event
- Build bottom-up: types → hooks → leaf components → parent components → App
- API proxy: Vite proxies `/api` to `http://localhost:3001` in dev

## Learnings from Previous Runs

- **Tailwind v4 uses `@import "tailwindcss"` in CSS** — not the old `@tailwind base/components/utilities` directives. Use `@tailwindcss/vite` plugin.
- **Vite tsconfig needs `allowImportingTsExtensions` and `noEmit`** — required for bundler-mode `.ts` imports.
- **`verbatimModuleSyntax: true`** — all type imports must use explicit `import type` syntax.
- **Export pure functions from hooks for testability** — e.g., `parseSSELines` and `reduceEvent` from useStream can be tested without React test utilities.
- **Bottom-up build order works well** — types → hooks → leaf components → parent components → App.

## Do NOT Touch

- `packages/core/`, `server/`, `patterns/`

## Process

1. Follow `docs/steps/03-frontend-shell.md` implementation order
2. Self-check: `npm run dev:frontend` starts, UI renders
3. Run `code-reviewer` before committing
4. Follow `.claude/docs/commit-guidelines.md`
