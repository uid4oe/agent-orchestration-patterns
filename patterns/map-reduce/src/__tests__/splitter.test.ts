import { describe, it, expect, vi } from "vitest";
import type {
  StreamEmitter,
  StreamEvent,
  TokenUsage,
  LLMProvider,
  ChatMessage,
  LLMResponse,
} from "@agent-patterns/core";
import { SplitterAgent } from "../agents/splitter.js";

const DEFAULT_USAGE: TokenUsage = { inputTokens: 50, outputTokens: 30 };

function createMockProvider(chatResponse: string): LLMProvider {
  const response: LLMResponse = {
    content: chatResponse,
    usage: DEFAULT_USAGE,
    model: "test-model",
    latencyMs: 100,
  };
  return {
    lastUsage: DEFAULT_USAGE,
    chat: vi
      .fn<(messages: ReadonlyArray<ChatMessage>) => Promise<LLMResponse>>()
      .mockResolvedValue(response),
    chatStream: vi.fn(),
  } as unknown as LLMProvider;
}

function createEmitter(): { emitter: StreamEmitter; events: StreamEvent[] } {
  const events: StreamEvent[] = [];
  return {
    emitter: { emit: (event: StreamEvent) => events.push(event) },
    events,
  };
}

function createSplitter(provider: LLMProvider): SplitterAgent {
  return new SplitterAgent({
    name: "splitter",
    role: "splitter",
    systemPrompt: "",
    provider,
  });
}

describe("SplitterAgent", () => {
  describe("split()", () => {
    it("parses valid JSON subtasks array", async () => {
      const json = JSON.stringify({
        subtasks: ["Analyze X", "Analyze Y", "Analyze Z"],
      });
      const provider = createMockProvider(json);
      const splitter = createSplitter(provider);
      const { emitter } = createEmitter();

      const result = await splitter.split("Research topic", emitter);

      expect(result.subtasks).toHaveLength(3);
      expect(result.subtasks[0]).toBe("Analyze X");
      expect(result.subtasks[1]).toBe("Analyze Y");
      expect(result.subtasks[2]).toBe("Analyze Z");
    });

    it("handles JSON wrapped in markdown code fences", async () => {
      const json =
        "```json\n" +
        JSON.stringify({ subtasks: ["Task A", "Task B"] }) +
        "\n```";
      const provider = createMockProvider(json);
      const splitter = createSplitter(provider);
      const { emitter } = createEmitter();

      const result = await splitter.split("Research topic", emitter);

      expect(result.subtasks).toHaveLength(2);
      expect(result.subtasks[0]).toBe("Task A");
      expect(result.subtasks[1]).toBe("Task B");
    });

    it("throws on invalid JSON", async () => {
      const provider = createMockProvider("not json at all");
      const splitter = createSplitter(provider);
      const { emitter, events } = createEmitter();

      await expect(
        splitter.split("Research topic", emitter),
      ).rejects.toThrow();

      const errorEvent = events.find((e) => e.type === "error");
      expect(errorEvent).toBeDefined();
    });

    it("throws on non-array subtasks", async () => {
      const json = JSON.stringify({ subtasks: "not an array" });
      const provider = createMockProvider(json);
      const splitter = createSplitter(provider);
      const { emitter } = createEmitter();

      await expect(
        splitter.split("Research topic", emitter),
      ).rejects.toThrow("Invalid subtasks format");
    });

    it("emits correct event sequence: agent_start, chunk, agent_end", async () => {
      const json = JSON.stringify({
        subtasks: ["Task A", "Task B"],
      });
      const provider = createMockProvider(json);
      const splitter = createSplitter(provider);
      const { emitter, events } = createEmitter();

      await splitter.split("Research topic", emitter);

      expect(events[0]).toMatchObject({
        type: "agent_start",
        agent: "splitter",
        role: "splitter",
      });

      const chunkEvent = events.find((e) => e.type === "chunk");
      expect(chunkEvent).toMatchObject({
        type: "chunk",
        agent: "splitter",
        content: expect.stringContaining("2 subtasks") as string,
      });

      const endEvent = events.find((e) => e.type === "agent_end");
      expect(endEvent).toMatchObject({
        type: "agent_end",
        agent: "splitter",
        usage: DEFAULT_USAGE,
      });
    });

    it("returns usage from the provider", async () => {
      const json = JSON.stringify({
        subtasks: ["Task A"],
      });
      const provider = createMockProvider(json);
      const splitter = createSplitter(provider);
      const { emitter } = createEmitter();

      const result = await splitter.split("Research topic", emitter);

      expect(result.usage).toEqual(DEFAULT_USAGE);
    });
  });
});
