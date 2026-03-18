# Pattern Interface

## PatternRunner

Every pattern MUST export a `PatternRunner` as its default export from `src/index.ts`:

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
- `run()` MUST handle errors gracefully — emit `error` event, then `done`
- `run()` should NOT throw — all errors are communicated via events

## Pattern Implementations

### Router (customer support)
- RouterAgent classifies intent → delegates to specialist
- Specialists: billing, technical, general
- Router NEVER answers directly — only routes

### Pipeline (content creation)
- Sequential: researcher → writer → editor
- Each stage receives previous stage's output
- Pipeline class manages the chain

### Supervisor (research task)
- SupervisorAgent plans subtasks, dispatches to workers
- Workers: search, analysis, summary
- Supervisor reviews output, can retry/redirect (max 3 iterations)

### Debate (investment analysis)
- DebateArena manages rounds
- Bull argues FOR, Bear argues AGAINST
- 2 rounds, then Judge evaluates and produces verdict
- Each debater sees accumulated transcript

## Registering Patterns

The server imports all patterns at startup:
```typescript
import { router } from "../patterns/router/src/index.js";
import { pipeline } from "../patterns/pipeline/src/index.js";
// ...
const patterns: Record<string, PatternRunner> = { router, pipeline, supervisor, debate };
```
