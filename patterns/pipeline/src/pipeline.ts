import type { BaseAgent, TokenUsage, StreamEmitter } from "@agent-patterns/core";

export interface PipelineStage {
  name: string;
  agent: BaseAgent;
}

export interface PipelineResult {
  output: string;
  totalUsage: TokenUsage;
}

export class Pipeline {
  private readonly stages: ReadonlyArray<PipelineStage>;

  constructor(stages: ReadonlyArray<PipelineStage>) {
    this.stages = stages;
  }

  async run(input: string, emitter: StreamEmitter): Promise<PipelineResult> {
    let currentInput = input;
    const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

    for (let i = 0; i < this.stages.length; i++) {
      const stage = this.stages[i]!;
      const result = await stage.agent.run(currentInput, emitter);

      currentInput = result.output;
      totalUsage.inputTokens += result.usage.inputTokens;
      totalUsage.outputTokens += result.usage.outputTokens;

      if (i < this.stages.length - 1) {
        const nextStage = this.stages[i + 1]!;
        emitter.emit({
          type: "handoff",
          from: stage.name,
          to: nextStage.name,
          reason: "passing to next stage",
        });
      }
    }

    return { output: currentInput, totalUsage };
  }
}
