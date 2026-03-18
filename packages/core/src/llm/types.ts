import type { LanguageModel } from "ai";
import type { TokenUsage } from "../stream/types.js";

export type { LanguageModel } from "ai";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  usage: TokenUsage;
  model: string;
  latencyMs: number;
}

export interface LLMConfig {
  model: LanguageModel;
  temperature?: number;
  maxTokens?: number;
}
