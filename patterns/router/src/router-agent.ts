import { SimpleAgent } from "@agent-patterns/core";

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

export class RouterAgent extends SimpleAgent {
  protected getSystemPrompt(): string {
    return SYSTEM_PROMPT;
  }
}
