# Pattern Interface

## PatternRunner

The core `PatternRunner` interface (from `packages/core/src/eval/datasets.ts`):

```typescript
export interface PatternRunner {
  run(input: string, emitter: StreamEmitter): Promise<{ output: string; totalUsage: TokenUsage }>;
}
```

Note: `name` and `description` are module-level exports, not part of the runner itself.

## Pattern Module Shape

Each pattern package must export three things from `src/index.ts`:

```typescript
// patterns/router/src/index.ts
import { createProvider, BaseAgent } from "@agent-patterns/core";
import type { PatternRunner, StreamEmitter, TokenUsage } from "@agent-patterns/core";

export const name = "router";
export const description = "Intent-based delegation to specialist agents";

export function createRunner(): PatternRunner {
  const provider = createProvider("anthropic", "claude-sonnet-4-20250514");
  // instantiate agents...
  return {
    async run(input, emitter) {
      const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
      let output = "";
      try {
        // orchestration logic — call agents, accumulate usage + output...
      } catch (err) {
        emitter.emit({ type: "error", agent: "system", message: String(err) });
      } finally {
        emitter.emit({ type: "done", totalUsage });
      }
      return { output, totalUsage };
    }
  };
}
```

The server dynamically imports each pattern and calls `createRunner()`:

```typescript
// server/src/index.ts (simplified)
const mod = await import("@agent-patterns/router");
patterns.set(mod.name, {
  name: mod.name,
  description: mod.description,
  runner: mod.createRunner(),
});
```

## Contract

- `run()` receives user input and a `StreamEmitter`
- `run()` MUST emit `agent_start`/`agent_end` for every agent invocation
- `run()` MUST emit `handoff` when passing work between agents
- `run()` MUST emit `done` as the final event with aggregated token usage
- `run()` MUST return `{ output, totalUsage }` so the eval system can collect results
- `run()` MUST handle errors gracefully — catch agent errors, emit `error` event, then `done`
- `run()` should NOT throw — all errors are communicated via events

## LLM Provider

Patterns use the AI SDK via the `createProvider` factory:

```typescript
import { createProvider } from "@agent-patterns/core";

// Direct:
const provider = createProvider("anthropic", "claude-sonnet-4-20250514");

// From env vars:
const provider = createProvider(
  (process.env.LLM_PROVIDER ?? "openai") as ProviderName,
  process.env.LLM_MODEL ?? "gpt-4o-mini",
);
```

Supported providers: `"anthropic"`, `"openai"`, `"google"`.

## Pattern Details

See `docs/steps/04a-*.md` through `04d-*.md` for full implementation guides.
