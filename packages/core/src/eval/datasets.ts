import { readFile } from "node:fs/promises";
import type { TokenUsage, StreamEmitter, StreamEvent } from "../stream/types.js";
import type { ScorerResult } from "./scorer.js";
import { scoreLLMAsJudge } from "./scorer.js";
import type { LLMProvider } from "../llm/provider.js";

export interface DatasetItem {
  input: string;
  expectedOutput?: string;
  metadata?: Record<string, unknown>;
}

export interface Dataset {
  name: string;
  items: ReadonlyArray<DatasetItem>;
}

export interface EvalResultItem {
  input: string;
  output: string;
  scores: Record<string, ScorerResult>;
}

export interface EvalResult {
  results: ReadonlyArray<EvalResultItem>;
  averages: Record<string, number>;
}

export interface PatternRunner {
  run(input: string, emitter: StreamEmitter): Promise<{ output: string; totalUsage: TokenUsage }>;
}

export interface RunEvalParams {
  pattern: PatternRunner;
  dataset: Dataset;
  provider: LLMProvider;
  criteria: ReadonlyArray<string>;
}

export async function loadDataset(path: string): Promise<Dataset> {
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as Dataset;
}

/** Collects the final output from a pattern run by buffering chunk events. */
class CollectingEmitter implements StreamEmitter {
  private chunks: string[] = [];

  emit(event: StreamEvent): void {
    if (event.type === "chunk") {
      this.chunks.push(event.content);
    }
  }

  getOutput(): string {
    return this.chunks.join("");
  }
}

export async function runEval(params: RunEvalParams): Promise<EvalResult> {
  const { pattern, dataset, provider, criteria } = params;
  const results: EvalResultItem[] = [];

  for (const item of dataset.items) {
    const emitter = new CollectingEmitter();
    await pattern.run(item.input, emitter);
    const output = emitter.getOutput();

    const scores: Record<string, ScorerResult> = {};
    for (const criterion of criteria) {
      scores[criterion] = await scoreLLMAsJudge({
        provider,
        criteria: criterion,
        input: item.input,
        output,
      });
    }

    results.push({ input: item.input, output, scores });
  }

  const averages: Record<string, number> = {};
  for (const criterion of criteria) {
    const total = results.reduce((sum, r) => sum + r.scores[criterion]!.score, 0);
    averages[criterion] = results.length > 0 ? total / results.length : 0;
  }

  return { results, averages };
}
