import type { ChatMessage, LLMConfig, LLMResponse } from "./types.js";
import type { TokenUsage } from "../stream/types.js";

interface OpenAIChatChunk {
  choices: ReadonlyArray<{
    delta: { content?: string };
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

interface OpenAIChatResponse {
  choices: ReadonlyArray<{
    message: { content: string };
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
  model: string;
}

function parseUsage(raw: { prompt_tokens: number; completion_tokens: number } | undefined): TokenUsage {
  if (!raw) {
    return { inputTokens: 0, outputTokens: 0 };
  }
  return {
    inputTokens: raw.prompt_tokens,
    outputTokens: raw.completion_tokens,
  };
}

export class LLMProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly temperature: number | undefined;
  private readonly maxTokens: number | undefined;

  private _lastUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

  constructor(config?: Partial<LLMConfig>) {
    const baseUrl = config?.baseUrl ?? process.env["LLM_BASE_URL"];
    const apiKey = config?.apiKey ?? process.env["LLM_API_KEY"];
    const model = config?.model ?? process.env["LLM_MODEL"];

    if (!baseUrl || !apiKey || !model) {
      throw new Error("LLM_BASE_URL, LLM_API_KEY, and LLM_MODEL are required");
    }

    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.model = model;
    this.temperature = config?.temperature;
    this.maxTokens = config?.maxTokens;
  }

  get lastUsage(): TokenUsage {
    return this._lastUsage;
  }

  async chat(messages: ReadonlyArray<ChatMessage>): Promise<LLMResponse> {
    const start = Date.now();

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      stream: false,
    };
    if (this.temperature !== undefined) body["temperature"] = this.temperature;
    if (this.maxTokens !== undefined) body["max_tokens"] = this.maxTokens;

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LLM request failed (${String(res.status)}): ${text}`);
    }

    const data = (await res.json()) as OpenAIChatResponse;
    const latencyMs = Date.now() - start;
    const usage = parseUsage(data.usage);
    this._lastUsage = usage;

    return {
      content: data.choices[0]?.message.content ?? "",
      usage,
      model: data.model,
      latencyMs,
    };
  }

  async *chatStream(messages: ReadonlyArray<ChatMessage>): AsyncGenerator<string> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      stream: true,
      stream_options: { include_usage: true },
    };
    if (this.temperature !== undefined) body["temperature"] = this.temperature;
    if (this.maxTokens !== undefined) body["max_tokens"] = this.maxTokens;

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LLM request failed (${String(res.status)}): ${text}`);
    }

    if (!res.body) {
      throw new Error("LLM response has no body");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let lastUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            this._lastUsage = lastUsage;
            return;
          }

          const parsed = JSON.parse(data) as OpenAIChatChunk;
          if (parsed.usage) {
            lastUsage = parseUsage(parsed.usage);
          }
          const content = parsed.choices[0]?.delta?.content;
          if (content) yield content;
        }
      }
    } finally {
      this._lastUsage = lastUsage;
    }
  }
}
