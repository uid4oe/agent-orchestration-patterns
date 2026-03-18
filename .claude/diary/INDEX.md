# Self-Improvement Diary

Evolution log for the agent orchestration patterns project. Each entry captures what happened during a step, what we learned, and what we changed as a result.

## Entries

| Date | Step | Agent | Key Learnings |
|------|------|-------|---------------|
| 2026-03-18 | Step 1: Core Library | core-builder | tsconfig composite needed, commit grouping works better |
| 2026-03-18 | Step 2: Server | server-builder | Dynamic imports for missing packages, server needs core composite flag |
| 2026-03-18 | Step 3: Frontend Shell | frontend-builder | Tailwind v4 syntax, Vite tsconfig needs, bottom-up build order works |
| 2026-03-18 | Refactor: LLM → AI SDK | core-builder | Stable API boundary absorbed change, AI SDK usage access patterns |

## How to Read

- Entries are in `.claude/diary/YYYY-MM-DD-{step-name}.md`
- Each entry includes: what happened, what worked, what surprised us, and what we changed
- Check relevant entries before starting new work
- See `.claude/docs/feedback-loop.md` for the full process
