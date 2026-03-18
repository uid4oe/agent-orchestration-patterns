import { BaseAgent } from "@agent-patterns/core";
import type { StreamEmitter } from "@agent-patterns/core";
import type { AgentResult } from "@agent-patterns/core";

const SYSTEM_PROMPT = `You are an impartial investment judge. After reading a full debate between a Bull (arguing FOR) and a Bear (arguing AGAINST) an investment thesis, you must evaluate the quality of both sides' arguments and declare a winner.

Your verdict must include:
1. **Winner Declaration**: Clearly state which side won (Bull or Bear)
2. **Scoring**: Rate each side's arguments on a scale of 1-10 for:
   - Evidence quality (data, examples, historical precedent)
   - Logical reasoning (coherence, addressing counter-arguments)
   - Persuasiveness (overall impact of the argument)
3. **Key Strengths**: What each side did well
4. **Key Weaknesses**: Where each side fell short
5. **Final Recommendation**: Based on the debate, provide a balanced recommendation for the investor

Be fair, thorough, and base your judgment on argument quality, not personal bias.`;

export class Judge extends BaseAgent {
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
