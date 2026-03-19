# Step 4g: Reflection Pattern

**Agent:** `pattern-builder`
**Depends on:** Steps 1-2 (core + server)
**Parallel with:** Steps 4a-4f (other patterns)

## Overview

Generate-critique-revise loop: a Generator produces content, a Critic evaluates it with a structured verdict (`pass` or `revise` + feedback), and the Generator revises if needed. The loop repeats until the Critic passes or max iterations (3) are reached. On the final iteration, the Critic is skipped entirely (saves tokens — the Generator's output is the final answer).

This is the only pattern featuring **iterative self-improvement with conditional early exit**. Pipeline is sequential with no feedback. Supervisor delegates but doesn't refine the same output. Debate has fixed rounds with no early exit. Reflection closes the loop: output flows back as input until quality is sufficient.

## Demo Scenario

Input: "Write a persuasive argument for why companies should invest in renewable energy"

Flow:
- Generator writes an initial argument (generic, lacks data)
- Critic evaluates: verdict `revise`, feedback "lacks specific financial evidence and ROI data"
- Generator revises with concrete ROI figures and case studies
- Critic evaluates: verdict `pass`

More complex flow (max iterations):
- "Write a technical explanation of quantum computing for a general audience"
- Generator drafts explanation (too jargon-heavy)
- Critic: `revise` — "uses undefined technical terms, needs analogies"
- Generator revises with analogies (still missing conclusion)
- Critic: `revise` — "no clear takeaway for the reader"
- Generator revises a final time (no Critic call on iteration 3)

## Implementation Order

### 4g.1 Package Setup + Generator Agent (`agents/generator.ts`)

- `package.json`, `tsconfig.json` (follow existing pattern packages)
- Extends BaseAgent
- System prompt: content generation role, produces well-structured responses
- First call: receives user input only
- Revision calls: receives original query + previous draft + critic feedback
- Streams via `chatStream()`

**Commit:** `feat: add generator and critic agents for reflection pattern`

### 4g.2 Critic Agent (`agents/critic.ts`)

- Extends BaseAgent
- System prompt: evaluate content against criteria (logical coherence, evidence quality, persuasiveness, clarity, completeness)
- Streams critique naturally, then ends output with structured JSON verdict:
  ```json
  {"verdict": "pass"|"revise", "feedback": "specific actionable feedback"}
  ```
- Part of the same commit as 4g.1

### 4g.3 Reflection Loop Orchestrator (`reflection-loop.ts` + `index.ts`)

- Constructor: `(generator, critic, maxIterations = 3)`
- `parseCriticVerdict(output)`: regex extracts JSON from critic output
  - Handles JSON in fenced code blocks (` ```json ... ``` `)
  - Handles raw JSON at end of output
  - Handles extra text around JSON
  - Fallback on parse failure: treat as `"revise"` with full output as feedback
- Loop flow:
  1. Iteration 1: `generator(input)` → handoff → `critic(output)` → parse verdict
  2. Iteration 2+: if `"revise"` → handoff → `generator(input + prev output + feedback)` → handoff → `critic(revised)` → parse verdict
  3. Final iteration (iteration === maxIterations): generator only, skip critic
  4. If `"pass"`: done immediately
- Emit `done` with aggregated usage
- Package exports: `name = "reflection"`, `description`, `createRunner()`

**Commit:** `feat: add reflection loop orchestrator`

### 4g.4 Tests

- `reflection-loop.test.ts`:
  - `parseCriticVerdict`: valid JSON extraction, fenced code blocks, malformed JSON fallback, extra text around JSON (~4 tests)
  - Single iteration pass: generator → critic → pass → done (~2 tests)
  - Two-iteration pass: generate → revise → generate → pass → done (~2 tests)
  - Max iterations reached: 3 iterations, no final critic call (~2 tests)
  - Event sequences: correct `agent_start`/`agent_end`/`handoff` ordering (~3 tests)
  - Handoff reasons: contain meaningful context (~1 test)
  - Generator input construction: first call vs revision calls (~2 tests)
  - Usage aggregation across iterations (~1 test)
  - Error handling: critic throws, generator throws (~2 tests)

**Commit:** `test: add reflection pattern tests`

### 4g.5 Server + Frontend Registration

- Server: add `reflection` to `PATTERN_PACKAGES` in server route config
- Frontend: add icon to `PATTERN_ICONS` (use `RefreshCw` from lucide-react)

**Commit:** `feat(server): register reflection pattern`

### 4g.6 Eval Dataset (`eval/dataset.json`)

8 writing/content tasks where iterative improvement is visible:
1. Persuasive argument (renewable energy investment)
2. Technical explanation for non-technical audience (quantum computing)
3. Product description (SaaS tool)
4. Project proposal (internal tooling)
5. Startup pitch (AI startup)
6. Step-by-step guide (home composting)
7. Policy recommendation (remote work)
8. Executive summary (quarterly results)

**Commit:** `chore: add reflection eval dataset`

### 4g.7 README + Step Doc Updates

- `patterns/reflection/README.md`: pattern overview, architecture, event flow, usage
- Update `CLAUDE.md` status checklist
- Update `docs/plan.md` pattern list

**Commit:** `docs: add reflection pattern README and update project status`

## Done When

- [ ] `npm run dev` → select Reflection → type "Write a persuasive argument for renewable energy" → see generate → critique → revise loop
- [ ] TraceView shows: generator → (handoff) → critic → (handoff) → generator → (handoff) → critic → done
- [ ] Early exit works: critic verdict `pass` stops the loop before max iterations
- [ ] Max iterations cap works: loop stops at 3, final iteration skips critic
- [ ] `parseCriticVerdict` handles malformed JSON gracefully (fallback to revise)
