import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StreamEmitter, StreamEvent, TokenUsage } from "@agent-patterns/core";

// Mock the AI SDK providers before importing anything that uses them
vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn().mockReturnValue("mock-model"),
}));

vi.mock("ai", () => ({
  streamText: vi.fn(),
  generateText: vi.fn(),
}));

import { generateText, streamText } from "ai";
import { createRunner, name, description } from "../index.js";

const mockGenerateText = vi.mocked(generateText);
const mockStreamText = vi.mocked(streamText);

function createEmitter(): { emitter: StreamEmitter; events: StreamEvent[] } {
  const events: StreamEvent[] = [];
  const emitter: StreamEmitter = {
    emit: (event: StreamEvent) => events.push(event),
  };
  return { emitter, events };
}

function mockSplitterResponse(subtasks: ReadonlyArray<string>, usage: TokenUsage): void {
  mockGenerateText.mockResolvedValueOnce({
    text: JSON.stringify({ subtasks }),
    usage: {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.inputTokens + usage.outputTokens,
    },
    response: { modelId: "test" },
  } as unknown as Awaited<ReturnType<typeof generateText>>);
}

function mockStreamResponse(text: string, usage: TokenUsage): void {
  const chunks = text.split("");
  mockStreamText.mockReturnValueOnce({
    textStream: (async function* () {
      for (const ch of chunks) {
        yield ch;
      }
    })(),
    usage: Promise.resolve({
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.inputTokens + usage.outputTokens,
    }),
  } as unknown as ReturnType<typeof streamText>);
}

describe("Map-Reduce pattern module exports", () => {
  it("exports the correct name", () => {
    expect(name).toBe("map-reduce");
  });

  it("exports a description", () => {
    expect(description).toBe("Parallel fan-out to mappers with merged reduction");
  });

  it("createRunner returns a runner with a run method", () => {
    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    expect(typeof runner.run).toBe("function");
  });
});

