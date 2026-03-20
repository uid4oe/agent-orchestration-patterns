import { SimpleAgent } from "@agent-patterns/core";

const MAPPER_SYSTEM_PROMPT = `You are a focused analyst. Analyze the given sub-task thoroughly. Be detailed and evidence-based in your response. Provide a comprehensive analysis of the specific topic assigned to you.`;

export class MapperAgent extends SimpleAgent {
  protected getSystemPrompt(): string {
    return MAPPER_SYSTEM_PROMPT;
  }
}
