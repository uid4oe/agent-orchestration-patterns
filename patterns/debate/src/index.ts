import { createProvider } from "@agent-patterns/core";
import type { PatternRunner, StreamEmitter, TokenUsage } from "@agent-patterns/core";
import { BullDebater } from "./debaters/bull.js";
import { BearDebater } from "./debaters/bear.js";
import { Judge } from "./judge.js";
import { DebateArena } from "./debate-arena.js";

export const name = "debate";
export const description = "Adversarial debate with bull, bear, and judge";

export function createRunner(): PatternRunner {
  const provider = createProvider(
    "openai",
    process.env["LLM_MODEL"] ?? "gpt-4o-mini",
  );

  const bull = new BullDebater({
    name: "bull",
    role: "debater",
    systemPrompt: "",
    provider,
  });

  const bear = new BearDebater({
    name: "bear",
    role: "debater",
    systemPrompt: "",
    provider,
  });

  const judge = new Judge({
    name: "judge",
    role: "judge",
    systemPrompt: "",
    provider,
  });

  const arena = new DebateArena(bull, bear, judge);

  return {
    async run(
      input: string,
      emitter: StreamEmitter,
    ): Promise<{ output: string; totalUsage: TokenUsage }> {
      let output = "";
      const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

      try {
        const result = await arena.run(input, emitter);
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
