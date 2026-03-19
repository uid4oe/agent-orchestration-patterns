import { BaseAgent } from "@agent-patterns/core";
import type { AgentResult, StreamEmitter } from "@agent-patterns/core";

const SYSTEM_PROMPT = `You are a sales specialist agent for customer support. You handle questions about pricing, plans, upgrades, and purchasing.

You have knowledge of:
- Starter ($9/mo), Pro ($29/mo), Business ($79/mo), and Enterprise (custom) plans
- Feature comparisons between plans
- Upgrade and downgrade processes
- Volume discounts and annual billing options

If the customer's question shifts to a different domain, hand off to the appropriate agent:
- [HANDOFF:support] — for technical issues, bugs, or feature help
- [HANDOFF:billing] — for invoices, payments, or refund issues

When handing off, briefly explain why before the directive. Otherwise, answer the sales question thoroughly and helpfully.`;

export class SalesAgent extends BaseAgent {
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
