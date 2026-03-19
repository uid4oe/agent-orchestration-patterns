# Diary: Step 4e-4f — Swarm + Map-Reduce Patterns

**Date:** 2026-03-19
**Agent:** pattern-planner + pattern-builder (x2 parallel)
**Step:** `docs/steps/04e-pattern-swarm.md`, `docs/steps/04f-pattern-map-reduce.md`
**Tests:** 39 new (swarm: 23, map-reduce: 16)

## What Happened

Added two new orchestration patterns to the existing 4:

- **Swarm** (4e): 4 peer agents (triage, sales, support, billing) that dynamically hand off to each other using `[HANDOFF:target]` directives. No central router — routing emerges from agent decisions. Max 5 handoffs to prevent loops.
- **Map-Reduce** (4f): Splitter produces JSON subtasks, N mappers run in parallel via `Promise.all()`, reducer synthesizes all outputs. Demonstrates fan-out/fan-in parallelism.

Also created:
- `pattern-planner` agent for repeatable pattern additions
- Step docs for both patterns
- Updated docs/plan.md, CLAUDE.md, pattern-builder agent scope
- Saved memory for future sessions

## What Worked Well

- **Parallel worktree execution** again proved effective — both patterns built simultaneously in isolated worktrees with no conflicts
- **Existing patterns as reference** — the agents correctly followed router/supervisor/debate conventions (provider resolution, error handling, event lifecycle)
- **Pattern-planner agent creation** — codifies the full lifecycle so future pattern additions are consistent
- **Memory system** — saved workflow so future sessions know the process

## What Went Wrong / Surprises

- **Map-reduce eval dataset placed at wrong path** — the agent put it at `eval/dataset.json` (top-level) instead of `src/eval/dataset.json`. Had to manually fix. This is despite the pattern-builder learnings doc explicitly stating the correct path.
- **Worktree cleanup needed** — vitest picked up tests from worktree directories, running them twice (420 tests instead of ~170). Had to clean up worktrees.
- **dist/ artifacts in worktrees** — the agents ran `tsc --build` in their worktrees, creating dist/ directories. These shouldn't be committed.

## Learnings

- Always verify eval dataset path is `src/eval/dataset.json` not `eval/dataset.json`
- Clean up worktrees immediately after copying files to avoid test runner picking up duplicates
- Add `.claude/worktrees/` to `.gitignore` if not already there
- The pattern-planner agent + memory system makes pattern additions fully repeatable

## Changes Made (Feedback Applied)

- Updated `.claude/agents/pattern-builder.md`: added swarm + map-reduce to scope, added learnings about parallel providers and non-streaming JSON agents
- Created `.claude/agents/pattern-planner.md`: full lifecycle agent for new pattern additions
- Updated `CLAUDE.md`: added "Adding a New Pattern" section, pattern-planner to agent table, new steps to step table
- Saved memory at `memory/pattern_planner_workflow.md`
