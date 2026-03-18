import { BaseAgent } from "@agent-patterns/core";
import type { AgentResult, StreamEmitter } from "@agent-patterns/core";

const SYSTEM_PROMPT = `You are a customer support router. Your ONLY job is to classify the user's intent into exactly one category.

Respond with ONLY one of these words, nothing else:
- BILLING — for invoice, payment, refund, subscription, or pricing questions
- TECHNICAL — for bugs, crashes, errors, performance issues, or feature help
- GENERAL — for business hours, company info, account questions, or anything else

Do not explain your reasoning. Do not add any other text. Respond with exactly one word.`;

export type IntentCategory = "BILLING" | "TECHNICAL" | "GENERAL";

const VALID_CATEGORIES: ReadonlyArray<IntentCategory> = [
  "BILLING",
  "TECHNICAL",
  "GENERAL",
];

export function parseIntent(raw: string): IntentCategory {
  const trimmed = raw.trim().toUpperCase();
  for (const category of VALID_CATEGORIES) {
    if (trimmed.includes(category)) {
      return category;
    }
  }
  return "GENERAL";
}

export class RouterAgent extends BaseAgent {
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
