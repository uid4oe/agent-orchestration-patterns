import { generateText, streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import type { ChatMessage, LLMConfig, LLMResponse } from "./types.js";
import type { TokenUsage } from "../stream/types.js";

export class LLMProvider {
  private readonly model: LanguageModel;
  private readonly temperature: number | undefined;
  private readonly maxTokens: number | undefined;

  private _lastUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

  constructor(config: LLMConfig) {
    this.model = config.model;
    this.temperature = config.temperature;
    this.maxTokens = config.maxTokens;
  }

  get lastUsage(): TokenUsage {
    return this._lastUsage;
  }

  async chat(messages: ReadonlyArray<ChatMessage>): Promise<LLMResponse> {
    const start = Date.now();
    const result = await generateText({
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: this.temperature,
      maxOutputTokens: this.maxTokens,
    });

    const latencyMs = Date.now() - start;
    const usage: TokenUsage = {
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
    };
    this._lastUsage = usage;

    return {
      content: result.text,
      usage,
      model: result.response.modelId,
      latencyMs,
    };
  }

  async *chatStream(messages: ReadonlyArray<ChatMessage>): AsyncGenerator<string> {
    const result = streamText({
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: this.temperature,
      maxOutputTokens: this.maxTokens,
    });

    for await (const chunk of result.textStream) {
      yield chunk;
    }

    // After stream completes, capture usage
    const finalUsage = await result.usage;
    this._lastUsage = {
      inputTokens: finalUsage.inputTokens ?? 0,
      outputTokens: finalUsage.outputTokens ?? 0,
    };
  }
}

// Provider registry for easy creation
const PROVIDERS = {
  anthropic: (model: string) => anthropic(model),
  openai: (model: string) => openai(model),
  google: (model: string) => google(model),
} as const;

export type ProviderName = keyof typeof PROVIDERS;

export function createProvider(
  provider: ProviderName,
  model: string,
  options?: { temperature?: number; maxTokens?: number },
): LLMProvider {
  const languageModel = PROVIDERS[provider](model);
  return new LLMProvider({
    model: languageModel,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
  });
}
