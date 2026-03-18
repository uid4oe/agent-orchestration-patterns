# Step 4c: Supervisor Pattern

**Agent:** `pattern-builder`
**Branch:** `feat/pattern-supervisor`
**Depends on:** Steps 1-2 (core + server)
**Parallel with:** Steps 4a, 4b, 4d (other patterns)

## Overview

Research task with quality control: a Supervisor agent plans subtasks, dispatches to workers, reviews output, and can retry or redirect if quality is insufficient. Max 3 iterations.

## Demo Scenario

Input: "Research the current state of quantum computing: key players, recent breakthroughs, and timeline predictions"

- Supervisor plans: search → analyze → summarize
- SearchWorker gathers raw information
- AnalysisWorker identifies patterns and insights
- SummaryWorker produces final report
- Supervisor reviews each output, may retry with refined instructions

## Implementation Order

### 4c.1 Search Worker (`workers/search.ts`)

- Extends BaseAgent
- System prompt: information gatherer, find relevant facts and sources
- `execute()`: streams search results / gathered information

**Commit:** `feat: add search worker agent`

### 4c.2 Analysis Worker (`workers/analysis.ts`)

- Extends BaseAgent
- System prompt: analyst, identify patterns, compare perspectives, draw insights
- `execute()`: streams analysis of provided information

**Commit:** `feat: add analysis worker agent`

### 4c.3 Summary Worker (`workers/summary.ts`)

- Extends BaseAgent
- System prompt: summarizer, produce clear and comprehensive report
- `execute()`: streams final summary

**Commit:** `feat: add summary worker agent`

### 4c.4 SupervisorAgent (`supervisor-agent.ts`)

The supervisor has two LLM responsibilities:

**Planning**: given user input, produce a JSON plan:
```json
{
  "subtasks": [
    { "worker": "search", "instruction": "Find information about..." },
    { "worker": "analysis", "instruction": "Analyze the findings..." },
    { "worker": "summary", "instruction": "Summarize into a report..." }
  ]
}
```

**Reviewing**: given a worker's output, evaluate quality:
```json
{
  "adequate": true/false,
  "feedback": "The analysis lacks..."
}
```

- If inadequate and iteration < 3: retry same worker with feedback appended to instruction
- If inadequate and iteration >= 3: accept and move on

**Commit:** `feat: add supervisor agent with planning and review`

### 4c.5 Supervisor PatternRunner (`index.ts`)

- Creates provider, supervisor, all workers
- `run(input, emitter)`:
  1. Supervisor plans subtasks
  2. For each subtask:
     a. Emit `handoff` to worker
     b. Run worker
     c. Supervisor reviews output
     d. If inadequate: emit `handoff` back to worker (with "retry" reason), re-run
  3. Emit `done`

**Commit:** `feat: add supervisor pattern runner with retry logic`

### 4c.6 Eval Dataset (`eval/dataset.json`)

5 research topics with quality criteria (completeness, accuracy, structure).

**Commit:** `chore: add supervisor eval dataset`

## Tests

- `test: add tests for supervisor planning output parsing`
- `test: add tests for supervisor retry logic`
- `test: add tests for supervisor max iteration limit`

## Done When

- [ ] Select Supervisor → type research topic → see planning, worker execution, reviews
- [ ] TraceView shows branching: supervisor → worker → review → (retry?) → next worker
- [ ] Retries visible when output is inadequate
- [ ] Max 3 iterations enforced
