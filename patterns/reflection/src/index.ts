import { createProvider } from "@agent-patterns/core";
import type {
  PatternRunner,
  StreamEmitter,
  TokenUsage,
  ProviderName,
} from "@agent-patterns/core";
import { Generator } from "./agents/generator.js";
import { Critic } from "./agents/critic.js";
import { ReflectionLoop } from "./reflection-loop.js";

export const name = "reflection";
export const description = "Iterative generate-critique-revise loop";

export function createRunner(): PatternRunner {
  const provider = createProvider(
    (process.env["LLM_PROVIDER"] ?? "openai") as ProviderName,
    process.env["LLM_MODEL"] ?? "gpt-4o-mini",
  );

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
        totalUsage.inputTokens = result.totalUsage.inputTokens;
        totalUsage.outputTokens = result.totalUsage.outputTokens;
      } catch (err) {
        emitter.emit({
          type: "error",
          agent: "system",
          message: String(err),
        });
      } finally {
        emitter.emit({ type: "done", totalUsage });
      }

      return { output, totalUsage };
    },
  };
}
