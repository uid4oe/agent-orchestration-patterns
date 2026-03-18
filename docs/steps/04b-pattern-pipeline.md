# Step 4b: Pipeline Pattern

**Agent:** `pattern-builder`
**Branch:** `feat/pattern-pipeline`
**Depends on:** Steps 1-2 (core + server)
**Parallel with:** Steps 4a, 4c, 4d (other patterns)

## Overview

Content creation pipeline: sequential chain where each agent transforms and passes to the next. Researcher → Writer → Editor.

## Demo Scenario

Input: "Write a blog post about the future of WebAssembly"
- Researcher gathers key points and trends
- Writer drafts a blog post from the research
- Editor polishes, improves structure, fixes tone

## Implementation Order

### 4b.1 Researcher Stage (`stages/researcher.ts`)

- Extends BaseAgent
- System prompt: research expert, gather key facts, trends, and data points on a topic
- `execute()`: streams research findings (bullet points, key themes)

**Commit:** `feat: add researcher stage agent`

### 4b.2 Writer Stage (`stages/writer.ts`)

- Extends BaseAgent
- System prompt: content writer, turn research into a well-structured blog post
- `execute()`: receives research output, streams a drafted article

**Commit:** `feat: add writer stage agent`

### 4b.3 Editor Stage (`stages/editor.ts`)

- Extends BaseAgent
- System prompt: editor, polish prose, improve structure, fix grammar
- `execute()`: receives draft, streams polished version

**Commit:** `feat: add editor stage agent`

### 4b.4 Pipeline Class (`pipeline.ts`)

Generic reusable pipeline:

```typescript
class Pipeline {
  constructor(private stages: BaseAgent[]) {}

  async run(input: string, emitter: StreamEmitter): Promise<void> {
    let currentInput = input;
    let totalUsage = { inputTokens: 0, outputTokens: 0 };

    for (let i = 0; i < this.stages.length; i++) {
      const stage = this.stages[i];
      const result = await stage.run(currentInput, emitter);

      if (i < this.stages.length - 1) {
        emitter.emit({
          type: "handoff",
          from: stage.config.name,
          to: this.stages[i + 1].config.name,
          reason: "passing to next stage"
        });
      }

      currentInput = result.output;
      totalUsage.inputTokens += result.usage.inputTokens;
      totalUsage.outputTokens += result.usage.outputTokens;
    }

    emitter.emit({ type: "done", totalUsage });
  }
}
```

**Commit:** `feat: add generic Pipeline class with sequential execution`

### 4b.5 Pipeline PatternRunner (`index.ts`)

- Creates provider, 3 stage agents, Pipeline instance
- Exports PatternRunner

**Commit:** `feat: add pipeline pattern runner`

### 4b.6 Eval Dataset (`eval/dataset.json`)

5 test cases with topics and quality criteria per stage.

**Commit:** `chore: add pipeline eval dataset`

## Tests

- `test: add tests for pipeline sequential execution and handoffs`
- `test: add tests for pipeline token usage aggregation`

## Done When

- [ ] Select Pipeline → type a topic → see 3 stages streaming sequentially
- [ ] TraceView shows linear: researcher → writer → editor
- [ ] Each stage's output feeds into the next
