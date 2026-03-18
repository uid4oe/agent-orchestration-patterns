import { Router } from "express";
import type { PatternRunner } from "@agent-patterns/core";
import { SSEStreamEmitter } from "../stream.js";

export interface PatternEntry {
  name: string;
  description: string;
  runner: PatternRunner;
}

export type PatternMap = ReadonlyMap<string, PatternEntry>;

export function createPatternRoutes(patterns: PatternMap): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    const list = Array.from(patterns.values()).map((p) => ({
      name: p.name,
      description: p.description,
    }));
    res.json(list);
  });

  router.post("/:name/run", async (req, res) => {
    const pattern = patterns.get(req.params.name);
    if (!pattern) {
      res.status(404).json({ error: "Pattern not found" });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const input = body.input;
    if (typeof input !== "string" || input.trim().length === 0) {
      res.status(400).json({ error: "Input must be a non-empty string" });
      return;
    }

    const emitter = new SSEStreamEmitter(res);
    try {
      await pattern.runner.run(input, emitter);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      emitter.emit({ type: "error", agent: "system", message });
      emitter.emit({ type: "done", totalUsage: { inputTokens: 0, outputTokens: 0 } });
    }
  });

  return router;
}
