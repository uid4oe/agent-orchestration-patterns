import { createProvider, BaseAgent, addUsage } from "@agent-patterns/core";
import type {
  PatternRunner,
  ProviderConfig,
  StreamEmitter,
  TokenUsage,
} from "@agent-patterns/core";
import { SupervisorAgent } from "./supervisor-agent.js";
import type { WorkerName } from "./supervisor-agent.js";
import { SearchWorker } from "./workers/search.js";
import { AnalysisWorker } from "./workers/analysis.js";
import { SummaryWorker } from "./workers/summary.js";

export const name = "supervisor";
export const description = "Supervised research with quality review and retry";

const MAX_ITERATIONS = 3;

export function createRunner(config: ProviderConfig): PatternRunner {
  const provider = createProvider(config.providerName, config.modelName);

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
        const { plan, usage: planUsage } = await supervisor.plan(input, emitter);
        addUsage(totalUsage, planUsage);

        let previousOutput = "";
        for (const subtask of plan.subtasks) {
          const worker = workers[subtask.worker];
          let instruction = subtask.instruction;

          if (previousOutput) {
            instruction = `${instruction}\n\nContext from previous research:\n${previousOutput}`;
          }

          let workerOutput = "";
          let iteration = 0;

          while (iteration < MAX_ITERATIONS) {
            iteration++;

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

            const workerResult = await worker.run(instruction, emitter);
            addUsage(totalUsage, workerResult.usage);
            workerOutput = workerResult.output;

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