describe("Map-Reduce pattern runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs full flow: splitter -> 3 mappers -> reducer", async () => {
    const splitterUsage: TokenUsage = { inputTokens: 50, outputTokens: 30 };
    const mapperUsage: TokenUsage = { inputTokens: 100, outputTokens: 80 };
    const reducerUsage: TokenUsage = { inputTokens: 200, outputTokens: 150 };

    mockSplitterResponse(["Analyze X", "Analyze Y", "Analyze Z"], splitterUsage);
    mockStreamResponse("Analysis of X", mapperUsage);
    mockStreamResponse("Analysis of Y", mapperUsage);
    mockStreamResponse("Analysis of Z", mapperUsage);
    mockStreamResponse("Synthesized result", reducerUsage);

    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    const { emitter, events } = createEmitter();

    const result = await runner.run("Analyze topic from three angles", emitter);

    // Verify splitter events
    const agentStarts = events.filter((e) => e.type === "agent_start");
    expect(agentStarts[0]).toMatchObject({ agent: "splitter", role: "splitter" });

    // Verify mapper agent starts (may be interleaved)
    const mapperStarts = agentStarts.filter(
      (e) => e.type === "agent_start" && (e.agent.startsWith("mapper-")),
    );
    expect(mapperStarts).toHaveLength(3);

    // Verify reducer
    const reducerStart = agentStarts.find(
      (e) => e.type === "agent_start" && e.agent === "reducer",
    );
    expect(reducerStart).toMatchObject({ agent: "reducer", role: "reducer" });

    // Verify done is last event
    const lastEvent = events[events.length - 1];
    expect(lastEvent?.type).toBe("done");

    // Verify output is the reducer output
    expect(result.output).toBe("Synthesized result");
  });

  it("emits fan-out handoffs from splitter to each mapper", async () => {
    const usage: TokenUsage = { inputTokens: 10, outputTokens: 5 };

    mockSplitterResponse(["Task A", "Task B", "Task C"], usage);
    mockStreamResponse("Result A", usage);
    mockStreamResponse("Result B", usage);
    mockStreamResponse("Result C", usage);
    mockStreamResponse("Final", usage);

    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    const { emitter, events } = createEmitter();

    await runner.run("Test input", emitter);

    const handoffs = events.filter(
      (e): e is Extract<StreamEvent, { type: "handoff" }> => e.type === "handoff",
    );

    // Fan-out: splitter -> mapper-1, splitter -> mapper-2, splitter -> mapper-3
    const fanOutHandoffs = handoffs.filter((h) => h.from === "splitter");
    expect(fanOutHandoffs).toHaveLength(3);
    expect(fanOutHandoffs[0]).toMatchObject({
      from: "splitter",
      to: "mapper-1",
      reason: "subtask 1 of 3",
    });
    expect(fanOutHandoffs[1]).toMatchObject({
      from: "splitter",
      to: "mapper-2",
      reason: "subtask 2 of 3",
    });
    expect(fanOutHandoffs[2]).toMatchObject({
      from: "splitter",
      to: "mapper-3",
      reason: "subtask 3 of 3",
    });
  });

  it("emits fan-in handoff from mappers to reducer", async () => {
    const usage: TokenUsage = { inputTokens: 10, outputTokens: 5 };

    mockSplitterResponse(["Task A", "Task B"], usage);
    mockStreamResponse("Result A", usage);
    mockStreamResponse("Result B", usage);
    mockStreamResponse("Final", usage);

    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    const { emitter, events } = createEmitter();

    await runner.run("Test input", emitter);

    const handoffs = events.filter(
      (e): e is Extract<StreamEvent, { type: "handoff" }> => e.type === "handoff",
    );

    // Fan-in: mappers -> reducer
    const fanInHandoff = handoffs.find((h) => h.to === "reducer");
    expect(fanInHandoff).toMatchObject({
      from: "mappers",
      to: "reducer",
      reason: "2 analyses complete",
    });
  });

  it("aggregates usage across all phases", async () => {
    const splitterUsage: TokenUsage = { inputTokens: 50, outputTokens: 30 };
    const mapperUsage: TokenUsage = { inputTokens: 100, outputTokens: 80 };
    const reducerUsage: TokenUsage = { inputTokens: 200, outputTokens: 150 };

    mockSplitterResponse(["Task A", "Task B"], splitterUsage);
    mockStreamResponse("Result A", mapperUsage);
    mockStreamResponse("Result B", mapperUsage);
    mockStreamResponse("Final", reducerUsage);

    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    const { emitter } = createEmitter();

    const result = await runner.run("Test input", emitter);

    // splitter(50+30) + mapper1(100+80) + mapper2(100+80) + reducer(200+150)
    expect(result.totalUsage).toEqual({
      inputTokens: 450,
      outputTokens: 340,
    });
  });

  it("emits error and done when splitter fails", async () => {
    mockGenerateText.mockRejectedValueOnce(new Error("LLM unavailable"));

    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    const { emitter, events } = createEmitter();

    const result = await runner.run("Test input", emitter);

    const errorEvents = events.filter((e) => e.type === "error");
    expect(errorEvents.length).toBeGreaterThanOrEqual(1);

    const doneEvent = events[events.length - 1];
    expect(doneEvent).toMatchObject({ type: "done" });

    expect(result.output).toBe("");
  });

  it("runs only one mapper for a single subtask", async () => {
    const usage: TokenUsage = { inputTokens: 10, outputTokens: 5 };

    mockSplitterResponse(["Only one task"], usage);
    mockStreamResponse("Single result", usage);
    mockStreamResponse("Final synthesis", usage);

    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    const { emitter, events } = createEmitter();

    await runner.run("Simple topic", emitter);

    // Only one fan-out handoff
    const fanOutHandoffs = events.filter(
      (e): e is Extract<StreamEvent, { type: "handoff" }> =>
        e.type === "handoff" && e.from === "splitter",
    );
    expect(fanOutHandoffs).toHaveLength(1);
    expect(fanOutHandoffs[0]).toMatchObject({
      from: "splitter",
      to: "mapper-1",
    });

    // Only one mapper agent_start
    const mapperStarts = events.filter(
      (e) => e.type === "agent_start" && e.agent.startsWith("mapper-"),
    );
    expect(mapperStarts).toHaveLength(1);

    // Fan-in says "1 analyses complete"
    const fanInHandoff = events.find(
      (e): e is Extract<StreamEvent, { type: "handoff" }> =>
        e.type === "handoff" && e.to === "reducer",
    );
    expect(fanInHandoff).toMatchObject({
      reason: "1 analyses complete",
    });
  });

  it("always emits done as the last event", async () => {
    const usage: TokenUsage = { inputTokens: 10, outputTokens: 5 };

    mockSplitterResponse(["Task A"], usage);
    mockStreamResponse("Result", usage);
    mockStreamResponse("Final", usage);

    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    const { emitter, events } = createEmitter();

    await runner.run("Test input", emitter);

    const lastEvent = events[events.length - 1];
    expect(lastEvent?.type).toBe("done");

    const doneEvents = events.filter((e) => e.type === "done");
    expect(doneEvents).toHaveLength(1);
  });
});
