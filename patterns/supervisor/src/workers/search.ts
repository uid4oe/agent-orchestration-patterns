import { SimpleAgent } from "@agent-patterns/core";

const SYSTEM_PROMPT = `You are an information gatherer and research assistant. Your job is to find relevant facts, data points, and sources about a given topic.

When given a research instruction:
1. Identify the key aspects to investigate
2. Gather relevant facts, statistics, and expert opinions
3. Note important sources and references
4. Present findings in a structured, factual format

Focus on breadth of coverage and factual accuracy. Include specific data points, dates, and names where relevant.`;

export class SearchWorker extends SimpleAgent {
  protected getSystemPrompt(): string {
    return SYSTEM_PROMPT;
  }
}
