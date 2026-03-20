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

import { streamText } from "ai";
import { createRunner, name, description } from "../index.js";

const mockStreamText = vi.mocked(streamText);

function createEmitter(): { emitter: StreamEmitter; events: StreamEvent[] } {
  const events: StreamEvent[] = [];
  const emitter: StreamEmitter = {
    emit: (event: StreamEvent) => events.push(event),
  };
  return { emitter, events };
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

describe("Router pattern module exports", () => {
  it("exports the correct name", () => {
    expect(name).toBe("router");
  });

  it("exports a description", () => {
    expect(description).toBe("Intent-based routing to specialist agents");
  });

  it("createRunner returns a runner with a run method", () => {
    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    expect(typeof runner.run).toBe("function");
  });
});

describe("Router pattern runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emits correct event sequence for billing intent", async () => {
    const routerUsage: TokenUsage = { inputTokens: 100, outputTokens: 10 };
    const specialistUsage: TokenUsage = { inputTokens: 200, outputTokens: 150 };

    // First call: router classifies as BILLING
    mockStreamResponse("BILLING", routerUsage);
    // Second call: billing specialist responds
    mockStreamResponse("I can help with your invoice.", specialistUsage);

    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    const { emitter, events } = createEmitter();

    const result = await runner.run("My invoice is wrong", emitter);

    const eventTypes = events.map((e) => e.type);
    expect(eventTypes).toEqual([
      "agent_start",  // router starts
      "chunk",        // router classification chunks (B, I, L, L, I, N, G)
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "agent_end",    // router ends
      "handoff",      // handoff to billing
      "agent_start",  // billing specialist starts
      "chunk",        // specialist response chunks
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "chunk",
      "agent_end",    // billing specialist ends
      "done",         // done
    ]);

    // Verify handoff event details
    const handoff = events.find((e) => e.type === "handoff");
    expect(handoff).toEqual({
      type: "handoff",
      from: "router",
      to: "billing",
      reason: "billing intent detected",
    });

    // Verify done event has aggregated usage
    const done = events.find((e) => e.type === "done");
    expect(done).toEqual({
      type: "done",
      totalUsage: {
        inputTokens: 300,
        outputTokens: 160,
      },
    });

    // Verify return value
    expect(result.output).toBe("I can help with your invoice.");
    expect(result.totalUsage).toEqual({ inputTokens: 300, outputTokens: 160 });
  });

  it("routes to technical specialist for technical queries", async () => {
    const routerUsage: TokenUsage = { inputTokens: 100, outputTokens: 10 };
    const specialistUsage: TokenUsage = { inputTokens: 200, outputTokens: 100 };

    mockStreamResponse("TECHNICAL", routerUsage);
    mockStreamResponse("Let me help troubleshoot.", specialistUsage);

    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    const { emitter, events } = createEmitter();

    await runner.run("The app crashes on upload", emitter);

    const handoff = events.find((e) => e.type === "handoff");
    expect(handoff).toEqual({
      type: "handoff",
      from: "router",
      to: "technical",
      reason: "technical intent detected",
    });

    // Verify agent names
    const agentStarts = events.filter((e) => e.type === "agent_start");
    expect(agentStarts).toHaveLength(2);
    expect(agentStarts[0]).toMatchObject({ agent: "router" });
    expect(agentStarts[1]).toMatchObject({ agent: "technical" });
  });

  it("routes to general specialist for general queries", async () => {
    const routerUsage: TokenUsage = { inputTokens: 80, outputTokens: 8 };
    const specialistUsage: TokenUsage = { inputTokens: 150, outputTokens: 80 };

    mockStreamResponse("GENERAL", routerUsage);
    mockStreamResponse("Our hours are 9-5.", specialistUsage);

    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    const { emitter, events } = createEmitter();

    await runner.run("What are your business hours?", emitter);

    const handoff = events.find((e) => e.type === "handoff");
    expect(handoff).toEqual({
      type: "handoff",
      from: "router",
      to: "general",
      reason: "general intent detected",
    });
  });

  it("defaults to general specialist for unrecognized intent", async () => {
    const routerUsage: TokenUsage = { inputTokens: 80, outputTokens: 15 };
    const specialistUsage: TokenUsage = { inputTokens: 150, outputTokens: 80 };

    mockStreamResponse("I'm not sure about this one", routerUsage);
    mockStreamResponse("Let me help you.", specialistUsage);

    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    const { emitter, events } = createEmitter();

    await runner.run("Some ambiguous question", emitter);

    const handoff = events.find((e) => e.type === "handoff");
    expect(handoff).toMatchObject({
      to: "general",
      reason: "general intent detected",
    });
  });

  it("emits error and done when router agent fails", async () => {
    mockStreamText.mockReturnValueOnce({
      textStream: (async function* () {
        throw new Error("LLM unavailable");
      })(),
      usage: Promise.resolve({ inputTokens: 0, outputTokens: 0, totalTokens: 0 }),
    } as unknown as ReturnType<typeof streamText>);

    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    const { emitter, events } = createEmitter();

    const result = await runner.run("test input", emitter);

    const errorEvents = events.filter((e) => e.type === "error");
    expect(errorEvents.length).toBeGreaterThanOrEqual(1);

    const doneEvent = events[events.length - 1];
    expect(doneEvent).toMatchObject({ type: "done" });

    expect(result.output).toBe("");
  });

  it("always emits done as the last event", async () => {
    const routerUsage: TokenUsage = { inputTokens: 50, outputTokens: 5 };
    const specialistUsage: TokenUsage = { inputTokens: 100, outputTokens: 50 };

    mockStreamResponse("BILLING", routerUsage);
    mockStreamResponse("Here to help.", specialistUsage);

    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    const { emitter, events } = createEmitter();

    await runner.run("Invoice question", emitter);

    const lastEvent = events[events.length - 1];
    expect(lastEvent?.type).toBe("done");

    const doneEvents = events.filter((e) => e.type === "done");
    expect(doneEvents).toHaveLength(1);
  });
});
