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

describe("Swarm pattern module exports", () => {
  it("exports the correct name", () => {
    expect(name).toBe("swarm");
  });

  it("exports a description", () => {
    expect(description).toBe("Dynamic agent-to-agent handoffs without central routing");
  });

  it("createRunner returns a runner with a run method", () => {
    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    expect(typeof runner.run).toBe("function");
  });
});

describe("Swarm pattern runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles direct response from triage without handoff", async () => {
    const triageUsage: TokenUsage = { inputTokens: 100, outputTokens: 50 };
    mockStreamResponse("Hello! How can I help you today?", triageUsage);

    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    const { emitter, events } = createEmitter();

    const result = await runner.run("Hi, I need some help", emitter);

    // Should have: agent_start, chunks, agent_end, done
    const eventTypes = events.map((e) => e.type);
    expect(eventTypes[0]).toBe("agent_start");
    expect(eventTypes).toContain("chunk");
    expect(eventTypes).toContain("agent_end");
    expect(eventTypes[eventTypes.length - 1]).toBe("done");

    // No handoff events
    const handoffs = events.filter((e) => e.type === "handoff");
    expect(handoffs).toHaveLength(0);

    // Verify the triage agent started
    const agentStart = events.find((e) => e.type === "agent_start");
    expect(agentStart).toMatchObject({ agent: "triage", role: "triage" });

    expect(result.output).toBe("Hello! How can I help you today?");
    expect(result.totalUsage).toEqual(triageUsage);
  });

  it("handles single handoff from triage to billing", async () => {
    const triageUsage: TokenUsage = { inputTokens: 100, outputTokens: 30 };
    const billingUsage: TokenUsage = { inputTokens: 200, outputTokens: 150 };

    // Triage classifies and hands off
    mockStreamResponse(
      "I'll connect you with our billing team. [HANDOFF:billing]",
      triageUsage,
    );
    // Billing responds
    mockStreamResponse(
      "I can help with your invoice. Let me look into it.",
      billingUsage,
    );

    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    const { emitter, events } = createEmitter();

    const result = await runner.run("I was charged twice", emitter);

    // Verify handoff event
    const handoffs = events.filter((e) => e.type === "handoff");
    expect(handoffs).toHaveLength(1);
    expect(handoffs[0]).toMatchObject({
      type: "handoff",
      from: "triage",
      to: "billing",
    });

    // Verify agent starts: triage then billing
    const agentStarts = events.filter((e) => e.type === "agent_start");
    expect(agentStarts).toHaveLength(2);
    expect(agentStarts[0]).toMatchObject({ agent: "triage" });
    expect(agentStarts[1]).toMatchObject({ agent: "billing" });

    // Verify done is last
    expect(events[events.length - 1]).toMatchObject({ type: "done" });

    expect(result.output).toBe("I can help with your invoice. Let me look into it.");
    expect(result.totalUsage).toEqual({
      inputTokens: 300,
      outputTokens: 180,
    });
  });

  it("handles chain handoff: triage -> sales -> billing", async () => {
    const triageUsage: TokenUsage = { inputTokens: 80, outputTokens: 20 };
    const salesUsage: TokenUsage = { inputTokens: 120, outputTokens: 40 };
    const billingUsage: TokenUsage = { inputTokens: 200, outputTokens: 100 };

    // Triage -> sales
    mockStreamResponse(
      "Let me connect you with sales. [HANDOFF:sales]",
      triageUsage,
    );
    // Sales -> billing
    mockStreamResponse(
      "This is a billing matter. [HANDOFF:billing]",
      salesUsage,
    );
    // Billing responds
    mockStreamResponse(
      "I'll process your refund right away.",
      billingUsage,
    );

    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    const { emitter, events } = createEmitter();

    const result = await runner.run("I want a refund for the upgrade", emitter);

    // Verify two handoff events
    const handoffs = events.filter((e) => e.type === "handoff");
    expect(handoffs).toHaveLength(2);
    expect(handoffs[0]).toMatchObject({ from: "triage", to: "sales" });
    expect(handoffs[1]).toMatchObject({ from: "sales", to: "billing" });

    // Verify three agent runs
    const agentStarts = events.filter((e) => e.type === "agent_start");
    expect(agentStarts).toHaveLength(3);
    expect(agentStarts[0]).toMatchObject({ agent: "triage" });
    expect(agentStarts[1]).toMatchObject({ agent: "sales" });
    expect(agentStarts[2]).toMatchObject({ agent: "billing" });

    expect(result.output).toBe("I'll process your refund right away.");
    expect(result.totalUsage).toEqual({
      inputTokens: 400,
      outputTokens: 160,
    });
  });

  it("stops at max handoff limit when agents always hand off", async () => {
    const usage: TokenUsage = { inputTokens: 50, outputTokens: 20 };

    // 5 consecutive handoffs (the max)
    mockStreamResponse("Going to sales. [HANDOFF:sales]", usage);
    mockStreamResponse("Going to support. [HANDOFF:support]", usage);
    mockStreamResponse("Going to billing. [HANDOFF:billing]", usage);
    mockStreamResponse("Going to sales. [HANDOFF:sales]", usage);
    mockStreamResponse("Going to support. [HANDOFF:support]", usage);

    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    const { emitter, events } = createEmitter();

    const result = await runner.run("confusing request", emitter);

    // Should have 5 handoff events (iterations 0-4, all hand off)
    const handoffs = events.filter((e) => e.type === "handoff");
    expect(handoffs).toHaveLength(5);

    // Done event should be emitted
    expect(events[events.length - 1]).toMatchObject({ type: "done" });

    // Usage should be aggregated across all 5 agent runs
    expect(result.totalUsage).toEqual({
      inputTokens: 250,
      outputTokens: 100,
    });
  });

  it("emits error and done when LLM fails", async () => {
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

  it("aggregates usage across all agents in handoff chain", async () => {
    const triageUsage: TokenUsage = { inputTokens: 10, outputTokens: 5 };
    const supportUsage: TokenUsage = { inputTokens: 20, outputTokens: 15 };

    mockStreamResponse("Tech issue. [HANDOFF:support]", triageUsage);
    mockStreamResponse("Try restarting the app.", supportUsage);

    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    const { emitter, events } = createEmitter();

    const result = await runner.run("App crashes on export", emitter);

    // Verify done event has aggregated usage
    const done = events.find((e) => e.type === "done");
    expect(done).toEqual({
      type: "done",
      totalUsage: {
        inputTokens: 30,
        outputTokens: 20,
      },
    });

    expect(result.totalUsage).toEqual({ inputTokens: 30, outputTokens: 20 });
  });

  it("always emits done as the last event", async () => {
    const usage: TokenUsage = { inputTokens: 50, outputTokens: 25 };
    mockStreamResponse("Here to help!", usage);

    const runner = createRunner({ providerName: "openai", modelName: "gpt-4o-mini" });
    const { emitter, events } = createEmitter();

    await runner.run("Hello", emitter);

    const lastEvent = events[events.length - 1];
    expect(lastEvent?.type).toBe("done");

    const doneEvents = events.filter((e) => e.type === "done");
    expect(doneEvents).toHaveLength(1);
  });
});
