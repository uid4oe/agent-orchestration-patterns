# Step 4e: Swarm Pattern

**Agent:** `pattern-builder`
**Depends on:** Steps 1-2 (core + server)
**Parallel with:** Steps 4a-4d, 4f (other patterns)

## Overview

OpenAI-style swarm: agents dynamically hand off to each other based on context. Unlike the Router pattern (centralized classifier), routing emerges from each agent's own decisions. Each agent can handle requests in its domain or transfer to a peer by emitting a `[HANDOFF:target]` directive.

## Demo Scenario

Input: "I was charged twice for my subscription last month"

Flow:
- Triage agent receives the message, recognizes billing issue
- Triage hands off to billing with `[HANDOFF:billing]`
- Billing agent handles the refund/invoice question directly

More complex flow:
- "The premium features I'm paying for aren't showing up"
- Triage → support (technical issue)
- Support investigates, realizes it's a billing/subscription issue
- Support → billing (hands off)
- Billing resolves

## Implementation Order

### 4e.1 Triage Agent (`agents/triage.ts`)

- Extends BaseAgent
- System prompt: initial customer contact, analyze intent, route to department
- Can hand off to: sales, support, billing via `[HANDOFF:target]`
- Handles simple greetings/general questions directly

**Commit:** `feat: add triage agent for swarm pattern`

### 4e.2 Sales Agent (`agents/sales.ts`)

- Extends BaseAgent
- System prompt: pricing, plans, upgrades, demos
- Can hand off to: support (technical issues), billing (payment issues)

**Commit:** `feat: add sales agent for swarm pattern`

### 4e.3 Support Agent (`agents/support.ts`)

- Extends BaseAgent
- System prompt: technical issues, bugs, troubleshooting
- Can hand off to: sales (upgrade questions), billing (payment issues)

**Commit:** `feat: add support agent for swarm pattern`

### 4e.4 Billing Agent (`agents/billing.ts`)

- Extends BaseAgent
- System prompt: invoices, payments, refunds, subscriptions
- Can hand off to: sales (plan questions), support (technical issues)

**Commit:** `feat: add billing agent for swarm pattern`

### 4e.5 Swarm Runner (`swarm-runner.ts` + `index.ts`)

- `parseHandoff(output)`: extracts `[HANDOFF:name]` from agent output
- `SwarmRunner` class:
  1. Start at triage with user input
  2. Loop (max 5 handoffs):
     - Run current agent → streams via BaseAgent.run()
     - Parse output for handoff directive
     - If handoff: emit handoff event, strip tag, switch agent with context
     - If no handoff: done — this agent handled it
  3. Emit `done` with aggregated usage
- Package files: `package.json`, `tsconfig.json`
- Exports: `name = "swarm"`, `description`, `createRunner()`

**Commit:** `feat: add swarm runner with dynamic handoff loop`

### 4e.6 Tests

- `swarm-agent.test.ts`: parseHandoff unit tests (valid, missing, case insensitive)
- `swarm-runner.test.ts`: event sequences, single handoff, chain handoff, max limit, error handling, usage aggregation

**Commit:** `test: add swarm pattern tests`

### 4e.7 Eval Dataset (`eval/dataset.json`)

10 customer service scenarios:
- Direct billing, support, sales queries
- Multi-hop transfers (triage → support → billing)
- Simple greetings handled by triage
- Ambiguous queries

**Commit:** `chore: add swarm eval dataset`

## Done When

- [ ] `npm run dev` → select Swarm → type "My invoice is wrong" → see triage → billing handoff
- [ ] TraceView shows: triage → (handoff) → billing
- [ ] Multi-hop works: triage → support → billing
- [ ] Max handoff limit prevents infinite loops
