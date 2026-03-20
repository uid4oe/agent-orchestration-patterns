import type { PatternRunner, ProviderConfig } from "@agent-patterns/core";
import { createMapReduceRunner } from "./map-reduce-runner.js";

export const name = "map-reduce";
export const description = "Parallel fan-out to mappers with merged reduction";

export function createRunner(config: ProviderConfig): PatternRunner {
  return createMapReduceRunner(config);
}
