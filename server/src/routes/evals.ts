import { Router } from "express";
import { createProvider, loadDataset, runEval } from "@agent-patterns/core";
import type { PatternMap } from "./patterns.js";

export function createEvalRoutes(patterns: PatternMap): Router {
  const router = Router();

  router.post("/:name/run", async (req, res) => {
    const pattern = patterns.get(req.params.name);
    if (!pattern) {
      res.status(404).json({ error: "Pattern not found" });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const datasetPath = typeof body.datasetPath === "string" ? body.datasetPath : "";
    if (datasetPath.trim().length === 0) {
      res.status(400).json({ error: "datasetPath must be a non-empty string" });
      return;
    }

    const criteria = Array.isArray(body.criteria) ? (body.criteria as string[]) : ["relevance"];

    try {
      const dataset = await loadDataset(datasetPath);
      const provider = createProvider(
        "openai",
        process.env["EVAL_MODEL"] ?? "gpt-4o-mini",
      );
      const result = await runEval({
        pattern: pattern.runner,
        dataset,
        provider,
        criteria,
      });
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: message });
    }
  });

  return router;
}
