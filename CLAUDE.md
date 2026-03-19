# Agent Orchestration Patterns

Educational repo: 4 multi-agent orchestration patterns with React frontend, SSE streaming, inline trace visualization, Langfuse evals, and Docker.

## Start Here

1. `docs/plan.md` — full architecture, directory structure, core design
2. `docs/steps/` — step-by-step implementation guides (start with `01-core-library.md`)
3. `.claude/docs/` — technical specs (streaming protocol, pattern interface, commit guidelines)
4. `.claude/agents/` — specialized agent roles
5. `.claude/diary/` — self-improvement diary (evolution log)
6. `.claude/docs/feedback-loop.md` — feedback loop process

## Implementation Steps

Steps 4a-4d can run **in parallel** once steps 1-2 are done.

| Step | Doc | Agent |
|------|-----|-------|
| 1. Core Library | `docs/steps/01-core-library.md` | `core-builder` |
| 2. Server | `docs/steps/02-server.md` | `server-builder` |
| 3. Frontend Shell | `docs/steps/03-frontend-shell.md` | `frontend-builder` |
| **4a-4d. Patterns** | **`docs/steps/04a-*.md`** | **`pattern-builder`** |
| **4e. Swarm** | `docs/steps/04e-pattern-swarm.md` | `pattern-builder` |
| **4f. Map-Reduce** | `docs/steps/04f-pattern-map-reduce.md` | `pattern-builder` |
| 5. Eval System | `docs/steps/05-eval-system.md` | `core-builder` + `server-builder` |
| 6. Docker | `docs/steps/06-docker.md` | `docker-builder` |
| 7. Documentation | `docs/steps/07-documentation.md` | `docs-builder` |

```
Step 1 ──→ Step 2 ──→ Step 3
                │
                ├──→ 4a: Router    ──┐
                ├──→ 4b: Pipeline  ──┤ parallel
                ├──→ 4c: Supervisor──┤
                ├──→ 4d: Debate    ──┤
                ├──→ 4e: Swarm     ──┤
                └──→ 4f: Map-Reduce──┘
                                     │
                Step 5: Eval  ←──────┘
                Step 6: Docker
                Step 7: Docs
```

## New Feature Workflow

The global planning rule applies. Additionally for this project:

- **Read `docs/plan.md`** and the relevant `docs/steps/` guide before planning
- **New npm dependencies** require explicit plan approval — prefer what's already in the workspace
- **Prefer incremental changes** over rewrites — extend existing components, don't replace them
- **Use the right agent** for the scope (see Agent Team table below)
- After plan approval: implement → self-check → code-reviewer → commit → feedback loop

## Code Review Process

**Every implementation MUST be reviewed before committing.** This is non-negotiable.

### Workflow

```
1. Implement  →  2. Self-check  →  3. Run code-reviewer  →  4. Fix issues  →  5. Commit  →  6. Feedback loop
```

### Feedback Loop (after each step)

After completing each implementation step, run the feedback loop (`.claude/docs/feedback-loop.md`):
1. **Reflect** — what worked, what surprised, what went wrong
2. **Record** — write diary entry in `.claude/diary/`
3. **Update** — apply learnings to agent definitions and docs
4. **Link** — update `.claude/diary/INDEX.md`

This is how the system improves over time. `git log .claude/diary/` shows the full evolution.

### Self-check (before calling code-reviewer)
- `npm run typecheck` passes
- `npm run test` passes (if tests exist)
- No debug logs, no TODO comments, no unrelated changes in the diff
- Commit is scoped to one logical module (see commit guidelines)

### Code-reviewer checks
Use the `code-reviewer` agent. It validates against:
- Architecture compliance (workspace boundaries, correct imports)
- Streaming protocol compliance (event ordering, required fields)
- Pattern interface compliance (PatternRunner contract)
- Code quality (no `any`, no unused code, no default exports)
- Commit quality (atomic, correct prefix, tests separate)

### When to review
- After implementing each sub-step within a step doc
- Before every `git commit`
- After fixing code-reviewer feedback (re-review the fixes)

