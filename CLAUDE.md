# Agent Orchestration Patterns

Educational repo: 4 multi-agent orchestration patterns with React frontend, SSE streaming, inline trace visualization, Langfuse evals, and Docker.

## Start Here

1. `docs/plan.md` — full architecture, directory structure, core design
2. `docs/steps/` — step-by-step implementation guides (start with `01-core-library.md`)
3. `.claude/docs/` — technical specs (streaming protocol, pattern interface, commit guidelines)
4. `.claude/agents/` — specialized agent roles

## Implementation Steps

Steps 4a-4d can run **in parallel** once steps 1-2 are done.

| Step | Doc | Agent |
|------|-----|-------|
| 1. Core Library | `docs/steps/01-core-library.md` | `core-builder` |
| 2. Server | `docs/steps/02-server.md` | `server-builder` |
| 3. Frontend Shell | `docs/steps/03-frontend-shell.md` | `frontend-builder` |
| **4a-4d. Patterns** | **`docs/steps/04a-*.md`** | **`pattern-builder`** |
| 5. Eval System | `docs/steps/05-eval-system.md` | `core-builder` + `server-builder` |
| 6. Docker | `docs/steps/06-docker.md` | `docker-builder` |
| 7. Documentation | `docs/steps/07-documentation.md` | `docs-builder` |

```
Step 1 ──→ Step 2 ──→ Step 3
                │
                ├──→ 4a: Router    ──┐
                ├──→ 4b: Pipeline  ──┤ parallel
                ├──→ 4c: Supervisor──┤
                └──→ 4d: Debate    ──┘
                                     │
                Step 5: Eval  ←──────┘
                Step 6: Docker
                Step 7: Docs
```

## Code Review Process

**Every implementation MUST be reviewed before committing.** This is non-negotiable.

### Workflow

```
1. Implement  →  2. Self-check  →  3. Run code-reviewer  →  4. Fix issues  →  5. Commit
```

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
| `pattern-builder` | `patterns/*/` — all 4 orchestration patterns |
| `frontend-builder` | `frontend/` — React, components, hooks |
| `docker-builder` | Dockerfiles, docker-compose, nginx |
| `docs-builder` | READMEs, architecture docs |
| `code-reviewer` | Reviews all code before commits |

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
- **ESM:** `"type": "module"` everywhere, `.js` extensions on local imports
- **Style:** kebab-case files, PascalCase classes/interfaces, camelCase functions
- **Errors:** agents emit `StreamEvent` errors, never throw unhandled. Server catches all.
- **Streaming:** non-negotiable — all LLM responses must stream
- **Security:** API keys from env only, validate user input, no `eval()`
- **Testing:** vitest, mock LLM provider, test behavior not implementation
- **Dependencies:** minimal — raw `fetch` for LLM, no AI frameworks

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
- [ ] Step 1: Core Library
- [ ] Step 2: Server
- [ ] Step 3: Frontend Shell
- [ ] Step 4a-4d: Patterns (parallel)
- [ ] Step 5: Eval System
- [ ] Step 6: Docker
- [ ] Step 7: Documentation
