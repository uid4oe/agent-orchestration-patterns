import type { ChatMessage } from "../llm/types.js";
import type { TokenUsage, StreamEmitter } from "../stream/types.js";
import type { AgentConfig, AgentResult } from "./types.js";

export abstract class BaseAgent {
  protected readonly config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  async run(input: string, emitter: StreamEmitter): Promise<AgentResult> {
    const start = Date.now();
    emitter.emit({
      type: "agent_start",
      agent: this.config.name,
      role: this.config.role,
    });

    try {
      const result = await this.execute(input, emitter);
      const durationMs = Date.now() - start;
      emitter.emit({
        type: "agent_end",
        agent: this.config.name,
        durationMs,
        usage: result.usage,
      });
      return { ...result, durationMs };
    } catch (err) {
      emitter.emit({
        type: "error",
        agent: this.config.name,
        message: String(err),
      });
      throw err;
    }
  }

  protected abstract execute(
    input: string,
    emitter: StreamEmitter,
  ): Promise<AgentResult>;

  /** Stream LLM response, emit chunks, return full output + usage. */
  protected async chatStream(
    messages: ReadonlyArray<ChatMessage>,
    emitter: StreamEmitter,
  ): Promise<{ output: string; usage: TokenUsage }> {
    let output = "";
    for await (const chunk of this.config.provider.chatStream(messages)) {
      output += chunk;
      emitter.emit({
        type: "chunk",
        agent: this.config.name,
        content: chunk,
      });
    }
    const usage = this.config.provider.lastUsage;
    return { output, usage };
  }
}
