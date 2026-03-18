# Agent Orchestration Patterns

## Project Overview

Educational repo demonstrating 4 multi-agent orchestration patterns with a React frontend (live SSE streaming + inline trace visualization), provider-agnostic LLM via OpenAI-compatible API, Langfuse for evals/benchmarking, and Docker.

## Key Documents

| Document | Purpose |
|----------|---------|
| `docs/plan.md` | Full architecture, directory structure, core design |
| `.claude/docs/streaming-protocol.md` | StreamEvent types, SSE format, emission rules |
| `.claude/docs/pattern-interface.md` | PatternRunner contract, per-pattern specs |
| `.claude/docs/commit-guidelines.md` | Commit sizing, grouping, message format |

### Implementation Steps

Detailed step-by-step guides in `docs/steps/`. Steps 4a-4d can run **in parallel** once steps 1-3 are done.

| Step | Doc | Agent | Depends On |
|------|-----|-------|------------|
| 1. Core Library | `docs/steps/01-core-library.md` | `core-builder` | — |
| 2. Server | `docs/steps/02-server.md` | `server-builder` | Step 1 |
| 3. Frontend Shell | `docs/steps/03-frontend-shell.md` | `frontend-builder` | Step 2 |
| **4a. Router** | **`docs/steps/04a-pattern-router.md`** | **`pattern-builder`** | **Steps 1-2** |
| **4b. Pipeline** | **`docs/steps/04b-pattern-pipeline.md`** | **`pattern-builder`** | **Steps 1-2** |
| **4c. Supervisor** | **`docs/steps/04c-pattern-supervisor.md`** | **`pattern-builder`** | **Steps 1-2** |
| **4d. Debate** | **`docs/steps/04d-pattern-debate.md`** | **`pattern-builder`** | **Steps 1-2** |
| 5. Eval System | `docs/steps/05-eval-system.md` | `core-builder` + `server-builder` | Steps 1-2 + any pattern |
| 6. Docker | `docs/steps/06-docker.md` | `docker-builder` | Steps 1-4 |
| 7. Documentation | `docs/steps/07-documentation.md` | `docs-builder` | Steps 1-6 |

**Read docs/plan.md first** — it's the source of truth for all architecture decisions. Then follow the step docs for implementation.

## Agent Team

Specialized agents for different parts of the codebase. Use the right agent for the right job.

| Agent | Scope | When to Use |
|-------|-------|-------------|
| `.claude/agents/core-builder.md` | `packages/core/src/` — LLM provider, BaseAgent, stream types, eval utils | Building shared library code |
| `.claude/agents/server-builder.md` | `server/src/` — Express, SSE, routes | Building the API server |
| `.claude/agents/pattern-builder.md` | `patterns/*/src/` — all 4 orchestration patterns | Implementing individual patterns |
| `.claude/agents/frontend-builder.md` | `frontend/src/` — React, components, hooks | Building the UI |
| `.claude/agents/docker-builder.md` | Dockerfiles, docker-compose, nginx | Containerization |
| `.claude/agents/docs-builder.md` | READMEs, architecture docs, diagrams | Documentation |
| `.claude/agents/code-reviewer.md` | Reviews all code | After any implementation work — review before committing |

### Workspace Boundaries (enforced by code-reviewer)

```
packages/core/  →  imports nothing from other workspaces
server/         →  imports from core + patterns
patterns/*/     →  imports from core only
frontend/       →  imports nothing from other workspaces (communicates via API)
```

## Commit Rules

**Read `.claude/docs/commit-guidelines.md` for full details.** Summary:

1. **One logical change per commit** — one type, one module, one component
2. **Tests are ALWAYS separate commits** — never bundle with implementation
3. **Parent/child components go in separate commits** — dependencies before dependents
4. **Shared types get their own commit** when they define a contract
5. **Config files can be grouped** per workspace
6. **Refactors before features** — restructure first, then add new behavior
7. **Never add "Co-Authored-By"** lines to commit messages
8. **Imperative mood** — "Add router agent" not "Added router agent"
9. **Conventional commit prefixes required** — `feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`
10. **No force pushing** — treat commit history as append-only
11. **No large diffs** — if a commit touches more than ~5 files, it's probably too big. Split it.

## Architecture Summary

- **Monorepo** with npm workspaces: `packages/core`, `server`, `frontend`, `patterns/*`
- **Single Express server** loads all 4 patterns at startup, exposes via SSE streaming API
- **React frontend** with chat panel + live trace visualization panel
- **No AI frameworks** — raw TypeScript implementations to teach concepts
- **Langfuse** for evals/benchmarking (optional, not for tracing)

