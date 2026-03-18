import { describe, it, expect, vi } from "vitest";
import { BaseAgent } from "../agent/base-agent.js";
import type { AgentConfig, AgentResult } from "../agent/types.js";
import type { StreamEmitter, StreamEvent, TokenUsage } from "../stream/types.js";
import type { ChatMessage } from "../llm/types.js";
import type { LLMProvider } from "../llm/provider.js";

function createMockProvider(streamChunks: string[], usage: TokenUsage): LLMProvider {
  const provider = {
    lastUsage: usage,
    chatStream: vi.fn().mockImplementation(async function* (_messages: ReadonlyArray<ChatMessage>) {
      for (const chunk of streamChunks) {
        yield chunk;
      }
    }),
    chat: vi.fn(),
  } as unknown as LLMProvider;
  return provider;
}

function createEmitter(): { emitter: StreamEmitter; events: StreamEvent[] } {
  const events: StreamEvent[] = [];
  const emitter: StreamEmitter = {
    emit: (event: StreamEvent) => events.push(event),
  };
  return { emitter, events };
}

class TestAgent extends BaseAgent {
  protected async execute(input: string, emitter: StreamEmitter): Promise<AgentResult> {
    const messages: ReadonlyArray<ChatMessage> = [
      { role: "system", content: this.config.systemPrompt },
      { role: "user", content: input },
    ];
    const { output, usage } = await this.chatStream(messages, emitter);
    return { output, usage, durationMs: 0 };
  }
}

class FailingAgent extends BaseAgent {
  protected async execute(_input: string, _emitter: StreamEmitter): Promise<AgentResult> {
    throw new Error("agent failure");
  }
}

describe("BaseAgent", () => {
  const defaultUsage: TokenUsage = { inputTokens: 10, outputTokens: 5 };

  function createConfig(overrides?: Partial<AgentConfig>): AgentConfig {
    return {
      name: "test-agent",
      role: "tester",
      systemPrompt: "You are a test agent.",
      provider: createMockProvider(["Hello", " world"], defaultUsage),
      ...overrides,
    };
  }

  describe("event emission", () => {
    it("emits agent_start as the first event", async () => {
      const config = createConfig();
      const agent = new TestAgent(config);
      const { emitter, events } = createEmitter();

      await agent.run("test input", emitter);

      expect(events[0]).toEqual({
        type: "agent_start",
        agent: "test-agent",
        role: "tester",
      });
    });

    it("emits chunk events for each LLM chunk", async () => {
      const config = createConfig();
      const agent = new TestAgent(config);
      const { emitter, events } = createEmitter();

      await agent.run("test input", emitter);

      const chunkEvents = events.filter((e) => e.type === "chunk");
      expect(chunkEvents).toEqual([
        { type: "chunk", agent: "test-agent", content: "Hello" },
        { type: "chunk", agent: "test-agent", content: " world" },
      ]);
    });

    it("emits agent_end as the last event with usage and duration", async () => {
      const config = createConfig();
      const agent = new TestAgent(config);
      const { emitter, events } = createEmitter();

      await agent.run("test input", emitter);

      const lastEvent = events[events.length - 1];
      expect(lastEvent).toMatchObject({
        type: "agent_end",
        agent: "test-agent",
        usage: defaultUsage,
      });
      if (lastEvent?.type === "agent_end") {
        expect(lastEvent.durationMs).toBeGreaterThanOrEqual(0);
      }
    });

    it("emits events in correct order: start, chunks, end", async () => {
      const config = createConfig();
      const agent = new TestAgent(config);
      const { emitter, events } = createEmitter();

      await agent.run("test input", emitter);

      const types = events.map((e) => e.type);
      expect(types).toEqual(["agent_start", "chunk", "chunk", "agent_end"]);
    });
  });

  describe("result", () => {
    it("returns concatenated output from chunks", async () => {
      const config = createConfig();
      const agent = new TestAgent(config);
      const { emitter } = createEmitter();

      const result = await agent.run("test input", emitter);
      expect(result.output).toBe("Hello world");
    });

    it("includes usage from the provider", async () => {
      const config = createConfig();
      const agent = new TestAgent(config);
      const { emitter } = createEmitter();

      const result = await agent.run("test input", emitter);
      expect(result.usage).toEqual(defaultUsage);
    });

    it("includes duration in result", async () => {
      const config = createConfig();
      const agent = new TestAgent(config);
      const { emitter } = createEmitter();

      const result = await agent.run("test input", emitter);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("error handling", () => {
    it("emits error event when execute throws", async () => {
      const config = createConfig();
      const agent = new FailingAgent(config);
      const { emitter, events } = createEmitter();

      await expect(agent.run("test input", emitter)).rejects.toThrow("agent failure");

      const errorEvents = events.filter((e) => e.type === "error");
      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0]).toMatchObject({
        type: "error",
        agent: "test-agent",
        message: expect.stringContaining("agent failure") as string,
      });
    });

    it("re-throws the error after emitting", async () => {
      const config = createConfig();
      const agent = new FailingAgent(config);
      const { emitter } = createEmitter();

      await expect(agent.run("test input", emitter)).rejects.toThrow("agent failure");
    });

    it("still emits agent_start before error", async () => {
      const config = createConfig();
      const agent = new FailingAgent(config);
      const { emitter, events } = createEmitter();

      await expect(agent.run("test input", emitter)).rejects.toThrow();

      expect(events[0]).toEqual({
        type: "agent_start",
        agent: "test-agent",
        role: "tester",
      });
    });
  });
});
