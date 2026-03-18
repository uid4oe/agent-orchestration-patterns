import { BaseAgent } from "@agent-patterns/core";
import type { AgentResult, StreamEmitter } from "@agent-patterns/core";

const SYSTEM_PROMPT = `You are a general customer support agent. You handle:
- Business hours and location inquiries
- Company policies and procedures
- Account management questions
- Product information and FAQs
- Any inquiries that don't fall under billing or technical support

Provide friendly, informative responses. If a question would be better handled by
a billing or technical specialist, let the customer know you can help with general
information but suggest they reach out to the appropriate team for detailed assistance.`;

export class GeneralSpecialist extends BaseAgent {
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
