import { describe, it, expect, vi } from "vitest";
import { BaseAgent } from "@agent-patterns/core";
import type { AgentResult, StreamEmitter, StreamEvent, TokenUsage, ChatMessage } from "@agent-patterns/core";
import type { LLMProvider } from "@agent-patterns/core";
import { Pipeline } from "../pipeline.js";

function createMockProvider(streamChunks: string[], usage: TokenUsage): LLMProvider {
  return {
    lastUsage: usage,
    chatStream: vi.fn().mockImplementation(async function* (_messages: ReadonlyArray<ChatMessage>) {
      for (const chunk of streamChunks) {
        yield chunk;
      }
    }),
    chat: vi.fn(),
  } as unknown as LLMProvider;
}

function createEmitter(): { emitter: StreamEmitter; events: StreamEvent[] } {
  const events: StreamEvent[] = [];
  const emitter: StreamEmitter = {
    emit: (event: StreamEvent) => events.push(event),
  };
  return { emitter, events };
}

class StubAgent extends BaseAgent {
  private readonly prefix: string;

  constructor(
    name: string,
    role: string,
    provider: LLMProvider,
    prefix: string,
  ) {
    super({ name, role, systemPrompt: "", provider });
    this.prefix = prefix;
  }

  protected async execute(input: string, emitter: StreamEmitter): Promise<AgentResult> {
    const messages: ReadonlyArray<ChatMessage> = [
      { role: "system", content: "" },
      { role: "user", content: `${this.prefix}: ${input}` },
    ];
    const { output, usage } = await this.chatStream(messages, emitter);
    return { output, usage };
  }
}

class FailingStubAgent extends BaseAgent {
  constructor(name: string, provider: LLMProvider) {
    super({ name, role: "failer", systemPrompt: "", provider });
  }

  protected async execute(_input: string, _emitter: StreamEmitter): Promise<AgentResult> {
    throw new Error("stage failure");
  }
}

describe("Pipeline", () => {
  const usage1: TokenUsage = { inputTokens: 10, outputTokens: 5 };
  const usage2: TokenUsage = { inputTokens: 20, outputTokens: 15 };
  const usage3: TokenUsage = { inputTokens: 30, outputTokens: 25 };

  function createThreeStages() {
    const provider1 = createMockProvider(["research ", "output"], usage1);
    const provider2 = createMockProvider(["draft ", "output"], usage2);
    const provider3 = createMockProvider(["polished ", "output"], usage3);

    const stage1 = new StubAgent("researcher", "research expert", provider1, "research");
    const stage2 = new StubAgent("writer", "content writer", provider2, "draft");
    const stage3 = new StubAgent("editor", "editor", provider3, "polish");

    return [
      { name: "researcher", agent: stage1 },
      { name: "writer", agent: stage2 },
      { name: "editor", agent: stage3 },
    ] as const;
  }

  describe("sequential execution", () => {
    it("runs all stages in order", async () => {
      const stages = createThreeStages();
      const pipeline = new Pipeline(stages);
      const { emitter, events } = createEmitter();

      await pipeline.run("test topic", emitter);

      const agentStarts = events
        .filter((e) => e.type === "agent_start")
        .map((e) => (e as { type: "agent_start"; agent: string }).agent);
      expect(agentStarts).toEqual(["researcher", "writer", "editor"]);
    });

    it("returns the final stage output", async () => {
      const stages = createThreeStages();
      const pipeline = new Pipeline(stages);
      const { emitter } = createEmitter();

      const result = await pipeline.run("test topic", emitter);
      expect(result.output).toBe("polished output");
    });

    it("passes each stage output as input to the next", async () => {
      const provider1 = createMockProvider(["first result"], usage1);
      const provider2 = createMockProvider(["second result"], usage2);

      const stage1 = new StubAgent("stage-a", "first", provider1, "a");
      const stage2 = new StubAgent("stage-b", "second", provider2, "b");

      const pipeline = new Pipeline([
        { name: "stage-a", agent: stage1 },
        { name: "stage-b", agent: stage2 },
      ]);
      const { emitter } = createEmitter();

      await pipeline.run("initial input", emitter);

      // The second provider's chatStream should have been called with a user message
      // that includes the first stage's output
      const chatStreamFn = provider2.chatStream as ReturnType<typeof vi.fn>;
      const callArgs = chatStreamFn.mock.calls[0] as ReadonlyArray<ChatMessage>[];
      const userMessage = callArgs[0]?.find((m: ChatMessage) => m.role === "user");
      expect(userMessage?.content).toContain("first result");
    });
  });

  describe("handoff events", () => {
    it("emits handoff events between stages", async () => {
      const stages = createThreeStages();
      const pipeline = new Pipeline(stages);
      const { emitter, events } = createEmitter();

      await pipeline.run("test topic", emitter);

      const handoffs = events.filter((e) => e.type === "handoff");
      expect(handoffs).toHaveLength(2);
    });

    it("includes correct from/to in handoff events", async () => {
      const stages = createThreeStages();
      const pipeline = new Pipeline(stages);
      const { emitter, events } = createEmitter();

      await pipeline.run("test topic", emitter);

      const handoffs = events.filter((e) => e.type === "handoff");
      expect(handoffs[0]).toEqual({
        type: "handoff",
        from: "researcher",
        to: "writer",
        reason: "passing to next stage",
      });
      expect(handoffs[1]).toEqual({
        type: "handoff",
        from: "writer",
        to: "editor",
        reason: "passing to next stage",
      });
    });

    it("does not emit handoff after the last stage", async () => {
      const stages = createThreeStages();
      const pipeline = new Pipeline(stages);
      const { emitter, events } = createEmitter();

      await pipeline.run("test topic", emitter);

      const lastEvent = events[events.length - 1]!;
      expect(lastEvent.type).not.toBe("handoff");
    });
  });

  describe("token usage aggregation", () => {
    it("aggregates token usage from all stages", async () => {
      const stages = createThreeStages();
      const pipeline = new Pipeline(stages);
      const { emitter } = createEmitter();

      const result = await pipeline.run("test topic", emitter);

      expect(result.totalUsage).toEqual({
        inputTokens: 60,
        outputTokens: 45,
      });
    });
  });

  describe("error handling", () => {
    it("propagates errors from failing stages", async () => {
      const provider = createMockProvider([], usage1);
      const failingAgent = new FailingStubAgent("bad-stage", provider);
      const pipeline = new Pipeline([{ name: "bad-stage", agent: failingAgent }]);
      const { emitter } = createEmitter();

      await expect(pipeline.run("test", emitter)).rejects.toThrow("stage failure");
    });

    it("emits error event when a stage fails", async () => {
      const provider = createMockProvider([], usage1);
      const failingAgent = new FailingStubAgent("bad-stage", provider);
      const pipeline = new Pipeline([{ name: "bad-stage", agent: failingAgent }]);
      const { emitter, events } = createEmitter();

      await expect(pipeline.run("test", emitter)).rejects.toThrow();

      const errorEvents = events.filter((e) => e.type === "error");
      expect(errorEvents).toHaveLength(1);
    });
  });

  describe("event ordering", () => {
    it("emits events in correct sequence for multi-stage pipeline", async () => {
      const stages = createThreeStages();
      const pipeline = new Pipeline(stages);
      const { emitter, events } = createEmitter();

      await pipeline.run("test topic", emitter);

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toEqual([
        "agent_start", "chunk", "chunk", "agent_end",
        "handoff",
        "agent_start", "chunk", "chunk", "agent_end",
        "handoff",
        "agent_start", "chunk", "chunk", "agent_end",
      ]);
    });
  });
});
