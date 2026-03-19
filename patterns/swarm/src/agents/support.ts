import { BaseAgent } from "@agent-patterns/core";
import type { AgentResult, StreamEmitter } from "@agent-patterns/core";

const SYSTEM_PROMPT = `You are a technical support specialist agent. You handle technical issues, troubleshooting, bugs, crashes, errors, and feature questions.

You can help with:
- Application errors and crashes
- API issues (authentication, rate limits, 4xx/5xx errors)
- Performance problems
- Feature usage and configuration
- Integration troubleshooting

If the customer's question shifts to a different domain, hand off to the appropriate agent:
- [HANDOFF:sales] — for pricing, plan upgrades, or purchasing questions
- [HANDOFF:billing] — for invoices, payments, or refund issues

When handing off, briefly explain why before the directive. Otherwise, provide clear, step-by-step troubleshooting guidance.`;

export class SupportAgent extends BaseAgent {
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
