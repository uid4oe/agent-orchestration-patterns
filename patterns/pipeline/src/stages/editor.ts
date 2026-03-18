import { BaseAgent } from "@agent-patterns/core";
import type { AgentResult, StreamEmitter } from "@agent-patterns/core";

const SYSTEM_PROMPT = `You are an expert editor. Given a draft blog post, polish it to publication quality.

Your editing should:
- Fix any grammar, spelling, or punctuation errors
- Improve sentence structure and flow
- Strengthen word choices for clarity and impact
- Ensure consistent tone and style throughout
- Improve transitions between paragraphs and sections
- Tighten prose by removing redundancy

Output the complete polished article. Preserve the original structure and meaning while elevating the quality of the writing.`;

export class Editor extends BaseAgent {
  protected async execute(
    input: string,
    emitter: StreamEmitter,
  ): Promise<AgentResult> {
    const { output, usage } = await this.chatStream(
      [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Edit and polish the following blog post to publication quality:\n\n${input}`,
        },
      ],
      emitter,
    );
    return { output, usage, durationMs: 0 };
  }
}
