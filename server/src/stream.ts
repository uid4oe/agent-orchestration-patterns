import type { Response } from "express";
import type { StreamEmitter, StreamEvent } from "@agent-patterns/core";

const HEARTBEAT_INTERVAL_MS = 15_000;

export class SSEStreamEmitter implements StreamEmitter {
  private closed = false;
  private heartbeatTimer: ReturnType<typeof setInterval>;

  constructor(private readonly res: Response) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    this.heartbeatTimer = setInterval(() => {
      if (!this.closed) {
        this.res.write(":heartbeat\n\n");
      }
    }, HEARTBEAT_INTERVAL_MS);

    res.on("close", () => {
      this.closed = true;
      clearInterval(this.heartbeatTimer);
    });
  }

  emit(event: StreamEvent): void {
    if (this.closed) {
      return;
    }
    this.res.write(`data: ${JSON.stringify(event)}\n\n`);
    if (event.type === "done") {
      clearInterval(this.heartbeatTimer);
      this.res.end();
    }
  }
}
