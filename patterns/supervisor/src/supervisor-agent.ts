import { BaseAgent } from "@agent-patterns/core";
import type {
  AgentResult,
  StreamEmitter,
  ChatMessage,
  TokenUsage,
} from "@agent-patterns/core";

const PLANNING_SYSTEM_PROMPT = `You are a research supervisor. Given a user's research request, create a plan of subtasks to execute.

You MUST respond with valid JSON only, no other text. The JSON must have this exact shape:
{
  "subtasks": [
    { "worker": "search", "instruction": "..." },
    { "worker": "analysis", "instruction": "..." },
    { "worker": "summary", "instruction": "..." }
  ]
}

Available workers:
- "search": Information gatherer — finds facts, data, and sources
- "analysis": Analyst — identifies patterns, compares perspectives, draws insights
- "summary": Summarizer — produces clear, comprehensive reports

Plan the subtasks in logical order. Usually: search first, then analysis, then summary.
Each instruction should be specific and detailed, tailored to the research request.`;

const REVIEW_SYSTEM_PROMPT = `You are a quality reviewer for research output. Given a worker's output and its original instruction, evaluate the quality.

You MUST respond with valid JSON only, no other text. The JSON must have this exact shape:
{
  "adequate": true or false,
  "feedback": "explanation of what is good or what needs improvement"
}

Evaluate based on:
- Completeness: Does the output cover the requested topic adequately?
- Accuracy: Are claims specific and well-supported?
- Structure: Is the output well-organized and clear?
- Relevance: Does the output address the original instruction?

Be constructive but fair. Only mark as inadequate if there are significant gaps or issues.`;

export type WorkerName = "search" | "analysis" | "summary";

export interface Subtask {
  worker: WorkerName;
  instruction: string;
}

export interface Plan {
  subtasks: ReadonlyArray<Subtask>;
}

export interface ReviewResult {
  adequate: boolean;
  feedback: string;
}

export class SupervisorAgent extends BaseAgent {
  /**
   * Default execute implementation (called via BaseAgent.run()).
   * The runner uses plan() and review() directly instead.
   */
  protected async execute(
    input: string,
    emitter: StreamEmitter,
  ): Promise<AgentResult> {
    const messages: ReadonlyArray<ChatMessage> = [
      { role: "system", content: PLANNING_SYSTEM_PROMPT },
      { role: "user", content: input },
    ];
    const response = await this.config.provider.chat(messages);
    emitter.emit({
      type: "chunk",
      agent: this.config.name,
      content: response.content,
    });
    return { output: response.content, usage: response.usage, durationMs: 0 };
  }

  /**
   * Plan subtasks for a research request.
   * Manually emits agent_start/agent_end with "planner" role.
   */
  async plan(
    input: string,
    emitter: StreamEmitter,
  ): Promise<{ plan: Plan; usage: TokenUsage }> {
    const start = Date.now();
    emitter.emit({
      type: "agent_start",
      agent: this.config.name,
      role: "planner",
    });

    try {
      const messages: ReadonlyArray<ChatMessage> = [
        { role: "system", content: PLANNING_SYSTEM_PROMPT },
        { role: "user", content: input },
      ];

      const response = await this.config.provider.chat(messages);
      const plan = parsePlan(response.content);

      emitter.emit({
        type: "chunk",
        agent: this.config.name,
        content: `Plan: ${plan.subtasks.map((s) => s.worker).join(" → ")}`,
      });

      const durationMs = Date.now() - start;
      emitter.emit({
        type: "agent_end",
        agent: this.config.name,
        durationMs,
        usage: response.usage,
      });

      return { plan, usage: response.usage };
    } catch (err) {
      emitter.emit({
        type: "error",
        agent: this.config.name,
        message: String(err),
      });
      throw err;
    }
  }

  /**
   * Review a worker's output for quality.
   * Manually emits agent_start/agent_end with "reviewer" role.
   */
  async review(
    workerName: string,
    instruction: string,
    workerOutput: string,
    emitter: StreamEmitter,
  ): Promise<{ result: ReviewResult; usage: TokenUsage }> {
    const start = Date.now();
    emitter.emit({
      type: "agent_start",
      agent: this.config.name,
      role: "reviewer",
    });

    try {
      const messages: ReadonlyArray<ChatMessage> = [
        { role: "system", content: REVIEW_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Worker: ${workerName}\nInstruction: ${instruction}\n\nWorker Output:\n${workerOutput}`,
        },
      ];

      const response = await this.config.provider.chat(messages);
      const result = parseReview(response.content);

      const verdict = result.adequate ? "adequate" : "needs improvement";
      emitter.emit({
        type: "chunk",
        agent: this.config.name,
        content: `Review of ${workerName}: ${verdict}. ${result.feedback}`,
      });

      const durationMs = Date.now() - start;
      emitter.emit({
        type: "agent_end",
        agent: this.config.name,
        durationMs,
        usage: response.usage,
      });

      return { result, usage: response.usage };
    } catch (err) {
      emitter.emit({
        type: "error",
        agent: this.config.name,
        message: String(err),
      });
      throw err;
    }
  }
}

function parsePlan(content: string): Plan {
  const cleaned = extractJson(content);
  const parsed: unknown = JSON.parse(cleaned);
  if (!isValidPlan(parsed)) {
    throw new Error("Invalid plan format from supervisor");
  }
  return parsed;
}

function parseReview(content: string): ReviewResult {
  const cleaned = extractJson(content);
  const parsed: unknown = JSON.parse(cleaned);
  if (!isValidReview(parsed)) {
    throw new Error("Invalid review format from supervisor");
  }
  return parsed;
}

function extractJson(content: string): string {
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/.exec(content);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }
  return content.trim();
}

function prop(obj: unknown, key: string): unknown {
  if (typeof obj === "object" && obj !== null && key in obj) {
    return (obj as Record<string, unknown>)[key];
  }
  return undefined;
}

function isValidPlan(value: unknown): value is Plan {
  if (typeof value !== "object" || value === null) return false;
  const subtasks = prop(value, "subtasks");
  if (!Array.isArray(subtasks)) return false;
  const validWorkers = new Set<string>(["search", "analysis", "summary"]);
  return subtasks.every((item: unknown) => {
    if (typeof item !== "object" || item === null) return false;
    const worker = prop(item, "worker");
    const instruction = prop(item, "instruction");
    return (
      typeof worker === "string" &&
      validWorkers.has(worker) &&
      typeof instruction === "string"
    );
  });
}

function isValidReview(value: unknown): value is ReviewResult {
  if (typeof value !== "object" || value === null) return false;
  const adequate = prop(value, "adequate");
  const feedback = prop(value, "feedback");
  return typeof adequate === "boolean" && typeof feedback === "string";
}
