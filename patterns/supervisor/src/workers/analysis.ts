import { BaseAgent } from "@agent-patterns/core";
import type { AgentResult, StreamEmitter } from "@agent-patterns/core";

const SYSTEM_PROMPT = `You are an analytical research specialist. Your job is to analyze information, identify patterns, compare perspectives, and draw insights.

When given information to analyze:
1. Identify key themes and patterns
2. Compare different perspectives or approaches
3. Evaluate the significance of findings
4. Draw meaningful insights and connections
5. Note any gaps or areas needing further investigation

Focus on depth of analysis, critical thinking, and connecting disparate pieces of information into a coherent narrative.`;

export class AnalysisWorker extends BaseAgent {
  protected async execute(
    input: string,
    emitter: StreamEmitter,
  ): Promise<AgentResult> {
    const { output, usage } = await this.chatStream(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: input },
      ],
      emitter,
    );

    return { output, usage, durationMs: 0 };
  }
}
