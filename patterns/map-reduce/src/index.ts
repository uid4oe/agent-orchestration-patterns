import type { PatternRunner, ProviderName } from "@agent-patterns/core";
import { createMapReduceRunner } from "./map-reduce-runner.js";

export const name = "map-reduce";
export const description = "Parallel fan-out to mappers with merged reduction";

function isProviderName(value: string): value is ProviderName {
  return value === "anthropic" || value === "openai" || value === "google";
}

function resolveProvider(envValue: string | undefined): ProviderName {
  if (envValue !== undefined && isProviderName(envValue)) {
    return envValue;
  }
  return "openai";
}

export function createRunner(): PatternRunner {
  const providerName = resolveProvider(process.env["LLM_PROVIDER"]);
  const modelName = process.env["LLM_MODEL"] ?? "gpt-4o-mini";

  return createMapReduceRunner(providerName, modelName);
}
