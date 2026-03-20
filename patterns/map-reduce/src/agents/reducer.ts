import { SimpleAgent } from "@agent-patterns/core";

const REDUCER_SYSTEM_PROMPT = `You are a synthesis expert. Synthesize multiple independent analyses into one coherent, well-structured response. Eliminate redundancy and resolve contradictions. Produce a unified summary that captures the key insights from all inputs.`;

export class ReducerAgent extends SimpleAgent {
  protected getSystemPrompt(): string {
    return REDUCER_SYSTEM_PROMPT;
  }
}
