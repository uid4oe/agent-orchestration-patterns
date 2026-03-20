import { createProvider, BaseAgent } from "@agent-patterns/core";
import type {
  PatternRunner,
  StreamEmitter,
  TokenUsage,
  ProviderName,
} from "@agent-patterns/core";
import { SupervisorAgent } from "./supervisor-agent.js";
import type { WorkerName } from "./supervisor-agent.js";
import { SearchWorker } from "./workers/search.js";
import { AnalysisWorker } from "./workers/analysis.js";
import { SummaryWorker } from "./workers/summary.js";

export const name = "supervisor";
export const description = "Supervised research with quality review and retry";

const MAX_ITERATIONS = 3;

export function createRunner(): PatternRunner {
  const providerName = toProviderName(process.env["LLM_PROVIDER"] ?? "openai");
  const modelName = process.env["LLM_MODEL"] ?? "gpt-4o-mini";
  const provider = createProvider(providerName, modelName);

  const supervisor = new SupervisorAgent({
    name: "supervisor",
    role: "supervisor",
    systemPrompt: "",
    provider,
  });

  const workers: Record<WorkerName, BaseAgent> = {
    search: new SearchWorker({
      name: "search",
      role: "information gatherer",
      systemPrompt: "",
      provider,
    }),
    analysis: new AnalysisWorker({
      name: "analysis",
      role: "analyst",
      systemPrompt: "",
      provider,
    }),
    summary: new SummaryWorker({
      name: "summary",
      role: "summarizer",
      systemPrompt: "",
      provider,
    }),
  };

  return {
    async run(input: string, emitter: StreamEmitter) {
      const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
      let output = "";

      try {
        // Step 1: Supervisor plans subtasks
        const { plan, usage: planUsage } = await supervisor.plan(input, emitter);
        addUsage(totalUsage, planUsage);

        // Step 2: Execute each subtask with review loop
        let previousOutput = "";
        for (const subtask of plan.subtasks) {
          const worker = workers[subtask.worker];
          let instruction = subtask.instruction;

          // Include previous worker output as context
          if (previousOutput) {
            instruction = `${instruction}\n\nContext from previous research:\n${previousOutput}`;
          }

          let workerOutput = "";
          let iteration = 0;

          while (iteration < MAX_ITERATIONS) {
            iteration++;

            // Emit handoff to worker
            const reason =
              iteration === 1
                ? `Dispatching ${subtask.worker} task`
                : `Retry ${iteration}/${MAX_ITERATIONS} for ${subtask.worker}`;

            emitter.emit({
              type: "handoff",
              from: "supervisor",
              to: subtask.worker,
              reason,
            });

            // Run worker
            const workerResult = await worker.run(instruction, emitter);
            addUsage(totalUsage, workerResult.usage);
            workerOutput = workerResult.output;

            // Supervisor reviews output
            emitter.emit({
              type: "handoff",
              from: subtask.worker,
              to: "supervisor",
              reason: `Reviewing ${subtask.worker} output`,
            });

            const { result: review, usage: reviewUsage } =
              await supervisor.review(
                subtask.worker,
                subtask.instruction,
                workerOutput,
                emitter,
              );
            addUsage(totalUsage, reviewUsage);

            if (review.adequate || iteration >= MAX_ITERATIONS) {
              break;
            }

            // Retry with feedback
            instruction = `${subtask.instruction}\n\nPrevious attempt feedback: ${review.feedback}\n\nPlease improve your response based on this feedback.`;
            if (previousOutput) {
              instruction += `\n\nContext from previous research:\n${previousOutput}`;
            }
          }

          previousOutput = workerOutput;
          output = workerOutput;
        }
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

function addUsage(total: TokenUsage, addition: TokenUsage): void {
  total.inputTokens += addition.inputTokens;
  total.outputTokens += addition.outputTokens;
}

const VALID_PROVIDERS = new Set<string>(["openai", "anthropic", "google"]);

function toProviderName(value: string): ProviderName {
  if (!VALID_PROVIDERS.has(value)) {
    throw new Error(`Invalid LLM_PROVIDER: ${value}. Must be one of: openai, anthropic, google`);
  }
  // Safe after validation above
  return value as ProviderName;
}
