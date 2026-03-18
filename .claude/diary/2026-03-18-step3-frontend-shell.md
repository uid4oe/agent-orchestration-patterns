# Diary: Step 3 — Frontend Shell

**Date:** 2026-03-18
**Agent:** frontend-builder
**Step:** `docs/steps/03-frontend-shell.md`
**Commits:** 9 (1 chore + 7 feat + 1 test)
**Tests:** 14 new (57 total)

## What Happened

Built the complete React frontend with Vite, Tailwind v4, and all components:
- Vite config with React plugin, Tailwind v4 plugin, API proxy
- Frontend types with `import type` from core
- useStream SSE hook with full state machine
- MessageBubble, Chat, TraceView, PatternSelector components
- App layout with two-panel responsive design
- Dark developer-tool theme

## What Worked Well

- **Bottom-up build order worked perfectly** — types → hook → leaf components → parents → App
- **`import type` from core** — clean type sharing without runtime coupling
- **Exported pure functions from useStream** (`parseSSELines`, `reduceEvent`) — made testing straightforward without needing React test utilities
- **Tailwind v4 with `@tailwindcss/vite` plugin** — simpler setup than v3 (no config file needed)

## What Went Wrong / Surprises

- **tsconfig needed `allowImportingTsExtensions` and `noEmit`** — bundler mode with Vite requires these for `.ts` imports to work. Step doc didn't mention this.
- **`verbatimModuleSyntax: true`** — this was already in tsconfig but the step doc's type examples didn't use explicit `import type` syntax. The agent had to adapt.
- **Tailwind v4 import syntax** — v4 uses `@import "tailwindcss"` in CSS, not the old `@tailwind` directives. This wasn't in the step doc.

## Learnings

- Frontend tsconfig for Vite needs different settings than Node packages — document this gap
- Always check the actual Tailwind/Vite version and use the right syntax (v4 is different from v3)
- Exporting pure reducer functions from hooks makes testing much easier

## Changes Made (Feedback Applied)

- Updated `frontend-builder.md` agent: will add Tailwind v4 and Vite tsconfig notes
