import { createProvider } from "@agent-patterns/core";
import type { PatternRunner, ProviderName, StreamEmitter, TokenUsage } from "@agent-patterns/core";
import { TriageAgent } from "./agents/triage.js";
import { SalesAgent } from "./agents/sales.js";
import { SupportAgent } from "./agents/support.js";
import { BillingAgent } from "./agents/billing.js";
import { SwarmRunner } from "./swarm-runner.js";

export const name = "swarm";
export const description = "Dynamic agent-to-agent handoffs without central routing";

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

  const triage = new TriageAgent({
    name: "triage",
    role: "triage",
    systemPrompt: "",
    provider,
  });

  const sales = new SalesAgent({
    name: "sales",
    role: "specialist",
    systemPrompt: "",
    provider,
  });

  const support = new SupportAgent({
    name: "support",
    role: "specialist",
    systemPrompt: "",
    provider,
  });

  const billing = new BillingAgent({
    name: "billing",
    role: "specialist",
    systemPrompt: "",
    provider,
  });

  const runner = new SwarmRunner({
    agents: { triage, sales, support, billing },
  });

  return {
    async run(input: string, emitter: StreamEmitter): Promise<{ output: string; totalUsage: TokenUsage }> {
      return runner.run(input, emitter);
    },
  };
}
