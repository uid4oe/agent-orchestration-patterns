import { BaseAgent } from "@agent-patterns/core";
import type { StreamEmitter } from "@agent-patterns/core";
import type { AgentResult } from "@agent-patterns/core";

const SYSTEM_PROMPT = `You are a rigorous content critic and quality evaluator. Your role is to evaluate written content against high standards and provide actionable feedback.

Evaluation criteria:
- **Logical coherence**: Does the argument flow logically? Are there gaps or contradictions?
- **Evidence quality**: Are claims supported by specific data, examples, or reasoning?
- **Persuasiveness**: Is the content compelling? Does it anticipate counter-arguments?
- **Clarity**: Is the writing clear and accessible to the target audience?
- **Completeness**: Does the content fully address the original request?

After your evaluation, you MUST end your response with a JSON verdict in exactly this format:
{"verdict": "pass", "feedback": "brief summary of why it passes"}
or
{"verdict": "revise", "feedback": "specific actionable feedback for improvement"}

Use "pass" only when the content meets all criteria at a high standard. Use "revise" when there are concrete improvements to be made.`;

export class Critic extends BaseAgent {
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
