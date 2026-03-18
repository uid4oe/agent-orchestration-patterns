# Agent Orchestration Patterns

## Project Overview

Educational repo demonstrating 4 multi-agent orchestration patterns with a React frontend (live SSE streaming + inline trace visualization), provider-agnostic LLM via OpenAI-compatible API, Langfuse for evals/benchmarking, and Docker.

**Read PLAN.md first** — it contains the full architecture, directory structure, core design, streaming protocol, and build order.

## Architecture Summary

- **Monorepo** with npm workspaces: `packages/core`, `server`, `frontend`, `patterns/*`
- **Single Express server** loads all 4 patterns at startup, exposes them via SSE streaming API
- **React frontend** with chat + live trace visualization
- **No AI frameworks** — raw TypeScript implementations to teach concepts
- **Langfuse** for evals/benchmarking (optional, not for tracing)

## Tech Stack

- TypeScript, Node 22, tsx for running
- npm workspaces (no Turborepo/Lerna)
- Express + SSE for streaming
- React 19 + Vite + Tailwind CSS
- Langfuse JS SDK for evals
- Docker + docker-compose
- Raw `fetch` for LLM calls (no SDK deps)

## Key Design Decisions

### LLM Provider
Single OpenAI-compatible adapter. Uses raw `fetch` to `/v1/chat/completions`. Works with OpenRouter, Ollama, OpenAI, Groq — anything OpenAI-compatible. Configured via `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`.

### Streaming Protocol
Agents emit `StreamEvent` objects via an emitter. Server bridges these to SSE. Frontend parses with `useStream` hook. Event types: `agent_start`, `chunk`, `handoff`, `agent_end`, `error`, `done`.

### Pattern Interface
Every pattern exports a `PatternRunner`:
```typescript
interface PatternRunner {
  name: string;
  description: string;
  run(input: string, emitter: StreamEmitter): Promise<void>;
}
```

### No OTel/Jaeger
Tracing is stream-event-based, visualized in the frontend's TraceView component. Langfuse is used for evals/benchmarking, not tracing.

## Conventions

### Code Style
- ESM modules (`"type": "module"` in all package.json)
- Strict TypeScript
- No default exports — use named exports
- Minimal dependencies — prefer raw implementations over libraries
- No comments unless logic is non-obvious

### File Organization
- Each pattern is self-contained in `patterns/<name>/src/`
- Shared code goes in `packages/core/src/`
- Each pattern's `index.ts` exports a `PatternRunner`

### Git
- Never add "Co-Authored-By" lines to commit messages
- Commit messages: imperative mood, concise

## Commands

```bash
npm install                    # install all workspaces
npm run dev                    # start server + frontend concurrently
npm run dev:server             # server only (port 3001)
npm run dev:frontend           # frontend only (port 3000)
npm run typecheck              # typecheck all workspaces
docker compose up              # everything including Langfuse
```

## Current State

Check PLAN.md "Build Order" section for what's done vs pending. The build order is:

1. Scaffold (root config, dirs, package.json files)
2. Core — LLM types + provider
3. Core — StreamEvent types
4. Core — BaseAgent class
5. Core — Langfuse integration
6. Server — Express + SSE
7. Pattern: Router
8. Frontend — React app
9. Pattern: Pipeline
10. Pattern: Supervisor
11. Pattern: Debate
12. Eval system
13. Docker
14. Documentation
