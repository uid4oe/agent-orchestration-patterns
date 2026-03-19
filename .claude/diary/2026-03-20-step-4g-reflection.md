# Diary: Step 4g — Reflection Pattern

**Date:** 2026-03-20
**Agent:** pattern-planner + pattern-builder + code-reviewer
**Step:** Step 4g: Reflection Pattern
**Duration:** ~30 min

## What Happened

Added the 7th orchestration pattern: reflection (generate-critique-revise loop). 7 commits:
1. Generator + Critic agents (package scaffold)
2. ReflectionLoop orchestrator with parseCriticVerdict
3. 18 tests
4. Server + frontend registration
5. Eval dataset (8 items)
6. Step doc
7. README + status updates

Files: 12 new, 4 modified. 18 tests, all passing. Total suite: 171 tests.

## What Worked Well

- **Pattern-planner → pattern-builder → code-reviewer pipeline**: Following the full agent lifecycle produced clean, well-structured code on first pass
- **Step doc first**: Creating the step doc before implementation gave the pattern-builder clear specifications to follow
- **parseCriticVerdict design**: Multi-strategy parsing (fenced blocks → raw JSON → fallback) is robust. Borrowed from swarm's parseHandoff approach.
- **Skipping critic on final iteration**: Clean design that saves tokens and ensures the generator's output is always the final answer

## What Went Wrong / Surprises

- **Initially skipped the workflow**: Started by writing code directly instead of using pattern-planner agent and creating the step doc first. Had to delete premature code and restart. The CLAUDE.md workflow exists for a reason — following it produces better outcomes.
- **User had to correct the process**: The user noticed the workflow deviation, which wasted time on the false start.

## Learnings

- **Always follow the documented lifecycle for new patterns**: pattern-planner → step doc → pattern-builder → code-reviewer → commit → feedback loop. Don't shortcut even when the design seems clear.
- **Step docs are the contract**: The pattern-builder agent works best when it has a clear step doc to follow. Skipping this step means the builder has to make design decisions it shouldn't.
- **The correction was valuable**: Being redirected to follow the process resulted in cleaner commits and better separation of concerns than the initial approach would have produced.

## Changes Made (Feedback Applied)

- Updated `.claude/agents/pattern-builder.md`: Added reflection pattern to scope and step doc list
- Updated `CLAUDE.md`: Added Step 4g to implementation table, dependency graph, and status checklist
