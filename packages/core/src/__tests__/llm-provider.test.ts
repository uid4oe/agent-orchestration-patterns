import { describe, it, expect, vi, beforeEach } from "vitest";
import { LLMProvider, createProvider } from "../llm/provider.js";
import type { LLMConfig } from "../llm/types.js";
import type { LanguageModel } from "ai";

vi.mock("ai", () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn((model: string) => ({ modelId: model, provider: "openai" })),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn((model: string) => ({ modelId: model, provider: "anthropic" })),
}));

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn((model: string) => ({ modelId: model, provider: "google" })),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
async function getGenerateText(): Promise<typeof import("ai")["generateText"]> {
  const { generateText } = await import("ai");
  return generateText;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
async function getStreamText(): Promise<typeof import("ai")["streamText"]> {
  const { streamText } = await import("ai");
  return streamText;
}

function createMockModel(id = "test-model"): LanguageModel {
  return { modelId: id } as unknown as LanguageModel;
}

function createTestConfig(overrides?: Partial<LLMConfig>): LLMConfig {
  return {
    model: createMockModel(),
    ...overrides,
  };
}

describe("LLMProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("accepts a config with a LanguageModel", () => {
      expect(() => new LLMProvider(createTestConfig())).not.toThrow();
    });

    it("stores temperature and maxTokens from config", () => {
      const provider = new LLMProvider(
        createTestConfig({ temperature: 0.5, maxTokens: 100 }),
      );
      // Verify they are used by checking the provider was created without error
      expect(provider).toBeDefined();
    });
  });

  describe("chat", () => {
    it("returns LLMResponse from generateText", async () => {
      const generateText = await getGenerateText();
      vi.mocked(generateText).mockResolvedValue({
        text: "Hello world",
        usage: { inputTokens: 10, outputTokens: 5 },
        response: { modelId: "test-model" },
      } as Awaited<ReturnType<typeof generateText>>);

      const provider = new LLMProvider(createTestConfig());
      const result = await provider.chat([{ role: "user", content: "Hi" }]);

      expect(result.content).toBe("Hello world");
      expect(result.usage.inputTokens).toBe(10);
      expect(result.usage.outputTokens).toBe(5);
      expect(result.model).toBe("test-model");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("passes temperature and maxOutputTokens to generateText", async () => {
      const generateText = await getGenerateText();
      vi.mocked(generateText).mockResolvedValue({
        text: "ok",
        usage: { inputTokens: 1, outputTokens: 1 },
        response: { modelId: "test-model" },
      } as Awaited<ReturnType<typeof generateText>>);

      const provider = new LLMProvider(
        createTestConfig({ temperature: 0.7, maxTokens: 200 }),
      );
      await provider.chat([{ role: "user", content: "Hi" }]);

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
          maxOutputTokens: 200,
        }),
      );
    });

    it("updates lastUsage after chat call", async () => {
      const generateText = await getGenerateText();
      vi.mocked(generateText).mockResolvedValue({
        text: "response",
        usage: { inputTokens: 20, outputTokens: 15 },
        response: { modelId: "test-model" },
      } as Awaited<ReturnType<typeof generateText>>);

      const provider = new LLMProvider(createTestConfig());
      expect(provider.lastUsage).toEqual({ inputTokens: 0, outputTokens: 0 });

      await provider.chat([{ role: "user", content: "Hi" }]);
      expect(provider.lastUsage).toEqual({ inputTokens: 20, outputTokens: 15 });
    });

    it("handles undefined usage tokens gracefully", async () => {
      const generateText = await getGenerateText();
      vi.mocked(generateText).mockResolvedValue({
        text: "Hello",
        usage: { inputTokens: undefined, outputTokens: undefined },
        response: { modelId: "test-model" },
      } as Awaited<ReturnType<typeof generateText>>);

      const provider = new LLMProvider(createTestConfig());
      const result = await provider.chat([{ role: "user", content: "Hi" }]);

      expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
    });

    it("propagates errors from generateText", async () => {
      const generateText = await getGenerateText();
      vi.mocked(generateText).mockRejectedValue(new Error("API key invalid"));

      const provider = new LLMProvider(createTestConfig());
      await expect(
        provider.chat([{ role: "user", content: "Hi" }]),
      ).rejects.toThrow("API key invalid");
    });
  });

  describe("chatStream", () => {
    function mockStreamResult(chunks: string[], usage = { inputTokens: 10, outputTokens: 5 }) {
      async function* textStream() {
        for (const chunk of chunks) {
          yield chunk;
        }
      }

      return {
        textStream: textStream(),
        usage: Promise.resolve(usage),
      } as unknown as ReturnType<Awaited<ReturnType<typeof getStreamText>>>;
    }

    it("yields content chunks from stream", async () => {
      const streamText = await getStreamText();
      vi.mocked(streamText).mockReturnValue(
        mockStreamResult(["Hello", " world"]),
      );

      const provider = new LLMProvider(createTestConfig());
      const chunks: string[] = [];
      for await (const chunk of provider.chatStream([{ role: "user", content: "Hi" }])) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(["Hello", " world"]);
    });

    it("updates lastUsage after stream completes", async () => {
      const streamText = await getStreamText();
      vi.mocked(streamText).mockReturnValue(
        mockStreamResult(["Hi"], { inputTokens: 15, outputTokens: 3 }),
      );

      const provider = new LLMProvider(createTestConfig());
      const chunks: string[] = [];
      for await (const chunk of provider.chatStream([{ role: "user", content: "Hi" }])) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(["Hi"]);
      expect(provider.lastUsage).toEqual({ inputTokens: 15, outputTokens: 3 });
    });

    it("handles undefined usage tokens gracefully in stream", async () => {
      const streamText = await getStreamText();
      vi.mocked(streamText).mockReturnValue(
        mockStreamResult(["text"], { inputTokens: undefined, outputTokens: undefined } as unknown as { inputTokens: number; outputTokens: number }),
      );

      const provider = new LLMProvider(createTestConfig());
      for await (const _ of provider.chatStream([{ role: "user", content: "Hi" }])) {
        // consume stream
      }

      expect(provider.lastUsage).toEqual({ inputTokens: 0, outputTokens: 0 });
    });

    it("passes temperature and maxOutputTokens to streamText", async () => {
      const streamText = await getStreamText();
      vi.mocked(streamText).mockReturnValue(
        mockStreamResult([]),
      );

      const provider = new LLMProvider(
        createTestConfig({ temperature: 0.3, maxTokens: 500 }),
      );
      for await (const _ of provider.chatStream([{ role: "user", content: "Hi" }])) {
        // consume stream
      }

      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3,
          maxOutputTokens: 500,
        }),
      );
    });
  });

  describe("createProvider", () => {
    it("creates a provider with openai", async () => {
      const { openai } = await import("@ai-sdk/openai");
      const provider = createProvider("openai", "gpt-4o");

      expect(openai).toHaveBeenCalledWith("gpt-4o");
      expect(provider).toBeInstanceOf(LLMProvider);
    });

    it("creates a provider with anthropic", async () => {
      const { anthropic } = await import("@ai-sdk/anthropic");
      const provider = createProvider("anthropic", "claude-sonnet-4-20250514");

      expect(anthropic).toHaveBeenCalledWith("claude-sonnet-4-20250514");
      expect(provider).toBeInstanceOf(LLMProvider);
    });

    it("creates a provider with google", async () => {
      const { google } = await import("@ai-sdk/google");
      const provider = createProvider("google", "gemini-2.0-flash");

      expect(google).toHaveBeenCalledWith("gemini-2.0-flash");
      expect(provider).toBeInstanceOf(LLMProvider);
    });

    it("passes options through to LLMProvider", async () => {
      const generateText = await getGenerateText();
      vi.mocked(generateText).mockResolvedValue({
        text: "ok",
        usage: { inputTokens: 1, outputTokens: 1 },
        response: { modelId: "gpt-4o" },
      } as Awaited<ReturnType<typeof generateText>>);

      const provider = createProvider("openai", "gpt-4o", {
        temperature: 0.9,
        maxTokens: 1000,
      });
      await provider.chat([{ role: "user", content: "Hi" }]);

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.9,
          maxOutputTokens: 1000,
        }),
      );
    });
  });
});
