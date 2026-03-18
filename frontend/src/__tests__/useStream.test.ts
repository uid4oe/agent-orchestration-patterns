import { describe, it, expect } from "vitest";
import { parseSSELines, reduceEvent } from "../hooks/useStream.ts";
import type { StreamEvent, StreamState } from "../types.ts";

function createEmptyState(): StreamState {
  return {
    messages: [],
    traceNodes: [],
    traceEdges: [],
    isStreaming: false,
    error: null,
    totalUsage: null,
  };
}

describe("parseSSELines", () => {
  it("parses a single SSE data line", () => {
    const raw = 'data: {"type":"agent_start","agent":"router","role":"classifier"}';
    const events = parseSSELines(raw);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: "agent_start",
      agent: "router",
      role: "classifier",
    });
  });

  it("parses multiple SSE lines", () => {
    const raw = [
      'data: {"type":"agent_start","agent":"router","role":"classifier"}',
      'data: {"type":"chunk","agent":"router","content":"Hello"}',
    ].join("\n");
    const events = parseSSELines(raw);
    expect(events).toHaveLength(2);
    expect(events[0]?.type).toBe("agent_start");
    expect(events[1]?.type).toBe("chunk");
  });

  it("skips empty lines", () => {
    const raw = [
      "",
      'data: {"type":"chunk","agent":"a","content":"x"}',
      "",
    ].join("\n");
    const events = parseSSELines(raw);
    expect(events).toHaveLength(1);
  });

  it("skips [DONE] sentinel", () => {
    const raw = "data: [DONE]";
    const events = parseSSELines(raw);
    expect(events).toHaveLength(0);
  });

  it("skips malformed JSON", () => {
    const raw = "data: {invalid json}";
    const events = parseSSELines(raw);
    expect(events).toHaveLength(0);
  });

  it("skips lines without data: prefix", () => {
    const raw = [
      "event: message",
      'data: {"type":"chunk","agent":"a","content":"x"}',
      ": comment line",
    ].join("\n");
    const events = parseSSELines(raw);
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("chunk");
  });
});

