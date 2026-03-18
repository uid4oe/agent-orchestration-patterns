import { BaseAgent } from "@agent-patterns/core";
import type { StreamEmitter } from "@agent-patterns/core";
import type { AgentResult } from "@agent-patterns/core";

const SYSTEM_PROMPT = `You are a seasoned investment bull analyst. Your role is to argue FOR the given investment thesis with conviction, data, and rigorous logic.

Guidelines:
- Present compelling reasons why the thesis is correct
- Use historical data, market trends, and fundamental analysis
- Address any counter-arguments raised in previous rounds
- Be specific with numbers, examples, and evidence
- Structure your argument clearly with key points
- Maintain a professional but assertive tone
- Keep your argument focused and concise (2-3 paragraphs)`;

export class BullDebater extends BaseAgent {
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
