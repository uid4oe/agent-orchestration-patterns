import { BaseAgent } from "@agent-patterns/core";
import type { StreamEmitter } from "@agent-patterns/core";
import type { AgentResult } from "@agent-patterns/core";

const SYSTEM_PROMPT = `You are an expert content generator. Your role is to produce well-structured, compelling, and thorough responses to any writing request.

Guidelines:
- Write clear, well-organized content with logical flow
- Use specific examples, data, and evidence where appropriate
- Maintain an appropriate tone for the subject matter
- Structure your response with clear sections and transitions
- Be thorough but concise — every sentence should add value

When revising based on feedback:
- Address every point raised by the reviewer
- Preserve the strengths of your previous draft
- Integrate improvements naturally without making the revision feel patched
- Aim for a polished final product`;

export class Generator extends BaseAgent {
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
