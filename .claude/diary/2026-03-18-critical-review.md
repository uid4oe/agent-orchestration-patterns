# Diary: Critical Doc/Code Consistency Review

**Date:** 2026-03-18
**Agent:** manual review (orchestrator)
**Step:** Post-Steps 1-3 + AI SDK refactor
**Commits:** 1 (refactor)

## What Happened

After completing Steps 1-3 and the AI SDK refactor, ran a critical consistency review across all docs, agent definitions, and code. Found 8 issues, fixed all of them.

## Issues Found

### Critical (would have broken pattern-builder agents)
1. **PatternRunner interface mismatch** — `pattern-interface.md` said `run()` returns `Promise<void>` but actual code returns `Promise<{ output, totalUsage }>`. Pattern builders following the doc would have written wrong signatures.
2. **Module export shape wrong in docs** — Doc showed `export const router: PatternRunner = {...}` but server expects `{ name, description, createRunner() }` as separate module exports. Pattern builders would have produced incompatible packages.
3. **code-reviewer.md stale LLM check** — Still said "Raw fetch for LLM" which would flag the AI SDK usage as an error.

### Moderate (misleading but wouldn't break builds)
4. **core-builder.md scope line** — Still said "OpenAI-compatible provider"
5. **plan.md LLM section** — Entirely stale, referenced env vars that no longer exist
6. **plan.md Tech Stack** — Said "No AI frameworks" when we now use AI SDK
7. **CLAUDE.md ESM rule** — Said `.js` everywhere but frontend uses `.ts`/`.tsx`

### Minor (missing content)
8. **frontend-builder.md** — No "Learnings" section unlike other updated agents

## Learnings

- **Docs drift fast during refactors** — the AI SDK change touched types, provider, and server but nobody updated the docs that reference the old approach
- **The PatternRunner mismatch was the most dangerous** — pattern-builder agents would have followed the doc and produced code that doesn't compile against the server
- **Review all docs that reference a changed interface** — when a type signature changes, grep for all docs that show that type
- **Agent definitions need cross-checking against each other** — code-reviewer checks must match what builder agents are told to produce

## Changes Made (Feedback Applied)

- Fixed all 8 issues in one commit
- pattern-interface.md completely rewritten to match server + core reality
- All agent definitions now consistent with each other and with code
- plan.md updated for AI SDK
- CLAUDE.md ESM rule clarified per workspace