## Tech Stack

- TypeScript, Node 22, tsx for running
- npm workspaces (no Turborepo/Lerna)
- Express + SSE for streaming
- React 19 + Vite + Tailwind CSS
- Langfuse JS SDK for evals (optional)
- Docker + docker-compose
- Raw `fetch` for LLM calls (no SDK deps)

## Key Design Decisions

### LLM Provider
Single OpenAI-compatible adapter. Raw `fetch` to `/v1/chat/completions`. Works with OpenRouter, Ollama, OpenAI, Groq. Configured via `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`. See `core-builder` agent for details.

### Streaming Protocol
Agents emit `StreamEvent` objects → server bridges to SSE → frontend parses with `useStream`. See `.claude/docs/streaming-protocol.md`.

### Pattern Interface
Every pattern exports a `PatternRunner` with `run(input, emitter)`. See `.claude/docs/pattern-interface.md`.

## Development Best Practices

### Code Quality
- ESM modules (`"type": "module"` in all package.json)
- Strict TypeScript — no `any`, no `as` casts unless absolutely necessary
- Named exports only — no default exports
- Minimal dependencies — prefer raw implementations over libraries
- No comments unless logic is genuinely non-obvious
- kebab-case files, PascalCase classes/interfaces, camelCase functions/variables
- No unused imports, variables, or parameters
- No dead code — delete it, don't comment it out
- Functions should do one thing — if a function name has "and" in it, split it

### Error Handling
- Agents communicate errors via `StreamEvent` — never throw unhandled exceptions
- Server endpoints catch all errors and return proper HTTP status codes
- LLM provider handles network failures, timeouts, and malformed responses gracefully
- Always handle the case where optional services (Langfuse, Ollama) are unavailable

### TypeScript
- Define interfaces for all public APIs and shared contracts
- Use union types for events and messages (discriminated unions with `type` field)
- Prefer `interface` over `type` for object shapes
- Use generics sparingly — only when it genuinely adds type safety
- No `enum` — use union types or const objects instead

### Testing
- Test behavior, not implementation details
- Each test file tests one module
- Test names describe the expected behavior: `"routes billing queries to billing specialist"`
- Mock the LLM provider in tests — never make real API calls in tests

### Performance
- Streaming is non-negotiable — all LLM responses must stream
- No unnecessary buffering — forward chunks as they arrive
- Close SSE connections properly on client disconnect

### Security
- API keys only via environment variables — never in code
- Validate all user input on server endpoints
- No `eval()`, no dynamic imports from user input

### File Organization
- Shared code → `packages/core/src/`
- Pattern code → `patterns/<name>/src/`
- Each pattern's `index.ts` exports a `PatternRunner`
- Types shared across workspaces → `packages/core/src/`

## Commands

```bash
npm install                    # install all workspaces
npm run dev                    # start server + frontend concurrently
npm run dev:server             # server only (port 3001)
npm run dev:frontend           # frontend only (port 3000)
npm run typecheck              # typecheck all workspaces
docker compose up              # server + frontend
docker compose --profile langfuse up  # everything including Langfuse
```

## Build Order

See `docs/steps/` for detailed implementation guides per step.

```
Step 1: Core Library     ─── sequential ───→  Step 2: Server  ───→  Step 3: Frontend Shell
                                                    │
                                                    ├──→  Step 4a: Router    ──┐
                                                    ├──→  Step 4b: Pipeline  ──┤ parallel
                                                    ├──→  Step 4c: Supervisor──┤
                                                    └──→  Step 4d: Debate    ──┘
                                                                               │
                                                    Step 5: Eval System  ←─────┘
                                                    Step 6: Docker
                                                    Step 7: Documentation
```

**Status:**
- [x] Scaffold (root config, dirs, package.json files)
- [ ] Step 1: Core Library → `docs/steps/01-core-library.md`
- [ ] Step 2: Server → `docs/steps/02-server.md`
- [ ] Step 3: Frontend Shell → `docs/steps/03-frontend-shell.md`
- [ ] Step 4a-4d: Patterns (parallel) → `docs/steps/04a-*.md` through `04d-*.md`
- [ ] Step 5: Eval System → `docs/steps/05-eval-system.md`
- [ ] Step 6: Docker → `docs/steps/06-docker.md`
- [ ] Step 7: Documentation → `docs/steps/07-documentation.md`

**After each step: run `code-reviewer` before committing.**
