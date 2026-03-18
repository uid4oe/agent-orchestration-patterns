import type { Response } from "express";
import type { StreamEmitter, StreamEvent } from "@agent-patterns/core";

export class SSEStreamEmitter implements StreamEmitter {
  private closed = false;

  constructor(private readonly res: Response) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    res.on("close", () => {
      this.closed = true;
    });
  }

  emit(event: StreamEvent): void {
    if (this.closed) {
      return;
    }
    this.res.write(`data: ${JSON.stringify(event)}\n\n`);
    if (event.type === "done") {
      this.res.end();
    }
  }
}
