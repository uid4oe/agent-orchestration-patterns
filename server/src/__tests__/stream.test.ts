import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Response } from "express";
import type { StreamEvent } from "@agent-patterns/core";
import { SSEStreamEmitter } from "../stream.js";

function createMockResponse(): Response & {
  written: string[];
  ended: boolean;
  headers: Record<string, string>;
  closeHandler: (() => void) | null;
} {
  const mock = {
    written: [] as string[],
    ended: false,
    headers: {} as Record<string, string>,
    closeHandler: null as (() => void) | null,
    setHeader(name: string, value: string) {
      mock.headers[name] = value;
      return mock;
    },
    flushHeaders: vi.fn(),
    write(data: string) {
      mock.written.push(data);
      return true;
    },
    end() {
      mock.ended = true;
    },
    on(event: string, handler: () => void) {
      if (event === "close") {
        mock.closeHandler = handler;
      }
      return mock;
    },
  };
  return mock as unknown as Response & typeof mock;
}

describe("SSEStreamEmitter", () => {
  let res: ReturnType<typeof createMockResponse>;
  let emitter: SSEStreamEmitter;

  beforeEach(() => {
    res = createMockResponse();
    emitter = new SSEStreamEmitter(res);
  });

  it("sets SSE headers on construction", () => {
    expect(res.headers["Content-Type"]).toBe("text/event-stream");
    expect(res.headers["Cache-Control"]).toBe("no-cache");
    expect(res.headers["Connection"]).toBe("keep-alive");
    expect(res.flushHeaders).toHaveBeenCalled();
  });

  it("writes events in SSE data format", () => {
    const event: StreamEvent = {
      type: "chunk",
      agent: "test",
      content: "hello",
    };
    emitter.emit(event);

    expect(res.written).toHaveLength(1);
    expect(res.written[0]).toBe(`data: ${JSON.stringify(event)}\n\n`);
  });

  it("ends response on done event", () => {
    const done: StreamEvent = {
      type: "done",
      totalUsage: { inputTokens: 10, outputTokens: 5 },
    };
    emitter.emit(done);

    expect(res.written).toHaveLength(1);
    expect(res.ended).toBe(true);
  });

  it("does not end response on non-done events", () => {
    emitter.emit({ type: "chunk", agent: "test", content: "hi" });
    expect(res.ended).toBe(false);
  });

  it("no-ops after client disconnect", () => {
    // Simulate client disconnect
    res.closeHandler?.();

    emitter.emit({ type: "chunk", agent: "test", content: "should not write" });
    expect(res.written).toHaveLength(0);
  });

  it("streams multiple events in order", () => {
    const events: StreamEvent[] = [
      { type: "agent_start", agent: "a", role: "worker" },
      { type: "chunk", agent: "a", content: "hello" },
      { type: "agent_end", agent: "a", durationMs: 100, usage: { inputTokens: 5, outputTokens: 3 } },
      { type: "done", totalUsage: { inputTokens: 5, outputTokens: 3 } },
    ];

    for (const event of events) {
      emitter.emit(event);
    }

    expect(res.written).toHaveLength(4);
    for (let i = 0; i < events.length; i++) {
      expect(res.written[i]).toBe(`data: ${JSON.stringify(events[i])}\n\n`);
    }
  });
});
