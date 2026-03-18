import { BaseAgent } from "@agent-patterns/core";
import type { AgentResult, StreamEmitter } from "@agent-patterns/core";

const SYSTEM_PROMPT = `You are a research summarizer and report writer. Your job is to produce clear, comprehensive, and well-structured reports from research findings and analysis.

When given research content to summarize:
1. Organize information into logical sections
2. Highlight the most important findings
3. Present a balanced, well-rounded perspective
4. Use clear, accessible language
5. Include relevant details without unnecessary verbosity

Focus on clarity, completeness, and producing a report that is immediately useful to the reader.`;

export class SummaryWorker extends BaseAgent {
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
