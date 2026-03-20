import { BaseAgent, createProvider, addUsage } from "@agent-patterns/core";
import type {
  PatternRunner,
  ProviderConfig,
  StreamEmitter,
  TokenUsage,
} from "@agent-patterns/core";
import { RouterAgent, parseIntent } from "./router-agent.js";
import type { IntentCategory } from "./router-agent.js";
import { BillingSpecialist } from "./specialists/billing.js";
import { TechnicalSpecialist } from "./specialists/technical.js";
import { GeneralSpecialist } from "./specialists/general.js";

export const name = "router";
export const description = "Intent-based routing to specialist agents";

export function createRunner(config: ProviderConfig): PatternRunner {
  const provider = createProvider(config.providerName, config.modelName);

  const router = new RouterAgent({
    name: "router",
    role: "classifier",
    systemPrompt: "",
    provider,
  });

  const specialists: Record<IntentCategory, { agent: BaseAgent; label: string }> = {
    BILLING: { agent: new BillingSpecialist({
      name: "billing",
      role: "specialist",
      systemPrompt: "",
      provider,
    }), label: "billing" },
    TECHNICAL: { agent: new TechnicalSpecialist({
      name: "technical",
      role: "specialist",
      systemPrompt: "",
      provider,
    }), label: "technical" },
    GENERAL: { agent: new GeneralSpecialist({
      name: "general",
      role: "specialist",
      systemPrompt: "",
      provider,
    }), label: "general" },
  };

  return {
    async run(input: string, emitter: StreamEmitter): Promise<{ output: string; totalUsage: TokenUsage }> {
      const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
      let output = "";

      try {
        const routerResult = await router.run(input, emitter);
        addUsage(totalUsage, routerResult.usage);

        const intent = parseIntent(routerResult.output);
        const specialist = specialists[intent];

        emitter.emit({
          type: "handoff",
          from: "router",
          to: specialist.label,
          reason: `${intent.toLowerCase()} intent detected`,
        });

        const specialistResult = await specialist.agent.run(input, emitter);
        addUsage(totalUsage, specialistResult.usage);
        output = specialistResult.output;
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
