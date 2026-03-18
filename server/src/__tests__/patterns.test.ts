import { describe, it, expect, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { PatternRunner, StreamEmitter, TokenUsage } from "@agent-patterns/core";
import { createPatternRoutes } from "../routes/patterns.js";
import type { PatternEntry, PatternMap } from "../routes/patterns.js";

function createTestRunner(
  handler?: (input: string, emitter: StreamEmitter) => Promise<{ output: string; totalUsage: TokenUsage }>,
): PatternRunner {
  return {
    run: handler ?? (async (_input: string, emitter: StreamEmitter) => {
      emitter.emit({ type: "agent_start", agent: "test", role: "worker" });
      emitter.emit({ type: "chunk", agent: "test", content: "response" });
      emitter.emit({ type: "agent_end", agent: "test", durationMs: 50, usage: { inputTokens: 10, outputTokens: 5 } });
      emitter.emit({ type: "done", totalUsage: { inputTokens: 10, outputTokens: 5 } });
      return { output: "response", totalUsage: { inputTokens: 10, outputTokens: 5 } };
    }),
  };
}

function createTestPatterns(): PatternMap {
  return new Map<string, PatternEntry>([
    ["echo", { name: "echo", description: "Echo pattern", runner: createTestRunner() }],
  ]);
}

async function makeRequest(
  app: express.Express,
  method: "get" | "post",
  path: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  return new Promise((resolve, reject) => {
    let server: Server;

    server = app.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("Failed to get server address"));
        return;
      }
      const url = `http://127.0.0.1:${addr.port}${path}`;
      const options: RequestInit = {
        method: method.toUpperCase(),
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      };

      fetch(url, options)
        .then(async (res) => {
          const text = await res.text();
          const headers: Record<string, string> = {};
          res.headers.forEach((value, key) => {
            headers[key] = value;
          });
          resolve({ status: res.status, headers, body: text });
          server.close();
        })
        .catch((err: unknown) => {
          server.close();
          reject(err);
        });
    });
  });
}

describe("Pattern routes", () => {
  function createApp(patterns?: PatternMap): express.Express {
    const app = express();
    app.use(express.json());
    app.use("/api/patterns", createPatternRoutes(patterns ?? createTestPatterns()));
    return app;
  }

  describe("GET /api/patterns", () => {
    it("returns empty list when no patterns registered", async () => {
      const app = createApp(new Map());
      const res = await makeRequest(app, "get", "/api/patterns");
      expect(res.status).toBe(200);
      expect(JSON.parse(res.body)).toEqual([]);
    });

    it("returns pattern names and descriptions", async () => {
      const app = createApp();
      const res = await makeRequest(app, "get", "/api/patterns");
      expect(res.status).toBe(200);
      const data = JSON.parse(res.body) as Array<{ name: string; description: string }>;
      expect(data).toHaveLength(1);
      expect(data[0]).toEqual({ name: "echo", description: "Echo pattern" });
    });
  });

  describe("POST /api/patterns/:name/run", () => {
    it("returns 404 for unknown pattern", async () => {
      const app = createApp();
      const res = await makeRequest(app, "post", "/api/patterns/nonexistent/run", { input: "test" });
      expect(res.status).toBe(404);
      expect(JSON.parse(res.body)).toEqual({ error: "Pattern not found" });
    });

    it("returns 400 when input is missing", async () => {
      const app = createApp();
      const res = await makeRequest(app, "post", "/api/patterns/echo/run", {});
      expect(res.status).toBe(400);
      expect(JSON.parse(res.body)).toEqual({ error: "Input must be a non-empty string" });
    });

    it("returns 400 when input is empty string", async () => {
      const app = createApp();
      const res = await makeRequest(app, "post", "/api/patterns/echo/run", { input: "  " });
      expect(res.status).toBe(400);
      expect(JSON.parse(res.body)).toEqual({ error: "Input must be a non-empty string" });
    });

    it("returns 400 when input is not a string", async () => {
      const app = createApp();
      const res = await makeRequest(app, "post", "/api/patterns/echo/run", { input: 123 });
      expect(res.status).toBe(400);
      expect(JSON.parse(res.body)).toEqual({ error: "Input must be a non-empty string" });
    });

    it("streams SSE events for valid input", async () => {
      const app = createApp();
      const res = await makeRequest(app, "post", "/api/patterns/echo/run", { input: "hello" });
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("text/event-stream");

      const lines = res.body.split("\n\n").filter((l) => l.startsWith("data: "));
      expect(lines.length).toBeGreaterThanOrEqual(4);

      const events = lines.map((l) => JSON.parse(l.replace("data: ", "")) as { type: string });
      const types = events.map((e) => e.type);
      expect(types).toContain("agent_start");
      expect(types).toContain("chunk");
      expect(types).toContain("agent_end");
      expect(types).toContain("done");
    });

    it("emits error and done events when runner throws", async () => {
      const failRunner = createTestRunner(async () => {
        throw new Error("runner failed");
      });
      const patterns = new Map<string, PatternEntry>([
        ["fail", { name: "fail", description: "Failing pattern", runner: failRunner }],
      ]);
      const app = createApp(patterns);
      const res = await makeRequest(app, "post", "/api/patterns/fail/run", { input: "hello" });
      expect(res.status).toBe(200);

      const lines = res.body.split("\n\n").filter((l) => l.startsWith("data: "));
      const events = lines.map((l) => JSON.parse(l.replace("data: ", "")) as { type: string; message?: string });
      const types = events.map((e) => e.type);
      expect(types).toContain("error");
      expect(types).toContain("done");

      const errorEvent = events.find((e) => e.type === "error");
      expect(errorEvent?.message).toBe("runner failed");
    });
  });
});
