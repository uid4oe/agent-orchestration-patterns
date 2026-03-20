import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDataset, runEval } from "../eval/datasets.js";
import type { RunEvalParams, PatternRunner, Dataset } from "../eval/datasets.js";
import type { StreamEmitter } from "../stream/types.js";
import type { LLMProvider } from "../llm/provider.js";
import type { LLMResponse } from "../llm/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = resolve(__dirname, "fixtures");

describe("loadDataset", () => {
  it("loads and parses a valid dataset file", async () => {
    const dataset = await loadDataset(resolve(FIXTURE_DIR, "test-dataset.json"));
    expect(dataset.name).toBe("test");
    expect(dataset.items).toHaveLength(2);
    expect(dataset.items[0]!.input).toBe("What is 2+2?");
    expect(dataset.items[1]!.input).toBe("Explain gravity");
  });

  it("throws ENOENT for missing file", async () => {
    await expect(loadDataset("/nonexistent/path.json")).rejects.toThrow();
  });

  it("throws on invalid JSON", async () => {
    await expect(loadDataset(resolve(FIXTURE_DIR, "invalid.json"))).rejects.toThrow();
  });

  it("throws on dataset missing items array", async () => {
    await expect(
      loadDataset(resolve(FIXTURE_DIR, "missing-items.json")),
    ).rejects.toThrow("Invalid dataset format");
  });

  it("throws on dataset missing name", async () => {
    await expect(
      loadDataset(resolve(FIXTURE_DIR, "missing-name.json")),
    ).rejects.toThrow("Invalid dataset format");
  });
});

describe("runEval", () => {
  function createMockRunner(output: string): PatternRunner {
    return {
      async run(_input: string, emitter: StreamEmitter) {
        emitter.emit({ type: "chunk", agent: "test", content: output });
        return { output, totalUsage: { inputTokens: 10, outputTokens: 5 } };
      },
    };
  }

  function createMockProvider(score: number, reasoning: string): LLMProvider {
    return {
      lastUsage: { inputTokens: 20, outputTokens: 10 },
      chatStream: vi.fn(),
      chat: vi.fn().mockResolvedValue({
        content: JSON.stringify({ score, reasoning }),
        usage: { inputTokens: 20, outputTokens: 10 },
      } satisfies LLMResponse),
    } as unknown as LLMProvider;
  }

  const testDataset: Dataset = {
    name: "test",
    items: [
      { input: "What is 2+2?" },
      { input: "Explain gravity" },
    ],
  };

  it("runs eval over dataset and returns results with scores", async () => {
    const runner = createMockRunner("answer");
    const provider = createMockProvider(0.8, "Good");

    const result = await runEval({
      pattern: runner,
      dataset: testDataset,
      provider,
      criteria: ["relevance"],
    });

    expect(result.results).toHaveLength(2);
    expect(result.results[0]!.input).toBe("What is 2+2?");
    expect(result.results[0]!.output).toBe("answer");
    expect(result.results[0]!.scores["relevance"]!.score).toBe(0.8);
  });

  it("computes correct averages across items", async () => {
    const runner = createMockRunner("answer");
    const provider = createMockProvider(0.6, "OK");

    const result = await runEval({
      pattern: runner,
      dataset: testDataset,
      provider,
      criteria: ["relevance"],
    });

    expect(result.averages["relevance"]).toBe(0.6);
  });

  it("handles multiple criteria", async () => {
    const runner = createMockRunner("answer");
    const provider = createMockProvider(0.7, "Decent");

    const result = await runEval({
      pattern: runner,
      dataset: testDataset,
      provider,
      criteria: ["relevance", "accuracy"],
    });

    expect(result.results[0]!.scores["relevance"]).toBeDefined();
    expect(result.results[0]!.scores["accuracy"]).toBeDefined();
    expect(result.averages["relevance"]).toBe(0.7);
    expect(result.averages["accuracy"]).toBe(0.7);
  });

  it("returns empty results for empty dataset", async () => {
    const runner = createMockRunner("answer");
    const provider = createMockProvider(0.5, "OK");

    const result = await runEval({
      pattern: runner,
      dataset: { name: "empty", items: [] },
      provider,
      criteria: ["relevance"],
    });

    expect(result.results).toHaveLength(0);
    expect(result.averages["relevance"]).toBe(0);
  });
});
