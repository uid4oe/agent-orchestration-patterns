import type { TokenUsage } from "../stream/types.js";

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
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}
