# Step 4d: Debate Pattern

**Agent:** `pattern-builder`
**Branch:** `feat/pattern-debate`
**Depends on:** Steps 1-2 (core + server)
**Parallel with:** Steps 4a, 4b, 4c (other patterns)

## Overview

Investment analysis through adversarial debate: Bull argues FOR, Bear argues AGAINST, Judge evaluates and declares a winner. 2 rounds of debate.

## Demo Scenario

Input: "Should a retail investor allocate 10% of their portfolio to Bitcoin in 2026?"

Round 1:
- Bull: argues for Bitcoin allocation (growth potential, hedge, adoption)
- Bear: argues against (volatility, regulatory risk, speculation)

Round 2:
- Bull: responds to Bear's points, strengthens case
- Bear: responds to Bull's points, strengthens case

Judge: evaluates all arguments, declares winner with reasoning.

## Implementation Order

### 4d.1 Bull Debater (`debaters/bull.ts`)

- Extends BaseAgent
- System prompt: investment bull, argue FOR the thesis with data and logic
- `execute()`: receives thesis + prior transcript, streams argument
- Must address counter-arguments from previous rounds (if any)

**Commit:** `feat: add bull debater agent`

### 4d.2 Bear Debater (`debaters/bear.ts`)

- Extends BaseAgent
- System prompt: investment bear, argue AGAINST the thesis with data and logic
- `execute()`: receives thesis + prior transcript, streams counter-argument
- Must address arguments from previous rounds (if any)

**Commit:** `feat: add bear debater agent`

### 4d.3 Judge (`judge.ts`)

- Extends BaseAgent
- System prompt: impartial investment judge, evaluate argument quality
- `execute()`: receives full transcript, streams verdict with:
  - Winner declaration
  - Scoring of each side's arguments
  - Key strengths and weaknesses
  - Final recommendation

**Commit:** `feat: add judge agent for debate evaluation`

### 4d.4 DebateArena (`debate-arena.ts`)

Manages the debate flow:

```typescript
class DebateArena {
  constructor(
    private bull: BaseAgent,
    private bear: BaseAgent,
    private judge: BaseAgent,
    private rounds: number = 2
  ) {}

  async run(thesis: string, emitter: StreamEmitter): Promise<void> {
    let transcript = "";
    let totalUsage = { inputTokens: 0, outputTokens: 0 };

    for (let round = 1; round <= this.rounds; round++) {
      // Bull argues
      const bullInput = `Thesis: ${thesis}\n\nTranscript so far:\n${transcript}\n\nPresent your argument FOR.`;
      const bullResult = await this.bull.run(bullInput, emitter);
      transcript += `\n\n## Bull (Round ${round}):\n${bullResult.output}`;
      // accumulate usage...

      emitter.emit({ type: "handoff", from: "bull", to: "bear", reason: `round ${round}` });

      // Bear argues
      const bearInput = `Thesis: ${thesis}\n\nTranscript so far:\n${transcript}\n\nPresent your argument AGAINST.`;
      const bearResult = await this.bear.run(bearInput, emitter);
      transcript += `\n\n## Bear (Round ${round}):\n${bearResult.output}`;
      // accumulate usage...

      if (round < this.rounds) {
        emitter.emit({ type: "handoff", from: "bear", to: "bull", reason: `next round` });
      }
    }

    emitter.emit({ type: "handoff", from: "bear", to: "judge", reason: "debate complete" });

    // Judge evaluates
    const judgeInput = `Thesis: ${thesis}\n\nFull debate transcript:\n${transcript}\n\nEvaluate and declare a winner.`;
    const judgeResult = await this.judge.run(judgeInput, emitter);
    // accumulate usage...

    emitter.emit({ type: "done", totalUsage });
  }
}
```

**Commit:** `feat: add DebateArena with multi-round orchestration`

### 4d.5 Debate PatternRunner (`index.ts`)

- Creates provider, bull, bear, judge, DebateArena
- Exports PatternRunner wrapping DebateArena

**Commit:** `feat: add debate pattern runner`

### 4d.6 Eval Dataset (`eval/dataset.json`)

5 investment theses with quality criteria (argument depth, evidence quality, judge reasoning).

**Commit:** `chore: add debate eval dataset`

## Tests

- `test: add tests for debate transcript accumulation`
- `test: add tests for debate round progression and handoffs`
- `test: add tests for judge receiving full transcript`

## Done When

- [ ] Select Debate → type investment thesis → see 2 rounds of arguments + verdict
- [ ] TraceView shows: bull → bear → bull → bear → judge
- [ ] Each debater references previous arguments (transcript builds)
- [ ] Judge produces reasoned verdict
