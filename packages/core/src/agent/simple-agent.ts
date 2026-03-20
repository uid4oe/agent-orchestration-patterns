import type { StreamEmitter } from "../stream/types.js";
import type { AgentResult } from "./types.js";
import { BaseAgent } from "./base-agent.js";

/**
 * Base class for single-prompt agents that stream a response from one
 * system prompt + user message pair.
 *
 * Subclasses only need to provide `getSystemPrompt()`. Override
 * `formatInput()` to wrap or transform the user input before sending.
 */
export abstract class SimpleAgent extends BaseAgent {
  /** The system prompt for this agent. */
  protected abstract getSystemPrompt(): string;

  /** Override to transform user input before sending to the LLM. */
  protected formatInput(input: string): string {
    return input;
  }

  protected async execute(
    input: string,
    emitter: StreamEmitter,
  ): Promise<AgentResult> {
    const { output, usage } = await this.chatStream(
      [
        { role: "system", content: this.getSystemPrompt() },
        { role: "user", content: this.formatInput(input) },
      ],
      emitter,
    );
    return { output, usage, durationMs: 0 };
  }
}
