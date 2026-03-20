import { createProvider } from "@agent-patterns/core";
import type { PatternRunner, ProviderConfig, StreamEmitter, TokenUsage } from "@agent-patterns/core";
import { TriageAgent } from "./agents/triage.js";
import { SalesAgent } from "./agents/sales.js";
import { SupportAgent } from "./agents/support.js";
import { BillingAgent } from "./agents/billing.js";
import { SwarmRunner } from "./swarm-runner.js";

export const name = "swarm";
export const description = "Dynamic agent-to-agent handoffs without central routing";

export function createRunner(config: ProviderConfig): PatternRunner {
  const provider = createProvider(config.providerName, config.modelName);

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
