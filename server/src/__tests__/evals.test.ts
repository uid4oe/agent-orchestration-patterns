import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { PatternRunner, StreamEmitter, TokenUsage } from "@agent-patterns/core";
import { createEvalRoutes } from "../routes/evals.js";
import type { PatternEntry, PatternMap } from "../routes/patterns.js";

vi.mock("@agent-patterns/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@agent-patterns/core")>();
  return {
    ...actual,
    loadDataset: vi.fn(),
    runEval: vi.fn(),
    createTrace: vi.fn().mockResolvedValue(null),
    logGeneration: vi.fn(),
    score: vi.fn(),
    createProvider: vi.fn(),
  };
});

import { loadDataset, runEval } from "@agent-patterns/core";

function createTestRunner(): PatternRunner {
  return {
    run: async (_input: string, emitter: StreamEmitter) => {
      emitter.emit({ type: "chunk", agent: "test", content: "response" });
      return { output: "response", totalUsage: { inputTokens: 10, outputTokens: 5 } };
    },
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
): Promise<{ status: number; body: string }> {
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
          resolve({ status: res.status, body: text });
          server.close();
        })
        .catch((err: unknown) => {
          server.close();
          reject(err);
        });
    });
  });
}

describe("Eval routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createApp(patterns?: PatternMap): express.Express {
    const app = express();
    app.use(express.json());
    app.use("/api/evals", createEvalRoutes(patterns ?? createTestPatterns()));
    return app;
  }

  describe("POST /api/evals/:name/run", () => {
    it("returns 404 for unknown pattern", async () => {
      const app = createApp();
      const res = await makeRequest(app, "post", "/api/evals/nonexistent/run", {});
      expect(res.status).toBe(404);
      expect(JSON.parse(res.body)).toEqual({ error: "Pattern not found" });
    });

    it("returns eval results on success", async () => {
      const mockResult = {
        results: [
          {
            input: "test",
            output: "response",
            scores: { relevance: { score: 0.8, reasoning: "Good" } },
          },
        ],
        averages: { relevance: 0.8 },
      };

      vi.mocked(loadDataset).mockResolvedValue({
        name: "test",
        items: [{ input: "test" }],
      });
      vi.mocked(runEval).mockResolvedValue(mockResult);

      const app = createApp();
      const res = await makeRequest(app, "post", "/api/evals/echo/run", {});
      expect(res.status).toBe(200);

      const body = JSON.parse(res.body) as typeof mockResult;
      expect(body.results).toHaveLength(1);
      expect(body.averages.relevance).toBe(0.8);
    });

    it("returns 500 when dataset loading fails", async () => {
      vi.mocked(loadDataset).mockRejectedValue(new Error("File not found"));

      const app = createApp();
      const res = await makeRequest(app, "post", "/api/evals/echo/run", {});
      expect(res.status).toBe(500);
      expect(JSON.parse(res.body)).toEqual({ error: "File not found" });
    });

    it("uses default criteria when none provided", async () => {
      vi.mocked(loadDataset).mockResolvedValue({
        name: "test",
        items: [{ input: "test" }],
      });
      vi.mocked(runEval).mockResolvedValue({ results: [], averages: {} });

      const app = createApp();
      await makeRequest(app, "post", "/api/evals/echo/run", {});

      expect(runEval).toHaveBeenCalledOnce();
      const callArgs = vi.mocked(runEval).mock.calls[0]![0];
      expect(callArgs.criteria).toEqual(["relevance"]);
    });

    it("uses custom criteria when provided", async () => {
      vi.mocked(loadDataset).mockResolvedValue({
        name: "test",
        items: [{ input: "test" }],
      });
      vi.mocked(runEval).mockResolvedValue({ results: [], averages: {} });

      const app = createApp();
      await makeRequest(app, "post", "/api/evals/echo/run", {
        criteria: ["accuracy", "completeness"],
      });

      expect(runEval).toHaveBeenCalledOnce();
      const callArgs = vi.mocked(runEval).mock.calls[0]![0];
      expect(callArgs.criteria).toEqual(["accuracy", "completeness"]);
    });
  });
});
