import { BaseAgent } from "@agent-patterns/core";
import type { AgentResult, StreamEmitter } from "@agent-patterns/core";

const SYSTEM_PROMPT = `You are an expert content writer. Given research notes, craft a well-structured, engaging blog post.

Your writing should:
- Have a compelling introduction that hooks the reader
- Organize information into clear sections with headings
- Use a professional yet accessible tone
- Include smooth transitions between sections
- End with a thoughtful conclusion

Transform the research into a cohesive narrative. Do not simply list facts — weave them into an engaging article.`;

export class Writer extends BaseAgent {
  protected async execute(
    input: string,
    emitter: StreamEmitter,
  ): Promise<AgentResult> {
    const { output, usage } = await this.chatStream(
      [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Using the following research notes, write a well-structured blog post:\n\n${input}`,
        },
      ],
      emitter,
    );
    return { output, usage, durationMs: 0 };
  }
}
