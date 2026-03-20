import { createProvider, addUsage } from "@agent-patterns/core";
import type { PatternRunner, ProviderConfig, StreamEmitter, TokenUsage } from "@agent-patterns/core";
import { Researcher } from "./stages/researcher.js";
import { Writer } from "./stages/writer.js";
import { Editor } from "./stages/editor.js";
import { Pipeline } from "./pipeline.js";

export const name = "pipeline";
export const description = "Sequential content creation pipeline";

export function createRunner(config: ProviderConfig): PatternRunner {
  const provider = createProvider(config.providerName, config.modelName);

  const researcher = new Researcher({
    name: "researcher",
    role: "research expert",
    systemPrompt: "",
    provider,
  });

  const writer = new Writer({
    name: "writer",
    role: "content writer",
    systemPrompt: "",
    provider,
  });

  const editor = new Editor({
    name: "editor",
    role: "editor",
    systemPrompt: "",
    provider,
  });

  const pipeline = new Pipeline([
    { name: "researcher", agent: researcher },
    { name: "writer", agent: writer },
    { name: "editor", agent: editor },
  ]);

  return {
    async run(
      input: string,
      emitter: StreamEmitter,
    ): Promise<{ output: string; totalUsage: TokenUsage }> {
      let output = "";
      const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

      try {
        const result = await pipeline.run(input, emitter);
        output = result.output;
        addUsage(totalUsage, result.totalUsage);
      } catch (err) {
        emitter.emit({
          type: "error",
          agent: "pipeline",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        emitter.emit({ type: "done", totalUsage });
      }

      return { output, totalUsage };
    },
  };
}