## Agent Team

| Agent | Scope |
|-------|-------|
| `core-builder` | `packages/core/` — LLM provider, BaseAgent, stream types, eval |
| `server-builder` | `server/` — Express, SSE, routes |
| `pattern-planner` | Plans new patterns: step docs, agent design, integration |
| `pattern-builder` | `patterns/*/` — all orchestration patterns |
| `frontend-builder` | `frontend/` — React, components, hooks |
| `docker-builder` | Dockerfiles, docker-compose, nginx |
| `docs-builder` | READMEs, architecture docs |
| `code-reviewer` | Reviews all code before commits |

## Adding a New Pattern

Use the `pattern-planner` agent (`.claude/agents/pattern-planner.md`). It handles the full lifecycle:

1. Design pattern concept, agents, orchestrator, demo scenario
2. Create step doc at `docs/steps/04{x}-pattern-{name}.md` (follow 04a-04d format)
3. Implement via `pattern-builder` (leaf agents → orchestrator → tests → eval → README)
4. Register in server (`PATTERN_PACKAGES`) + frontend (`PATTERN_ICONS`)
5. Update `docs/plan.md`, `CLAUDE.md` status, `.claude/agents/pattern-builder.md` scope
6. Run feedback loop: diary entry + INDEX update

## Workspace Boundaries

```
packages/core/  →  imports nothing from other workspaces
server/         →  imports from core + patterns
patterns/*/     →  imports from core only
frontend/       →  type-only imports from core allowed (import type { ... })
                   NO runtime imports from other workspaces
```

## Code Standards

- **TypeScript:** strict, no `any`, no `as` casts, no `enum` (use unions), named exports only
- **ESM:** `"type": "module"` everywhere. `.js` extensions in core/server/patterns (NodeNext). `.ts`/`.tsx` in frontend (bundler mode).
- **Style:** kebab-case files, PascalCase classes/interfaces, camelCase functions
- **Errors:** agents emit `StreamEvent` errors, never throw unhandled. Server catches all.
- **Streaming:** non-negotiable — all LLM responses must stream
- **Security:** API keys from env only, validate user input, no `eval()`
- **Testing:** vitest, mock LLM provider, test behavior not implementation
- **LLM:** Vercel AI SDK (`ai` + `@ai-sdk/*` providers) — use `createProvider("anthropic", "model-name")`

## Commit Rules

See `.claude/docs/commit-guidelines.md`. Key rules:

- **Conventional prefixes required:** `feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`
- **Tests in separate commits** from implementation
- **One logical module per commit** — but a module can span 2-3 tightly coupled files
- **Never add "Co-Authored-By"** lines
- **No force pushing**

## Commands

```bash
npm install                              # install all workspaces
npm run dev                              # server + frontend concurrently
npm run dev:server                       # server only (:3001)
npm run dev:frontend                     # frontend only (:3000)
npm run typecheck                        # typecheck all workspaces
npm run test                             # run all tests
docker compose up                        # server + frontend
docker compose --profile langfuse up     # + Langfuse (:3002)
```

## Status

- [x] Scaffold (root config, dirs, package.json files)
- [x] Step 1: Core Library (6 commits, 29 tests)
- [x] Step 2: Server (5 commits, 14 tests)
- [x] Step 3: Frontend Shell (9 commits, 14 tests)
- [x] Refactor: LLM layer → Vercel AI SDK (3 commits)
- [x] Step 4a-4d: Patterns — router(18), pipeline(10), supervisor(19), debate(6) tests
- [x] Step 4e: Swarm Pattern — dynamic handoffs, 4 agents, 23 tests
- [x] Step 4f: Map-Reduce Pattern — parallel fan-out/fan-in, 3 agent types, 16 tests
- [x] Step 5: Eval System (Langfuse integration, auto dataset resolution)
- [x] Step 6: Docker (server + frontend + Langfuse profile)
- [x] Step 7: Documentation (root README, architecture, 4 pattern READMEs)
