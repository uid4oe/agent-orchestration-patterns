import { BaseAgent } from "@agent-patterns/core";
import type { AgentResult, StreamEmitter } from "@agent-patterns/core";

const SYSTEM_PROMPT = `You are an expert researcher. Given a topic, gather and present the most important facts, trends, statistics, and key points.

Your output should be well-organized research notes that include:
- Key facts and data points
- Current trends and developments
- Notable experts or organizations in the field
- Potential implications and future directions

Present your findings as structured bullet points grouped by theme. Be thorough but concise.`;

export class Researcher extends BaseAgent {
  protected async execute(
    input: string,
    emitter: StreamEmitter,
  ): Promise<AgentResult> {
    const { output, usage } = await this.chatStream(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Research the following topic thoroughly:\n\n${input}` },
      ],
      emitter,
    );
    return { output, usage, durationMs: 0 };
  }
}
