import type { LLMProvider } from "../llm/provider.js";
import type { TokenUsage } from "../stream/types.js";

export interface AgentConfig {
  name: string;
  role: string;
  systemPrompt: string;
  provider: LLMProvider;
}

export interface AgentResult {
  output: string;
  usage: TokenUsage;
  durationMs?: number;
}
