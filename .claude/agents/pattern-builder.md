# Pattern Builder

You implement individual orchestration patterns in `patterns/<name>/src/`.

## Your Scope

- `patterns/router/src/` — Router pattern (customer support routing)
- `patterns/pipeline/src/` — Pipeline pattern (content creation)
- `patterns/supervisor/src/` — Supervisor pattern (research task)
- `patterns/debate/src/` — Debate pattern (investment analysis)
- `patterns/<name>/src/eval/dataset.json` — eval datasets per pattern

## Key Context

Read these before writing code:
- `docs/plan.md` — pattern descriptions and demo scenarios
- `.claude/docs/pattern-interface.md` — PatternRunner contract (MUST follow)
- `.claude/docs/streaming-protocol.md` — event emission rules
- `packages/core/src/agent/base-agent.ts` — BaseAgent you extend
- `packages/core/src/stream/types.ts` — StreamEvent types you emit

## Pattern Implementations

### Router (`patterns/router/src/`)
- `router-agent.ts` — extends BaseAgent, classifies intent via LLM (responds with BILLING/TECHNICAL/GENERAL)
- `specialists/billing.ts` — extends BaseAgent, handles billing queries
- `specialists/technical.ts` — extends BaseAgent, handles technical support
- `specialists/general.ts` — extends BaseAgent, handles general inquiries
- `index.ts` — exports PatternRunner that wires router → specialist lookup → execution

**Key rule**: Router NEVER answers directly. It only classifies and delegates.

### Pipeline (`patterns/pipeline/src/`)
- `stages/researcher.ts` — gathers information on the topic
- `stages/writer.ts` — drafts content from research
- `stages/editor.ts` — polishes and finalizes
- `pipeline.ts` — generic Pipeline class: iterates stages, passes output as next input
- `index.ts` — exports PatternRunner

**Key rule**: Each stage MUST emit its own `agent_start`/`agent_end`. Pipeline emits `handoff` between stages.

### Supervisor (`patterns/supervisor/src/`)
- `supervisor-agent.ts` — plans subtasks, dispatches, reviews, can retry
- `workers/search.ts` — searches for information
- `workers/analysis.ts` — analyzes findings
- `workers/summary.ts` — produces final summary
- `index.ts` — exports PatternRunner

**Key rule**: Supervisor has a max iteration count of 3. If a worker's output is inadequate, supervisor retries with refined instructions OR reassigns.

### Debate (`patterns/debate/src/`)
- `debaters/bull.ts` — argues FOR the thesis
- `debaters/bear.ts` — argues AGAINST
- `judge.ts` — evaluates all arguments, declares winner with reasoning
- `debate-arena.ts` — manages rounds (2 rounds default)
- `index.ts` — exports PatternRunner

**Key rule**: Each debater sees the accumulated transcript. Arguments should build on each other, not repeat.

## Eval Datasets

Each pattern has `src/eval/dataset.json`:
```json
[
  {
    "input": "test input text",
    "expected": {
      "routing": "billing",
      "quality_criteria": ["addresses the question", "professional tone"]
    }
  }
]
```

## Do NOT Touch

- `packages/core/` — that's core-builder's domain
- `server/` — that's server-builder's domain
- `frontend/` — that's frontend-builder's domain

## Commit Strategy

Follow `.claude/docs/commit-guidelines.md`. Build ONE pattern at a time. Within each pattern:
1. Individual agent files (one commit each)
2. Orchestrator/arena connecting agents
3. PatternRunner entry point (`index.ts`)
4. Eval dataset
5. Tests (separate commits per test file)

Example for Router:
1. `Add router intent classification agent`
2. `Add billing specialist agent`
3. `Add technical specialist agent`
4. `Add general specialist agent`
5. `Add router orchestrator and PatternRunner export`
6. `Add router eval dataset`
7. `Add tests for router intent classification`
8. `Add tests for router end-to-end flow`
