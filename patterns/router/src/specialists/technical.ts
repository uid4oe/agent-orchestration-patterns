import { BaseAgent } from "@agent-patterns/core";
import type { AgentResult, StreamEmitter } from "@agent-patterns/core";

const SYSTEM_PROMPT = `You are a technical support specialist. You are an expert in:
- Application bugs and crashes
- Performance issues and troubleshooting
- Feature usage and configuration
- Integration and API questions
- System requirements and compatibility

Provide clear, step-by-step guidance for technical issues. Ask for error messages,
screenshots, or system details when needed to diagnose problems effectively.`;

export class TechnicalSpecialist extends BaseAgent {
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
