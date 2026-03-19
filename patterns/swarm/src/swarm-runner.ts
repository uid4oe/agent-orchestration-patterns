import type { BaseAgent } from "@agent-patterns/core";
import type { StreamEmitter, TokenUsage } from "@agent-patterns/core";

export type SwarmAgentName = "triage" | "sales" | "support" | "billing";

const MAX_HANDOFFS = 5;

export function parseHandoff(output: string): SwarmAgentName | null {
  const match = /\[HANDOFF:(triage|sales|support|billing)\]/i.exec(output);
  if (!match?.[1]) {
    return null;
  }
  return match[1].toLowerCase() as SwarmAgentName;
}

export function stripHandoff(output: string): string {
  return output.replace(/\[HANDOFF:\w+\]/gi, "").trim();
}

function addUsage(total: TokenUsage, delta: TokenUsage): void {
  total.inputTokens += delta.inputTokens;
  total.outputTokens += delta.outputTokens;
}

export interface SwarmRunnerConfig {
  agents: Record<SwarmAgentName, BaseAgent>;
}

export class SwarmRunner {
  private readonly agents: Record<SwarmAgentName, BaseAgent>;

  constructor(config: SwarmRunnerConfig) {
    this.agents = config.agents;
  }

  async run(
    input: string,
    emitter: StreamEmitter,
  ): Promise<{ output: string; totalUsage: TokenUsage }> {
    const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
    let output = "";
    let currentAgentName: SwarmAgentName = "triage";
    let currentInput = input;

    try {
      for (let iteration = 0; iteration < MAX_HANDOFFS; iteration++) {
        const agent = this.agents[currentAgentName];
        const result = await agent.run(currentInput, emitter);
        addUsage(totalUsage, result.usage);

        const handoffTarget = parseHandoff(result.output);

        if (handoffTarget === null) {
          // No handoff — this agent handled the request
          output = stripHandoff(result.output);
          break;
        }

        // Handoff detected — emit event and prepare next iteration
        const strippedOutput = stripHandoff(result.output);
        emitter.emit({
          type: "handoff",
          from: currentAgentName,
          to: handoffTarget,
          reason: `${currentAgentName} handed off to ${handoffTarget}`,
        });

        // Build context for the next agent
        currentInput = `Original customer query: ${input}\n\nPrevious agent (${currentAgentName}) response: ${strippedOutput}\n\nPlease help this customer.`;
        currentAgentName = handoffTarget;

        // If this is the last iteration, use whatever we have
        if (iteration === MAX_HANDOFFS - 1) {
          output = strippedOutput;
        }
      }
    } catch (err) {
      emitter.emit({
        type: "error",
        agent: currentAgentName,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      emitter.emit({ type: "done", totalUsage });
    }

    return { output, totalUsage };
  }
}
