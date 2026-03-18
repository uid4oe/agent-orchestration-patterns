import { describe, it, expect, vi } from "vitest";
import type { StreamEmitter, StreamEvent, TokenUsage } from "@agent-patterns/core";
import type { LLMProvider } from "@agent-patterns/core";
import type { ChatMessage, LLMResponse } from "@agent-patterns/core";
import { SupervisorAgent } from "../supervisor-agent.js";

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
    chat: vi.fn<(messages: ReadonlyArray<ChatMessage>) => Promise<LLMResponse>>().mockResolvedValue(response),
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

function createSupervisor(provider: LLMProvider): SupervisorAgent {
  return new SupervisorAgent({
    name: "supervisor",
    role: "supervisor",
    systemPrompt: "",
    provider,
  });
}

describe("SupervisorAgent", () => {
  describe("plan()", () => {
    it("parses a valid plan from the LLM response", async () => {
      const planJson = JSON.stringify({
        subtasks: [
          { worker: "search", instruction: "Find info about AI" },
          { worker: "analysis", instruction: "Analyze the findings" },
          { worker: "summary", instruction: "Summarize the report" },
        ],
      });
      const provider = createMockProvider(planJson);
      const supervisor = createSupervisor(provider);
      const { emitter } = createEmitter();

      const result = await supervisor.plan("Research AI", emitter);

      expect(result.plan.subtasks).toHaveLength(3);
      expect(result.plan.subtasks[0]?.worker).toBe("search");
      expect(result.plan.subtasks[1]?.worker).toBe("analysis");
      expect(result.plan.subtasks[2]?.worker).toBe("summary");
    });

    it("handles JSON wrapped in markdown code fences", async () => {
      const planJson = "```json\n" + JSON.stringify({
        subtasks: [{ worker: "search", instruction: "Find data" }],
      }) + "\n```";
      const provider = createMockProvider(planJson);
      const supervisor = createSupervisor(provider);
      const { emitter } = createEmitter();

      const result = await supervisor.plan("Research topic", emitter);

      expect(result.plan.subtasks).toHaveLength(1);
      expect(result.plan.subtasks[0]?.worker).toBe("search");
    });

    it("emits agent_start with planner role and agent_end", async () => {
      const planJson = JSON.stringify({
        subtasks: [{ worker: "search", instruction: "Find info" }],
      });
      const provider = createMockProvider(planJson);
      const supervisor = createSupervisor(provider);
      const { emitter, events } = createEmitter();

      await supervisor.plan("Research topic", emitter);

      expect(events[0]).toMatchObject({
        type: "agent_start",
        agent: "supervisor",
        role: "planner",
      });
      const endEvent = events.find((e) => e.type === "agent_end");
      expect(endEvent).toMatchObject({
        type: "agent_end",
        agent: "supervisor",
        usage: DEFAULT_USAGE,
      });
    });

    it("emits a chunk describing the plan", async () => {
      const planJson = JSON.stringify({
        subtasks: [
          { worker: "search", instruction: "Find info" },
          { worker: "analysis", instruction: "Analyze" },
        ],
      });
      const provider = createMockProvider(planJson);
      const supervisor = createSupervisor(provider);
      const { emitter, events } = createEmitter();

      await supervisor.plan("Research topic", emitter);

      const chunkEvent = events.find((e) => e.type === "chunk");
      expect(chunkEvent).toMatchObject({
        type: "chunk",
        agent: "supervisor",
        content: expect.stringContaining("search") as string,
      });
    });

    it("throws on invalid plan format", async () => {
      const provider = createMockProvider("not json");
      const supervisor = createSupervisor(provider);
      const { emitter, events } = createEmitter();

      await expect(supervisor.plan("Research topic", emitter)).rejects.toThrow();

      const errorEvent = events.find((e) => e.type === "error");
      expect(errorEvent).toBeDefined();
    });

    it("rejects plans with invalid worker names", async () => {
      const planJson = JSON.stringify({
        subtasks: [{ worker: "invalid-worker", instruction: "Do something" }],
      });
      const provider = createMockProvider(planJson);
      const supervisor = createSupervisor(provider);
      const { emitter } = createEmitter();

      await expect(supervisor.plan("Research topic", emitter)).rejects.toThrow(
        "Invalid plan format",
      );
    });

    it("returns usage from the provider", async () => {
      const planJson = JSON.stringify({
        subtasks: [{ worker: "search", instruction: "Find info" }],
      });
      const provider = createMockProvider(planJson);
      const supervisor = createSupervisor(provider);
      const { emitter } = createEmitter();

      const result = await supervisor.plan("Research topic", emitter);

      expect(result.usage).toEqual(DEFAULT_USAGE);
    });
  });

  describe("review()", () => {
    it("parses an adequate review", async () => {
      const reviewJson = JSON.stringify({
        adequate: true,
        feedback: "Good coverage of the topic",
      });
      const provider = createMockProvider(reviewJson);
      const supervisor = createSupervisor(provider);
      const { emitter } = createEmitter();

      const result = await supervisor.review(
        "search",
        "Find info about AI",
        "Here is the info about AI...",
        emitter,
      );

      expect(result.result.adequate).toBe(true);
      expect(result.result.feedback).toBe("Good coverage of the topic");
    });

    it("parses an inadequate review", async () => {
      const reviewJson = JSON.stringify({
        adequate: false,
        feedback: "Missing key details about recent breakthroughs",
      });
      const provider = createMockProvider(reviewJson);
      const supervisor = createSupervisor(provider);
      const { emitter } = createEmitter();

      const result = await supervisor.review(
        "search",
        "Find info about AI",
        "Brief info...",
        emitter,
      );

      expect(result.result.adequate).toBe(false);
      expect(result.result.feedback).toContain("Missing key details");
    });

    it("emits agent_start with reviewer role and agent_end", async () => {
      const reviewJson = JSON.stringify({
        adequate: true,
        feedback: "Looks good",
      });
      const provider = createMockProvider(reviewJson);
      const supervisor = createSupervisor(provider);
      const { emitter, events } = createEmitter();

      await supervisor.review("search", "instruction", "output", emitter);

      expect(events[0]).toMatchObject({
        type: "agent_start",
        agent: "supervisor",
        role: "reviewer",
      });
      const endEvent = events.find((e) => e.type === "agent_end");
      expect(endEvent).toMatchObject({
        type: "agent_end",
        agent: "supervisor",
      });
    });

    it("throws on invalid review format", async () => {
      const provider = createMockProvider("invalid json");
      const supervisor = createSupervisor(provider);
      const { emitter } = createEmitter();

      await expect(
        supervisor.review("search", "instruction", "output", emitter),
      ).rejects.toThrow();
    });
  });
});
