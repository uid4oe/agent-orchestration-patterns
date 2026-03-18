# Pattern Interface

## PatternRunner

Every pattern MUST export a named `PatternRunner` instance from `src/index.ts`:

```typescript
export interface PatternRunner {
  name: string;           // kebab-case: "router", "pipeline", "supervisor", "debate"
  description: string;    // one-line description for the UI
  run(input: string, emitter: StreamEmitter): Promise<void>;
}
```

## Contract

- `run()` receives user input and a `StreamEmitter`
- `run()` MUST emit `agent_start`/`agent_end` for every agent invocation
- `run()` MUST emit `handoff` when passing work between agents
- `run()` MUST emit `done` as the final event with aggregated token usage
- `run()` MUST handle errors gracefully — catch agent errors, emit `error` event, then `done`
- `run()` should NOT throw — all errors are communicated via events

## Error Handling

```typescript
async run(input: string, emitter: StreamEmitter): Promise<void> {
  const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  try {
    // orchestration logic — call agents, accumulate usage...
  } catch (err) {
    emitter.emit({ type: "error", agent: "system", message: String(err) });
  } finally {
    emitter.emit({ type: "done", totalUsage });
  }
}
```

## Exporting from Patterns

Each pattern's `src/index.ts` exports a named `PatternRunner`:

```typescript
// patterns/router/src/index.ts
import type { PatternRunner, StreamEmitter } from "@agent-patterns/core";

export const router: PatternRunner = {
  name: "router",
  description: "Intent-based delegation to specialist agents",
  async run(input, emitter) {
    // orchestration logic...
  }
};
```

## Registering with Server

The server imports all patterns by name at startup:

```typescript
// server/src/index.ts
import { router } from "@agent-patterns/router";
import { pipeline } from "@agent-patterns/pipeline";
import { supervisor } from "@agent-patterns/supervisor";
import { debate } from "@agent-patterns/debate";

const patterns: Record<string, PatternRunner> = { router, pipeline, supervisor, debate };
```

Patterns that don't exist yet can be commented out during development.

## Pattern Details

See `docs/steps/04a-*.md` through `04d-*.md` for full implementation guides.
