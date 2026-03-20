import { addUsage } from "@agent-patterns/core";
import type { BaseAgent, StreamEmitter, TokenUsage } from "@agent-patterns/core";

export interface DebateResult {
  output: string;
  totalUsage: TokenUsage;
}

export class DebateArena {
  constructor(
    private readonly bull: BaseAgent,
    private readonly bear: BaseAgent,
    private readonly judge: BaseAgent,
    private readonly rounds: number = 2,
  ) {}

  async run(thesis: string, emitter: StreamEmitter): Promise<DebateResult> {
    let transcript = "";
    const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

    for (let round = 1; round <= this.rounds; round++) {
      // Bull argues
      const bullInput = `Thesis: ${thesis}\n\nTranscript so far:\n${transcript}\n\nPresent your argument FOR.`;
      const bullResult = await this.bull.run(bullInput, emitter);
      transcript += `\n\n## Bull (Round ${round}):\n${bullResult.output}`;
      addUsage(totalUsage, bullResult.usage);

      emitter.emit({
        type: "handoff",
        from: "bull",
        to: "bear",
        reason: `round ${round}`,
      });

      // Bear argues
      const bearInput = `Thesis: ${thesis}\n\nTranscript so far:\n${transcript}\n\nPresent your argument AGAINST.`;
      const bearResult = await this.bear.run(bearInput, emitter);
      transcript += `\n\n## Bear (Round ${round}):\n${bearResult.output}`;
      addUsage(totalUsage, bearResult.usage);

      if (round < this.rounds) {
        emitter.emit({
          type: "handoff",
          from: "bear",
          to: "bull",
          reason: "next round",
        });
      }
    }

    emitter.emit({
      type: "handoff",
      from: "bear",
      to: "judge",
      reason: "debate complete",
    });

    // Judge evaluates
    const judgeInput = `Thesis: ${thesis}\n\nFull debate transcript:\n${transcript}\n\nEvaluate and declare a winner.`;
    const judgeResult = await this.judge.run(judgeInput, emitter);
    addUsage(totalUsage, judgeResult.usage);

    return { output: judgeResult.output, totalUsage };
  }
}
