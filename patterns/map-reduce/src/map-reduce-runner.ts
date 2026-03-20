import { createProvider, addUsage } from "@agent-patterns/core";
import type {
  ProviderConfig,
  StreamEmitter,
  TokenUsage,
} from "@agent-patterns/core";
import { SplitterAgent } from "./agents/splitter.js";
import { MapperAgent } from "./agents/mapper.js";
import { ReducerAgent } from "./agents/reducer.js";

export interface MapReduceResult {
  output: string;
  totalUsage: TokenUsage;
}

export function createMapReduceRunner(
  config: ProviderConfig,
): { run: (input: string, emitter: StreamEmitter) => Promise<MapReduceResult> } {
  // Splitter and reducer run sequentially, so they can share a provider
  const provider = createProvider(config.providerName, config.modelName);

  const splitter = new SplitterAgent({
    name: "splitter",
    role: "splitter",
    systemPrompt: "",
    provider,
  });

  const reducer = new ReducerAgent({
    name: "reducer",
    role: "reducer",
    systemPrompt: "",
    provider,
  });

  return {
    async run(input: string, emitter: StreamEmitter): Promise<MapReduceResult> {
      const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
      let output = "";

      try {
        // Phase 1: Split — break input into subtasks
        const splitResult = await splitter.split(input, emitter);
        addUsage(totalUsage, splitResult.usage);

        // Phase 2: Fan-out — emit handoff events from splitter to each mapper
        const subtasks = splitResult.subtasks;
        for (let i = 0; i < subtasks.length; i++) {
          emitter.emit({
            type: "handoff",
            from: "splitter",
            to: `mapper-${i + 1}`,
            reason: `subtask ${i + 1} of ${subtasks.length}`,
          });
        }

        // Phase 3: Map — run all mappers concurrently
        // Each mapper needs its own LLMProvider (lastUsage is instance state)
        const mapperPromises = subtasks.map((subtask, i) => {
          const mapperProvider = createProvider(config.providerName, config.modelName);
          const mapper = new MapperAgent({
            name: `mapper-${i + 1}`,
            role: "mapper",
            systemPrompt: "",
            provider: mapperProvider,
          });
          return mapper.run(subtask, emitter);
        });

        const mapperResults = await Promise.all(mapperPromises);

        for (const result of mapperResults) {
          addUsage(totalUsage, result.usage);
        }

        // Phase 4: Fan-in — handoff from mappers to reducer
        emitter.emit({
          type: "handoff",
          from: "mappers",
          to: "reducer",
          reason: `${mapperResults.length} analyses complete`,
        });

        // Phase 5: Reduce — synthesize all mapper outputs
        const reducerInput = mapperResults
          .map((result, i) => `## Analysis ${i + 1}\n${result.output}`)
          .join("\n\n");

        const reducerResult = await reducer.run(
          `Synthesize these independent analyses into a single coherent response:\n\n${reducerInput}`,
          emitter,
        );
        addUsage(totalUsage, reducerResult.usage);
        output = reducerResult.output;
      } catch (err) {
        emitter.emit({
          type: "error",
          agent: "system",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        emitter.emit({ type: "done", totalUsage });
      }

      return { output, totalUsage };
    },
  };
}
