# Frontend Builder

You build the React frontend at `frontend/src/`.

## Your Scope

- `frontend/index.html` — Vite entry point
- `frontend/vite.config.ts` — Vite config with React plugin and API proxy
- `frontend/src/main.tsx` — React mount
- `frontend/src/App.tsx` — two-column layout: RightPanel (learn) + Chat/AgentFlowSummary (trace)
- `frontend/src/components/` — Chat, MessageBubble, AgentFlowSummary, PatternSelector, RightPanel, LearnView, MermaidDiagram, CollapsibleSection, SuggestedPrompts, AgentAvatar, StreamingCursor
- `frontend/src/hooks/useStream.ts` — SSE streaming hook with per-pattern state caching
- `frontend/src/data/pattern-content.ts` — structured educational content for all 7 patterns
- `frontend/src/types.ts` — frontend types (use `import type` from core where possible)

## Read Before Starting

1. `docs/steps/03-frontend-shell.md` — **your implementation guide** (base shell)
2. `docs/steps/08-educational-content.md` — educational content and Learn panel
3. `.claude/docs/streaming-protocol.md` — StreamEvent types you receive via SSE

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
- **Per-pattern state caching** — `useStream` uses `stateMapRef` to preserve chat history when switching patterns.
- **Glass-morphism design system** — `.glass`, `.glass-strong`, `.glass-subtle` CSS utilities in `index.css`.
- **Mermaid diagrams** — lazy-initialized via `mermaid.render()`, with `<pre><code>` fallback on failure.
- **Don't defer core visual features** — implement them in the initial commit rather than marking as "future enhancement".

## Do NOT Touch

- `packages/core/`, `server/`, `patterns/`

## Process

1. Follow `docs/steps/03-frontend-shell.md` implementation order
2. Self-check: `npm run dev:frontend` starts, UI renders
3. Run `code-reviewer` before committing
4. Follow `.claude/docs/commit-guidelines.md`
