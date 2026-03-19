import { BaseAgent } from "@agent-patterns/core";
import type {
  AgentResult,
  ChatMessage,
  StreamEmitter,
} from "@agent-patterns/core";

const MAPPER_SYSTEM_PROMPT = `You are a focused analyst. Analyze the given sub-task thoroughly. Be detailed and evidence-based in your response. Provide a comprehensive analysis of the specific topic assigned to you.`;

export class MapperAgent extends BaseAgent {
  protected async execute(
    input: string,
    emitter: StreamEmitter,
  ): Promise<AgentResult> {
    const messages: ReadonlyArray<ChatMessage> = [
      { role: "system", content: MAPPER_SYSTEM_PROMPT },
      { role: "user", content: input },
    ];
    const { output, usage } = await this.chatStream(messages, emitter);
    return { output, usage, durationMs: 0 };
  }
}
