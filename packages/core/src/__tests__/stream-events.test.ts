import { describe, it, expect } from "vitest";
import type { StreamEvent, StreamEmitter, TokenUsage } from "../stream/types.js";

describe("StreamEvent types", () => {
  it("accepts valid agent_start event", () => {
    const event: StreamEvent = {
      type: "agent_start",
      agent: "router",
      role: "classifier",
    };
    expect(event.type).toBe("agent_start");
  });

  it("accepts valid chunk event", () => {
    const event: StreamEvent = {
      type: "chunk",
      agent: "router",
      content: "Hello",
    };
    expect(event.type).toBe("chunk");
  });

  it("accepts valid handoff event", () => {
    const event: StreamEvent = {
      type: "handoff",
      from: "router",
      to: "billing",
      reason: "billing intent detected",
    };
    expect(event.type).toBe("handoff");
  });

  it("accepts valid agent_end event", () => {
    const usage: TokenUsage = { inputTokens: 100, outputTokens: 50 };
    const event: StreamEvent = {
      type: "agent_end",
      agent: "router",
      durationMs: 500,
      usage,
    };
    expect(event.type).toBe("agent_end");
  });

  it("accepts valid error event", () => {
    const event: StreamEvent = {
      type: "error",
      agent: "router",
      message: "Something went wrong",
    };
    expect(event.type).toBe("error");
  });

  it("accepts valid done event", () => {
    const event: StreamEvent = {
      type: "done",
      totalUsage: { inputTokens: 200, outputTokens: 100 },
    };
    expect(event.type).toBe("done");
  });
});

describe("StreamEmitter", () => {
  it("collects events via emit", () => {
    const events: StreamEvent[] = [];
    const emitter: StreamEmitter = {
      emit: (event: StreamEvent) => events.push(event),
    };

    emitter.emit({ type: "agent_start", agent: "test", role: "worker" });
    emitter.emit({ type: "chunk", agent: "test", content: "hello" });
    emitter.emit({ type: "agent_end", agent: "test", durationMs: 100, usage: { inputTokens: 5, outputTokens: 3 } });
    emitter.emit({ type: "done", totalUsage: { inputTokens: 5, outputTokens: 3 } });

    expect(events).toHaveLength(4);
    expect(events.map((e) => e.type)).toEqual([
      "agent_start",
      "chunk",
      "agent_end",
      "done",
    ]);
  });

  it("maintains correct event ordering for multi-agent flow", () => {
    const events: StreamEvent[] = [];
    const emitter: StreamEmitter = {
      emit: (event: StreamEvent) => events.push(event),
    };

    // Simulate a router -> specialist flow
    emitter.emit({ type: "agent_start", agent: "router", role: "classifier" });
    emitter.emit({ type: "chunk", agent: "router", content: "Classifying..." });
    emitter.emit({ type: "agent_end", agent: "router", durationMs: 200, usage: { inputTokens: 50, outputTokens: 10 } });
    emitter.emit({ type: "handoff", from: "router", to: "billing", reason: "billing intent" });
    emitter.emit({ type: "agent_start", agent: "billing", role: "specialist" });
    emitter.emit({ type: "chunk", agent: "billing", content: "Here is your invoice..." });
    emitter.emit({ type: "agent_end", agent: "billing", durationMs: 400, usage: { inputTokens: 100, outputTokens: 80 } });
    emitter.emit({ type: "done", totalUsage: { inputTokens: 150, outputTokens: 90 } });

    const types = events.map((e) => e.type);
    expect(types).toEqual([
      "agent_start",
      "chunk",
      "agent_end",
      "handoff",
      "agent_start",
      "chunk",
      "agent_end",
      "done",
    ]);

    // Verify handoff fires between agent executions
    const handoffIndex = types.indexOf("handoff");
    expect(types[handoffIndex - 1]).toBe("agent_end");
    expect(types[handoffIndex + 1]).toBe("agent_start");
  });
});
