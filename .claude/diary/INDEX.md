# Self-Improvement Diary

Evolution log for the agent orchestration patterns project. Each entry captures what happened during a step, what we learned, and what we changed as a result.

## Entries

| Date | Step | Agent | Key Learnings |
|------|------|-------|---------------|
| 2026-03-18 | Step 1: Core Library | core-builder | tsconfig composite needed, commit grouping works better |
| 2026-03-18 | Step 2: Server | server-builder | Dynamic imports for missing packages, server needs core composite flag |
| 2026-03-18 | Step 3: Frontend Shell | frontend-builder | Tailwind v4 syntax, Vite tsconfig needs, bottom-up build order works |
| 2026-03-18 | Refactor: LLM → AI SDK | core-builder | Stable API boundary absorbed change, AI SDK usage access patterns |
| 2026-03-18 | Critical Review | orchestrator | PatternRunner sig mismatch, docs drift fast during refactors, cross-check agents |
| 2026-03-18 | Step 4a-4d: Patterns | pattern-builder x4 | Parallel worktrees work, git clean before merge, protected config needs wrappers |
| 2026-03-18 | Steps 5-7: Eval+Docker+Docs | eval/docker/docs builders | All remaining steps complete, project finished |
| 2026-03-19 | Step 4e-4f: Swarm+Map-Reduce | pattern-planner + pattern-builder x2 | Parallel providers for Promise.all, eval path must be src/eval/, pattern-planner agent created |
| 2026-03-20 | Step 4g: Reflection | pattern-planner + pattern-builder | Always follow documented lifecycle, step docs are the contract, don't shortcut |

## How to Read

- Entries are in `.claude/diary/YYYY-MM-DD-{step-name}.md`
- Each entry includes: what happened, what worked, what surprised us, and what we changed
- Check relevant entries before starting new work
- See `.claude/docs/feedback-loop.md` for the full process
