# Step 4a: Router Pattern

**Agent:** `pattern-builder`
**Branch:** `feat/pattern-router`
**Depends on:** Steps 1-2 (core + server)
**Parallel with:** Steps 4b, 4c, 4d (other patterns)

## Overview

Customer support routing: a RouterAgent classifies user intent and delegates to the matching specialist. The router never answers directly — it only decides who should.

## Demo Scenario

Input examples:
- "My invoice shows the wrong amount" → billing
- "The app crashes when I try to upload a file" → technical
- "What are your business hours?" → general

## Implementation Order

### 4a.1 Billing Specialist (`specialists/billing.ts`)

- Extends BaseAgent
- System prompt: expert in billing, invoicing, payments, refunds
- `execute()`: streams a helpful response about the billing query

**Commit:** `feat: add billing specialist agent`

### 4a.2 Technical Specialist (`specialists/technical.ts`)

- Extends BaseAgent
- System prompt: expert in technical support, bugs, troubleshooting
- `execute()`: streams a helpful technical support response

**Commit:** `feat: add technical specialist agent`

### 4a.3 General Specialist (`specialists/general.ts`)

- Extends BaseAgent
- System prompt: handles general inquiries, business info, FAQs
- `execute()`: streams a general response

**Commit:** `feat: add general specialist agent`

### 4a.4 RouterAgent (`router-agent.ts`)

- Extends BaseAgent
- System prompt: classify user intent, respond with exactly one of BILLING, TECHNICAL, GENERAL
- `execute()`: calls LLM to classify, parses response to get category
- Does NOT stream a user-facing response — only classifies

**Commit:** `feat: add router agent with intent classification`

### 4a.5 Router PatternRunner (`index.ts`)

- Creates LLM provider from env
- Creates RouterAgent + all 3 specialists
- `run(input, emitter)`:
  1. Run RouterAgent → get classification
  2. Emit `handoff` event (from router to specialist)
  3. Run matching specialist
  4. Emit `done` with aggregated usage

**Commit:** `feat: add router pattern runner and orchestration`

### 4a.6 Eval Dataset (`eval/dataset.json`)

5-10 test cases with:
- Input text
- Expected routing (billing/technical/general)
- Quality criteria for the specialist response

**Commit:** `chore: add router eval dataset`

## Tests

- `test: add tests for router intent classification accuracy`
- `test: add tests for router end-to-end event emission`

## Done When

- [ ] `npm run dev` → select Router → type "My invoice is wrong" → see routing + specialist response
- [ ] TraceView shows: router → handoff → specialist
- [ ] All 3 routing paths work correctly
