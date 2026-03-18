import { BaseAgent } from "@agent-patterns/core";
import type { AgentResult, StreamEmitter } from "@agent-patterns/core";

const SYSTEM_PROMPT = `You are a billing support specialist. You are an expert in:
- Invoice questions and discrepancies
- Payment processing and methods
- Refunds and credits
- Subscription billing and plan changes
- Pricing inquiries

Provide clear, helpful responses to billing-related questions. Be empathetic and professional.
If you need more information to resolve the issue, ask specific clarifying questions.`;

export class BillingSpecialist extends BaseAgent {
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
