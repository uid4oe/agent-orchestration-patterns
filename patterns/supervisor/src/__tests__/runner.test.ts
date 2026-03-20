import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StreamEmitter, StreamEvent, TokenUsage } from "@agent-patterns/core";
import type { LLMResponse } from "@agent-patterns/core";

// We test the runner indirectly by mocking the provider
// and verifying event sequences and retry behavior.

const DEFAULT_USAGE: TokenUsage = { inputTokens: 10, outputTokens: 5 };

function createEmitter(): { emitter: StreamEmitter; events: StreamEvent[] } {
  const events: StreamEvent[] = [];
  return {
    emitter: { emit: (event: StreamEvent) => events.push(event) },
    events,
  };
}

function makeResponse(content: string): LLMResponse {
  return {
    content,
    usage: DEFAULT_USAGE,
    model: "test-model",
    latencyMs: 100,
  };
}

// Mock the core module
vi.mock("@agent-patterns/core", async () => {
  const actual = await vi.importActual<typeof import("@agent-patterns/core")>("@agent-patterns/core");
  return {
    ...actual,
    createProvider: vi.fn(),
  };
});

describe("Supervisor Runner", () => {
  let chatMock: ReturnType<typeof vi.fn>;
  let chatStreamMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    chatMock = vi.fn();
    chatStreamMock = vi.fn();

    const { createProvider } = await import("@agent-patterns/core");
    const mockedCreateProvider = vi.mocked(createProvider);
    mockedCreateProvider.mockReturnValue({
      lastUsage: DEFAULT_USAGE,
      chat: chatMock,
      chatStream: chatStreamMock,
    } as unknown as ReturnType<typeof createProvider>);
  });

  async function importRunner() {
    // Re-import to pick up the mock
    const mod = await import("../index.js");
    return mod.createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
  }

  it("exports correct module shape", async () => {
    const mod = await import("../index.js");
    expect(mod.name).toBe("supervisor");
    expect(mod.description).toBe("Supervised research with quality review and retry");
    expect(typeof mod.createRunner).toBe("function");
    // Verify it accepts config
    const runner = mod.createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    expect(typeof runner.run).toBe("function");
  });

  it("emits done as the final event", async () => {
    // Plan response
    chatMock.mockResolvedValueOnce(
      makeResponse(JSON.stringify({
        subtasks: [{ worker: "search", instruction: "Find info" }],
      })),
    );

    // Worker streams
    chatStreamMock.mockImplementation(async function* () {
      yield "search results";
    });

    // Review response (adequate)
    chatMock.mockResolvedValueOnce(
      makeResponse(JSON.stringify({ adequate: true, feedback: "Good" })),
    );

    const runner = await importRunner();
    const { emitter, events } = createEmitter();

    await runner.run("Test query", emitter);

    const lastEvent = events[events.length - 1];
    expect(lastEvent?.type).toBe("done");
  });

  it("emits handoff events when dispatching to workers", async () => {
    chatMock.mockResolvedValueOnce(
      makeResponse(JSON.stringify({
        subtasks: [{ worker: "search", instruction: "Find info" }],
      })),
    );

    chatStreamMock.mockImplementation(async function* () {
      yield "results";
    });

    chatMock.mockResolvedValueOnce(
      makeResponse(JSON.stringify({ adequate: true, feedback: "Good" })),
    );

    const runner = await importRunner();
    const { emitter, events } = createEmitter();

    await runner.run("Test query", emitter);

    const handoffs = events.filter((e) => e.type === "handoff");
    // Should have at least: supervisor->search, search->supervisor (for review)
    expect(handoffs.length).toBeGreaterThanOrEqual(2);

    const firstHandoff = handoffs[0];
    if (firstHandoff?.type === "handoff") {
      expect(firstHandoff.from).toBe("supervisor");
      expect(firstHandoff.to).toBe("search");
    }
  });

  it("retries a worker when review is inadequate", async () => {
    // Plan
    chatMock.mockResolvedValueOnce(
      makeResponse(JSON.stringify({
        subtasks: [{ worker: "search", instruction: "Find info" }],
      })),
    );

    // Worker streams (called twice due to retry)
    chatStreamMock.mockImplementation(async function* () {
      yield "results";
    });

    // First review: inadequate
    chatMock.mockResolvedValueOnce(
      makeResponse(JSON.stringify({
        adequate: false,
        feedback: "Needs more detail",
      })),
    );

    // Second review: adequate
    chatMock.mockResolvedValueOnce(
      makeResponse(JSON.stringify({ adequate: true, feedback: "Good now" })),
    );

    const runner = await importRunner();
    const { emitter, events } = createEmitter();

    await runner.run("Test query", emitter);

    // Worker should have been called twice (chatStream called twice)
    expect(chatStreamMock).toHaveBeenCalledTimes(2);

    // Should see retry handoff
    const handoffs = events.filter((e) => e.type === "handoff");
    const retryHandoff = handoffs.find(
      (e) => e.type === "handoff" && e.reason.includes("Retry"),
    );
    expect(retryHandoff).toBeDefined();
  });

  it("enforces max 3 iterations per subtask", async () => {
    // Plan
    chatMock.mockResolvedValueOnce(
      makeResponse(JSON.stringify({
        subtasks: [{ worker: "search", instruction: "Find info" }],
      })),
    );

    chatStreamMock.mockImplementation(async function* () {
      yield "results";
    });

    // All reviews: inadequate
    chatMock.mockResolvedValue(
      makeResponse(JSON.stringify({
        adequate: false,
        feedback: "Still not good enough",
      })),
    );

    const runner = await importRunner();
    const { emitter, events } = createEmitter();

    await runner.run("Test query", emitter);

    // Worker should be called exactly 3 times (max iterations)
    expect(chatStreamMock).toHaveBeenCalledTimes(3);

    // Should still emit done
    const doneEvent = events.find((e) => e.type === "done");
    expect(doneEvent).toBeDefined();
  });

  it("accumulates token usage across all agents", async () => {
    chatMock.mockResolvedValueOnce(
      makeResponse(JSON.stringify({
        subtasks: [{ worker: "search", instruction: "Find info" }],
      })),
    );

    chatStreamMock.mockImplementation(async function* () {
      yield "results";
    });

    chatMock.mockResolvedValueOnce(
      makeResponse(JSON.stringify({ adequate: true, feedback: "Good" })),
    );

    const runner = await importRunner();
    const { emitter } = createEmitter();

    const result = await runner.run("Test query", emitter);

    // Plan (10+5) + worker (10+5) + review (10+5) = 30+15
    expect(result.totalUsage.inputTokens).toBeGreaterThan(0);
    expect(result.totalUsage.outputTokens).toBeGreaterThan(0);
  });

  it("handles errors gracefully and still emits done", async () => {
    chatMock.mockRejectedValueOnce(new Error("LLM error"));

    const runner = await importRunner();
    const { emitter, events } = createEmitter();

    const result = await runner.run("Test query", emitter);

    const errorEvent = events.find((e) => e.type === "error");
    expect(errorEvent).toBeDefined();

    const doneEvent = events.find((e) => e.type === "done");
    expect(doneEvent).toBeDefined();

    expect(result.output).toBe("");
  });

  it("passes previous worker output as context to subsequent workers", async () => {
    chatMock.mockResolvedValueOnce(
      makeResponse(JSON.stringify({
        subtasks: [
          { worker: "search", instruction: "Find info" },
          { worker: "analysis", instruction: "Analyze findings" },
        ],
      })),
    );

    chatStreamMock
      .mockImplementationOnce(async function* () {
        yield "search results about AI";
      })
      .mockImplementationOnce(async function* () {
        yield "analysis of findings";
      });

    // Reviews: both adequate
    chatMock
      .mockResolvedValueOnce(
        makeResponse(JSON.stringify({ adequate: true, feedback: "Good search" })),
      )
      .mockResolvedValueOnce(
        makeResponse(JSON.stringify({ adequate: true, feedback: "Good analysis" })),
      );

    const runner = await importRunner();
    const { emitter } = createEmitter();

    await runner.run("Test query", emitter);

    // The second chatStream call should include context from the first worker
    expect(chatStreamMock).toHaveBeenCalledTimes(2);
    const secondCall = chatStreamMock.mock.calls[1];
    const userMessage = secondCall?.[0]?.find(
      (m: { role: string; content: string }) => m.role === "user",
    );
    expect(userMessage?.content).toContain("search results about AI");
  });
});
