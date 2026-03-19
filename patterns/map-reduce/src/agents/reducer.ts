import { BaseAgent } from "@agent-patterns/core";
import type {
  AgentResult,
  ChatMessage,
  StreamEmitter,
} from "@agent-patterns/core";

const REDUCER_SYSTEM_PROMPT = `You are a synthesis expert. Synthesize multiple independent analyses into one coherent, well-structured response. Eliminate redundancy and resolve contradictions. Produce a unified summary that captures the key insights from all inputs.`;

export class ReducerAgent extends BaseAgent {
  protected async execute(
    input: string,
    emitter: StreamEmitter,
  ): Promise<AgentResult> {
    const messages: ReadonlyArray<ChatMessage> = [
      { role: "system", content: REDUCER_SYSTEM_PROMPT },
      { role: "user", content: input },
    ];
    const { output, usage } = await this.chatStream(messages, emitter);
    return { output, usage, durationMs: 0 };
  }
}
