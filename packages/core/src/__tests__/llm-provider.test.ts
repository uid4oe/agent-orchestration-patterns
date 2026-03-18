import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LLMProvider } from "../llm/provider.js";

function mockFetchResponse(body: unknown, status = 200): void {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
    body: null,
  } as unknown as Response;

  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

function mockStreamResponse(chunks: string[]): void {
  let index = 0;
  const reader = {
    read: vi.fn().mockImplementation(() => {
      if (index >= chunks.length) {
        return Promise.resolve({ done: true, value: undefined });
      }
      const value = new TextEncoder().encode(chunks[index]!);
      index++;
      return Promise.resolve({ done: false, value });
    }),
  };

  const response = {
    ok: true,
    status: 200,
    body: { getReader: () => reader },
  } as unknown as Response;

  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

const TEST_CONFIG = {
  baseUrl: "https://test.example.com/v1",
  apiKey: "test-key",
  model: "test-model",
};

describe("LLMProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("constructor", () => {
    it("throws when required config is missing", () => {
      expect(() => new LLMProvider({})).toThrow(
        "LLM_BASE_URL, LLM_API_KEY, and LLM_MODEL are required",
      );
    });

    it("accepts explicit config", () => {
      expect(() => new LLMProvider(TEST_CONFIG)).not.toThrow();
    });

    it("reads from env vars when config is partial", () => {
      process.env["LLM_BASE_URL"] = "https://env.example.com/v1";
      process.env["LLM_API_KEY"] = "env-key";
      process.env["LLM_MODEL"] = "env-model";

      expect(() => new LLMProvider()).not.toThrow();

      delete process.env["LLM_BASE_URL"];
      delete process.env["LLM_API_KEY"];
      delete process.env["LLM_MODEL"];
    });
  });

  describe("chat", () => {
    it("returns LLMResponse from non-streaming call", async () => {
      mockFetchResponse({
        choices: [{ message: { content: "Hello world" } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
        model: "test-model",
      });

      const provider = new LLMProvider(TEST_CONFIG);
      const result = await provider.chat([{ role: "user", content: "Hi" }]);

      expect(result.content).toBe("Hello world");
      expect(result.usage.inputTokens).toBe(10);
      expect(result.usage.outputTokens).toBe(5);
      expect(result.model).toBe("test-model");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("throws on non-200 response", async () => {
      mockFetchResponse({ error: "bad request" }, 400);

      const provider = new LLMProvider(TEST_CONFIG);
      await expect(
        provider.chat([{ role: "user", content: "Hi" }]),
      ).rejects.toThrow("LLM request failed (400)");
    });

    it("handles missing usage gracefully", async () => {
      mockFetchResponse({
        choices: [{ message: { content: "Hello" } }],
        model: "test-model",
      });

      const provider = new LLMProvider(TEST_CONFIG);
      const result = await provider.chat([{ role: "user", content: "Hi" }]);

      expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
    });
  });

  describe("chatStream", () => {
    it("yields content chunks from SSE stream", async () => {
      mockStreamResponse([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
        "data: [DONE]\n\n",
      ]);

      const provider = new LLMProvider(TEST_CONFIG);
      const chunks: string[] = [];
      for await (const chunk of provider.chatStream([{ role: "user", content: "Hi" }])) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(["Hello", " world"]);
    });

    it("skips empty delta content", async () => {
      mockStreamResponse([
        'data: {"choices":[{"delta":{}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"text"}}]}\n\n',
        "data: [DONE]\n\n",
      ]);

      const provider = new LLMProvider(TEST_CONFIG);
      const chunks: string[] = [];
      for await (const chunk of provider.chatStream([{ role: "user", content: "Hi" }])) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(["text"]);
    });

    it("handles chunked SSE lines split across reads", async () => {
      mockStreamResponse([
        'data: {"choices":[{"delta":{"con',
        'tent":"split"}}]}\n\ndata: [DONE]\n\n',
      ]);

      const provider = new LLMProvider(TEST_CONFIG);
      const chunks: string[] = [];
      for await (const chunk of provider.chatStream([{ role: "user", content: "Hi" }])) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(["split"]);
    });

    it("extracts usage from stream chunks", async () => {
      mockStreamResponse([
        'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n',
        'data: {"choices":[{"delta":{}}],"usage":{"prompt_tokens":15,"completion_tokens":3}}\n\n',
        "data: [DONE]\n\n",
      ]);

      const provider = new LLMProvider(TEST_CONFIG);
      const chunks: string[] = [];
      for await (const chunk of provider.chatStream([{ role: "user", content: "Hi" }])) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(["Hi"]);
      expect(provider.lastUsage).toEqual({ inputTokens: 15, outputTokens: 3 });
    });

    it("throws on non-200 streaming response", async () => {
      const response = {
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
        body: null,
      } as unknown as Response;

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

      const provider = new LLMProvider(TEST_CONFIG);

      await expect(async () => {
        for await (const _ of provider.chatStream([{ role: "user", content: "Hi" }])) {
          // should not reach here
        }
      }).rejects.toThrow("LLM request failed (500)");
    });
  });
});
