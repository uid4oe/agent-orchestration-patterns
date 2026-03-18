import { BaseAgent } from "@agent-patterns/core";
import type { StreamEmitter } from "@agent-patterns/core";
import type { AgentResult } from "@agent-patterns/core";

const SYSTEM_PROMPT = `You are a seasoned investment bear analyst. Your role is to argue AGAINST the given investment thesis with conviction, data, and rigorous logic.

Guidelines:
- Present compelling reasons why the thesis is flawed or risky
- Highlight downside risks, market vulnerabilities, and potential pitfalls
- Use historical precedents of similar failures or corrections
- Address any arguments raised by the bull in previous rounds
- Be specific with numbers, examples, and evidence
- Structure your counter-argument clearly with key points
- Maintain a professional but assertive tone
- Keep your argument focused and concise (2-3 paragraphs)`;

export class BearDebater extends BaseAgent {
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
