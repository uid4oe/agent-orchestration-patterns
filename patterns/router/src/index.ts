import { BaseAgent, createProvider } from "@agent-patterns/core";
import type {
  PatternRunner,
  ProviderName,
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

function addUsage(total: TokenUsage, delta: TokenUsage): void {
  total.inputTokens += delta.inputTokens;
  total.outputTokens += delta.outputTokens;
}

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
  const provider = createProvider(providerName, modelName);

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
        // Step 1: Route — classify the user's intent
        const routerResult = await router.run(input, emitter);
        addUsage(totalUsage, routerResult.usage);

        const intent = parseIntent(routerResult.output);
        const specialist = specialists[intent];

        // Step 2: Handoff — emit transition event
        emitter.emit({
          type: "handoff",
          from: "router",
          to: specialist.label,
          reason: `${intent.toLowerCase()} intent detected`,
        });

        // Step 3: Specialist — run the matched specialist
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
