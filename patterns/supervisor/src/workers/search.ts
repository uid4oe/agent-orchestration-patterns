import { BaseAgent } from "@agent-patterns/core";
import type { AgentResult, StreamEmitter } from "@agent-patterns/core";

const SYSTEM_PROMPT = `You are an information gatherer and research assistant. Your job is to find relevant facts, data points, and sources about a given topic.

When given a research instruction:
1. Identify the key aspects to investigate
2. Gather relevant facts, statistics, and expert opinions
3. Note important sources and references
4. Present findings in a structured, factual format

Focus on breadth of coverage and factual accuracy. Include specific data points, dates, and names where relevant.`;

export class SearchWorker extends BaseAgent {
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
