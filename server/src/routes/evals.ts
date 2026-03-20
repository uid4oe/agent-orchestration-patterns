import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import {
  createProvider,
  resolveProviderFromEnv,
  loadDataset,
  runEval,
  createTrace,
  score as langfuseScore,
  logGeneration,
} from "@agent-patterns/core";
import type { EvalResult } from "@agent-patterns/core";
import type { PatternMap } from "./patterns.js";

/**
 * Resolves the dataset path for a pattern.
 * Convention: patterns/{name}/src/eval/dataset.json
 * The path is resolved relative to the project root (two levels up from server/src/).
 */
function resolveDatasetPath(patternName: string): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(currentDir, "..", "..", "..");
  return resolve(projectRoot, "patterns", patternName, "src", "eval", "dataset.json");
}

export function createEvalRoutes(patterns: PatternMap): Router {
  const router = Router();

  router.post("/:name/run", async (req, res) => {
    const patternName = req.params.name;
    const pattern = patterns.get(patternName);
    if (!pattern) {
      res.status(404).json({ error: "Pattern not found" });
      return;
    }

    const body = req.body as Record<string, unknown>;

    // Auto-resolve dataset path from pattern name, allow override
    const datasetPath =
      typeof body.datasetPath === "string" && body.datasetPath.trim().length > 0
        ? body.datasetPath
        : resolveDatasetPath(patternName);

    const criteria = Array.isArray(body.criteria) ? (body.criteria as string[]) : ["relevance"];

    const { providerName } = resolveProviderFromEnv();
    const evalModel = process.env["EVAL_MODEL"] ?? "gpt-4o-mini";

    try {
      const dataset = await loadDataset(datasetPath);
      const provider = createProvider(providerName, evalModel);

      const result = await runEval({
        pattern: pattern.runner,
        dataset,
        provider,
        criteria,
      });

      // Push results to Langfuse if configured
      await pushToLangfuse(patternName, evalModel, result, criteria);

      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: message });
    }
  });

  return router;
}

/**
 * Logs eval results to Langfuse when LANGFUSE_SECRET_KEY is set.
 * Creates one trace per eval run, with generations and scores for each item.
 */
async function pushToLangfuse(
  patternName: string,
  model: string,
  result: EvalResult,
  criteria: ReadonlyArray<string>,
): Promise<void> {
  const trace = await createTrace(`eval:${patternName}`);
  if (!trace) return;

  for (const item of result.results) {
    // Log each eval item as a generation
    logGeneration({
      trace,
      name: `eval-item`,
      model,
      input: [{ role: "user", content: item.input }],
      output: item.output,
      usage: { inputTokens: 0, outputTokens: 0 },
      latencyMs: 0,
    });

    // Log scores for each criterion
    for (const criterion of criteria) {
      const scorerResult = item.scores[criterion];
      if (scorerResult) {
        langfuseScore({
          trace,
          name: criterion,
          value: scorerResult.score,
          comment: scorerResult.reasoning,
        });
      }
    }
  }

  // Log aggregate averages as top-level scores
  for (const [criterion, avg] of Object.entries(result.averages)) {
    langfuseScore({
      trace,
      name: `avg:${criterion}`,
      value: avg,
      comment: `Average ${criterion} across ${result.results.length} items`,
    });
  }
}
