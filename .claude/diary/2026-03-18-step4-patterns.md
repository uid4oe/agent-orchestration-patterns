# Diary: Step 4a-4d — All 4 Patterns (Parallel)

**Date:** 2026-03-18
**Agent:** pattern-builder (x4 parallel)
**Step:** `docs/steps/04a-04d`
**Commits:** 21 total (5 router + 5 pipeline + 5 supervisor + 6 debate)
**Tests:** 53 new (114 total)

## What Happened

All 4 patterns built in parallel using isolated git worktrees:
- **Router** (4a): 3 specialists (billing, technical, general) + router agent + orchestrator. 18 tests.
- **Pipeline** (4b): 3 stages (researcher, writer, editor) + generic Pipeline class + runner. 10 tests.
- **Supervisor** (4c): 3 workers (search, analysis, summary) + supervisor agent (plan/review) + retry logic. 19 tests.
- **Debate** (4d): 2 debaters (bull, bear) + judge + DebateArena (2 rounds) + runner. 6 tests.

## What Worked Well

- **Parallel worktrees worked perfectly** — all 4 agents ran simultaneously without conflicts, each in its own worktree. Fast-forward merges for the first, clean merges for the rest.
- **Updated pattern-interface.md paid off** — all 4 patterns correctly exported `name`, `description`, `createRunner()`. The critical review caught this before patterns were built.
- **BaseAgent abstraction is solid** — all pattern agents just implement `execute()` and call `this.chatStream()`. Zero confusion across 4 independent agents.
- **Bottom-up build order** consistent across all patterns — leaf agents first, orchestrator last.

## What Went Wrong / Surprises

- **Untracked files from worktrees** — when merging worktrees, git sometimes left untracked files from empty scaffold dirs. Had to `git clean -fd` before merging.
- **Pipeline needed `PipelineStage` interface** — since `BaseAgent.config` is `protected`, the Pipeline class couldn't access agent names directly. Created a wrapper interface.
- **Supervisor is the most complex** — planning + reviewing + retry loops + max iterations. 19 tests needed to cover the state machine.
- **Test counts varied widely** — debate had 6 tests vs supervisor's 19. Complexity-proportional but worth noting for future balance.

## Learnings

- Parallel worktree execution is the fastest way to build independent workspaces
- Always `git clean -fd <dir>` before merging a worktree that writes to a scaffolded directory
- `protected` on BaseAgent.config means orchestrators need wrapper types to access agent metadata
- Pattern complexity: supervisor >> debate > router > pipeline

## Changes Made (Feedback Applied)

- All 4 pattern agents followed the corrected pattern-interface.md
- No doc updates needed — the critical review already aligned everything