describe("reduceEvent", () => {
  describe("agent_start", () => {
    it("adds a new agent message and trace node", () => {
      const state = createEmptyState();
      const event: StreamEvent = {
        type: "agent_start",
        agent: "router",
        role: "classifier",
      };
      const next = reduceEvent(state, event);

      expect(next.messages).toHaveLength(1);
      const msg = next.messages[0];
      expect(msg).toBeDefined();
      if (msg && "agent" in msg) {
        expect(msg.agent).toBe("router");
        expect(msg.content).toBe("");
        expect(msg.isStreaming).toBe(true);
      }

      expect(next.traceNodes).toHaveLength(1);
      expect(next.traceNodes[0]).toEqual({
        agent: "router",
        role: "classifier",
        status: "running",
      });
    });
  });

  describe("chunk", () => {
    it("appends content to the streaming agent message", () => {
      let state = createEmptyState();
      state = reduceEvent(state, {
        type: "agent_start",
        agent: "router",
        role: "classifier",
      });
      state = reduceEvent(state, {
        type: "chunk",
        agent: "router",
        content: "Hello ",
      });
      state = reduceEvent(state, {
        type: "chunk",
        agent: "router",
        content: "world",
      });

      expect(state.messages).toHaveLength(1);
      const msg = state.messages[0];
      if (msg && "agent" in msg) {
        expect(msg.content).toBe("Hello world");
      }
    });

    it("does not affect other agent messages", () => {
      let state = createEmptyState();
      state = reduceEvent(state, {
        type: "agent_start",
        agent: "router",
        role: "classifier",
      });
      state = reduceEvent(state, {
        type: "chunk",
        agent: "other",
        content: "nope",
      });

      const msg = state.messages[0];
      if (msg && "agent" in msg) {
        expect(msg.content).toBe("");
      }
    });
  });

  describe("handoff", () => {
    it("adds a handoff message and trace edge", () => {
      const state = createEmptyState();
      const event: StreamEvent = {
        type: "handoff",
        from: "router",
        to: "billing",
        reason: "billing intent",
      };
      const next = reduceEvent(state, event);

      expect(next.messages).toHaveLength(1);
      const msg = next.messages[0];
      if (msg && "isHandoff" in msg) {
        expect(msg.from).toBe("router");
        expect(msg.to).toBe("billing");
        expect(msg.reason).toBe("billing intent");
      }

      expect(next.traceEdges).toHaveLength(1);
      expect(next.traceEdges[0]).toEqual({
        from: "router",
        to: "billing",
        reason: "billing intent",
      });
    });
  });

  describe("agent_end", () => {
    it("finalizes the agent message and trace node", () => {
      let state = createEmptyState();
      state = reduceEvent(state, {
        type: "agent_start",
        agent: "router",
        role: "classifier",
      });
      state = reduceEvent(state, {
        type: "chunk",
        agent: "router",
        content: "done",
      });
      state = reduceEvent(state, {
        type: "agent_end",
        agent: "router",
        durationMs: 300,
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const msg = state.messages[0];
      if (msg && "agent" in msg) {
        expect(msg.isStreaming).toBe(false);
        expect(msg.durationMs).toBe(300);
        expect(msg.usage).toEqual({ inputTokens: 100, outputTokens: 50 });
      }

      expect(state.traceNodes[0]).toEqual({
        agent: "router",
        role: "classifier",
        status: "done",
        durationMs: 300,
        usage: { inputTokens: 100, outputTokens: 50 },
      });
    });
  });

  describe("error", () => {
    it("sets error state and marks trace node as error", () => {
      let state = createEmptyState();
      state = reduceEvent(state, {
        type: "agent_start",
        agent: "router",
        role: "classifier",
      });
      state = reduceEvent(state, {
        type: "error",
        agent: "router",
        message: "Something went wrong",
      });

      expect(state.error).toBe("Something went wrong");
      expect(state.traceNodes[0]?.status).toBe("error");
    });
  });

  describe("done", () => {
    it("sets isStreaming to false and records total usage", () => {
      const state: StreamState = {
        ...createEmptyState(),
        isStreaming: true,
      };
      const next = reduceEvent(state, {
        type: "done",
        totalUsage: { inputTokens: 200, outputTokens: 100 },
      });

      expect(next.isStreaming).toBe(false);
      expect(next.totalUsage).toEqual({
        inputTokens: 200,
        outputTokens: 100,
      });
    });
  });

  describe("full event sequence", () => {
    it("processes a complete router pattern flow", () => {
      let state = createEmptyState();
      const events: StreamEvent[] = [
        { type: "agent_start", agent: "router", role: "classifier" },
        { type: "chunk", agent: "router", content: "Analyzing..." },
        {
          type: "agent_end",
          agent: "router",
          durationMs: 300,
          usage: { inputTokens: 150, outputTokens: 20 },
        },
        {
          type: "handoff",
          from: "router",
          to: "billing",
          reason: "billing intent",
        },
        { type: "agent_start", agent: "billing", role: "specialist" },
        { type: "chunk", agent: "billing", content: "I can help " },
        { type: "chunk", agent: "billing", content: "with billing." },
        {
          type: "agent_end",
          agent: "billing",
          durationMs: 800,
          usage: { inputTokens: 200, outputTokens: 150 },
        },
        {
          type: "done",
          totalUsage: { inputTokens: 350, outputTokens: 170 },
        },
      ];

      for (const event of events) {
        state = reduceEvent(state, event);
      }

      // 2 agent messages + 1 handoff message
      expect(state.messages).toHaveLength(3);
      expect(state.traceNodes).toHaveLength(2);
      expect(state.traceEdges).toHaveLength(1);
      expect(state.isStreaming).toBe(false);
      expect(state.totalUsage).toEqual({
        inputTokens: 350,
        outputTokens: 170,
      });

      // Verify accumulated content
      const billingMsg = state.messages[2];
      if (billingMsg && "agent" in billingMsg) {
        expect(billingMsg.content).toBe("I can help with billing.");
      }
    });
  });
});
