import { BaseAgent } from "@agent-patterns/core";
import type {
  AgentResult,
  ChatMessage,
  StreamEmitter,
  TokenUsage,
} from "@agent-patterns/core";

const SPLITTER_SYSTEM_PROMPT = `You are a task splitter. Break the user's input into 2-4 independent sub-tasks that can be analyzed in parallel.

Respond with JSON only:
{ "subtasks": ["subtask 1", "subtask 2", ...] }

Each subtask should be a self-contained analysis instruction. Do not include any text outside the JSON.`;

export interface SplitResult {
  subtasks: ReadonlyArray<string>;
  usage: TokenUsage;
}

export class SplitterAgent extends BaseAgent {
  protected async execute(
    input: string,
    emitter: StreamEmitter,
  ): Promise<AgentResult> {
    const messages: ReadonlyArray<ChatMessage> = [
      { role: "system", content: SPLITTER_SYSTEM_PROMPT },
      { role: "user", content: input },
    ];
    const response = await this.config.provider.chat(messages);
    emitter.emit({
      type: "chunk",
      agent: this.config.name,
      content: response.content,
    });
    return { output: response.content, usage: response.usage };
  }

  async split(
    input: string,
    emitter: StreamEmitter,
  ): Promise<SplitResult> {
    const start = Date.now();
    emitter.emit({
      type: "agent_start",
      agent: this.config.name,
      role: "splitter",
    });

    try {
      const messages: ReadonlyArray<ChatMessage> = [
        { role: "system", content: SPLITTER_SYSTEM_PROMPT },
        { role: "user", content: input },
      ];

      const response = await this.config.provider.chat(messages);
      const subtasks = parseSubtasks(response.content);

      emitter.emit({
        type: "chunk",
        agent: this.config.name,
        content: `Split into ${subtasks.length} subtasks: ${subtasks.map((_, i) => `mapper-${i + 1}`).join(", ")}`,
      });

      const durationMs = Date.now() - start;
      emitter.emit({
        type: "agent_end",
        agent: this.config.name,
        durationMs,
        usage: response.usage,
      });

      return { subtasks, usage: response.usage };
    } catch (err) {
      emitter.emit({
        type: "error",
        agent: this.config.name,
        message: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

function parseSubtasks(content: string): ReadonlyArray<string> {
  const cleaned = extractJson(content);
  const parsed: unknown = JSON.parse(cleaned);
  if (!isValidSubtasks(parsed)) {
    throw new Error("Invalid subtasks format from splitter");
  }
  return parsed.subtasks;
}

function extractJson(content: string): string {
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/.exec(content);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }
  return content.trim();
}

function isValidSubtasks(
  value: unknown,
): value is { subtasks: ReadonlyArray<string> } {
  if (typeof value !== "object" || value === null) return false;
  const subtasks = prop(value, "subtasks");
  if (!Array.isArray(subtasks)) return false;
  return subtasks.every((item: unknown) => typeof item === "string");
}

function prop(obj: unknown, key: string): unknown {
  if (typeof obj !== "object" || obj === null || !(key in obj)) {
    return undefined;
  }
  return Reflect.get(obj, key);
}
