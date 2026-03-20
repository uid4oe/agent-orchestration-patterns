import { createProvider, addUsage } from "@agent-patterns/core";
import type {
  PatternRunner,
  ProviderConfig,
  StreamEmitter,
  TokenUsage,
} from "@agent-patterns/core";
import { Generator } from "./agents/generator.js";
import { Critic } from "./agents/critic.js";
import { ReflectionLoop } from "./reflection-loop.js";

export const name = "reflection";
export const description = "Iterative generate-critique-revise loop";

export function createRunner(config: ProviderConfig): PatternRunner {
  const provider = createProvider(config.providerName, config.modelName);

  const generator = new Generator({
    name: "generator",
    role: "content generator",
    systemPrompt: "",
    provider,
  });

  const critic = new Critic({
    name: "critic",
    role: "content critic",
    systemPrompt: "",
    provider,
  });

  const loop = new ReflectionLoop(generator, critic);

  return {
    async run(
      input: string,
      emitter: StreamEmitter,
    ): Promise<{ output: string; totalUsage: TokenUsage }> {
      let output = "";
      const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

      try {
        const result = await loop.run(input, emitter);
        output = result.output;
        addUsage(totalUsage, result.totalUsage);
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
