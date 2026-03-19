# Step 4f: Map-Reduce Pattern

**Agent:** `pattern-builder`
**Depends on:** Steps 1-2 (core + server)
**Parallel with:** Steps 4a-4e (other patterns)

## Overview

Splits work into independent sub-tasks, processes them in parallel via `Promise.all()`, then merges results. Demonstrates fan-out/fan-in parallelism — the most distinct orchestration style in the collection. A splitter agent produces structured JSON (like the supervisor's planner), mappers stream independently and concurrently, and a reducer synthesizes everything.

## Demo Scenario

Input: "Analyze the pros and cons of remote work for companies, employees, and society"

Flow:
- Splitter breaks into 3 sub-tasks: company impact, employee impact, societal impact
- 3 mapper agents run in parallel, each analyzing one angle
- Reducer combines all analyses into a coherent, unified response

TraceView shows:
```
splitter → mapper-1 (parallel)
         → mapper-2 (parallel)
         → mapper-3 (parallel)
         → reducer
```

## Implementation Order

### 4f.1 Splitter Agent (`agents/splitter.ts`)

- Extends BaseAgent
- Non-streaming: uses `provider.chat()` (like supervisor's `plan()`)
- Manual `agent_start/chunk/agent_end` emission
- System prompt: break input into 2-4 independent, parallel-safe subtasks
- Returns `{ subtasks: string[]; usage: TokenUsage }`
- `extractJson()` helper for markdown fence handling
- `split(input, emitter)` method with manual event lifecycle

**Commit:** `feat: add splitter agent for map-reduce pattern`

### 4f.2 Mapper Agent (`agents/mapper.ts`)

- Extends BaseAgent
- Standard streaming via `this.chatStream()`
- Single class, instantiated per subtask as `mapper-1`, `mapper-2`, etc.
- System prompt: focused, thorough analysis of a specific sub-task

**Commit:** `feat: add mapper agent for map-reduce pattern`

### 4f.3 Reducer Agent (`agents/reducer.ts`)

- Extends BaseAgent
- Standard streaming via `this.chatStream()`
- System prompt: synthesize multiple independent analyses into one coherent response
- Receives formatted input with all mapper outputs

**Commit:** `feat: add reducer agent for map-reduce pattern`

### 4f.4 Map-Reduce Runner (`map-reduce-runner.ts` + `index.ts`)

- `MapReduceRunner` class:
  1. **Split:** `splitter.split(input, emitter)` → subtask array
  2. **Map:** `Promise.all()` — run all mappers concurrently
     - Each mapper gets its own `LLMProvider` (avoids `lastUsage` race condition)
     - Events interleave on the stream — frontend handles via `agent` field
  3. **Reduce:** format mapper outputs → reducer streams synthesis
  4. Emit `done`
- Handoff events: one per mapper from splitter (fan-out), one from mappers to reducer (fan-in)
- Package files: `package.json`, `tsconfig.json`
- Exports: `name = "map-reduce"`, `description`, `createRunner()`

**Commit:** `feat: add map-reduce runner with parallel execution`

### 4f.5 Tests

- `splitter.test.ts`: JSON parsing, fence extraction, empty subtasks, invalid JSON
- `map-reduce-runner.test.ts`: full flow, parallel execution, usage aggregation, error handling

**Commit:** `test: add map-reduce pattern tests`

### 4f.6 Eval Dataset (`eval/dataset.json`)

10 multi-faceted analysis questions:
- Pros/cons analyses
- Multi-perspective comparisons
- Topics that naturally decompose into 2-4 independent angles

**Commit:** `chore: add map-reduce eval dataset`

## Done When

- [ ] `npm run dev` → select Map-Reduce → type analysis question → see split → parallel mappers → synthesis
- [ ] TraceView shows: splitter → mapper-1/2/3 (parallel) → reducer
- [ ] Mapper events interleave correctly (different agent names)
- [ ] Reducer produces coherent synthesis of all mapper outputs
