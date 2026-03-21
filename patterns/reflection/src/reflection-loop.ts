import { addUsage } from "@agent-patterns/core";
import type { BaseAgent, StreamEmitter, TokenUsage } from "@agent-patterns/core";

export interface CriticVerdict {
  verdict: "pass" | "revise";
  feedback: string;
}

export interface ReflectionResult {
  output: string;
  totalUsage: TokenUsage;
}

/**
 * Extract a JSON verdict from the critic's output.
 *
 * Handles:
 * - Raw JSON at end of output
 * - JSON inside fenced code blocks (```json ... ```)
 * - Extra text before/after the JSON
 * - Malformed JSON (fallback to "revise" with full output as feedback)
 */
export function parseCriticVerdict(output: string): CriticVerdict {
  // Try fenced code block first: ```json ... ``` or ``` ... ```
  const fencedMatch = /```(?:json)?\s*\n?\s*(\{[\s\S]*?\})\s*\n?\s*```/.exec(
    output,
  );
  if (fencedMatch?.[1]) {
    try {
      const parsed: unknown = JSON.parse(fencedMatch[1]);
      if (isValidVerdict(parsed)) {
        return parsed;
      }
    } catch {
      // Fall through to next strategy
    }
  }

  // Try to find raw JSON object anywhere in the output
  const jsonMatch = /\{[^{}]*"verdict"\s*:\s*"(?:pass|revise)"[^{}]*\}/.exec(
    output,
  );
  if (jsonMatch?.[0]) {
    try {
      const parsed: unknown = JSON.parse(jsonMatch[0]);
      if (isValidVerdict(parsed)) {
        return parsed;
      }
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: treat as "revise" with full output as feedback
  return { verdict: "revise", feedback: output };
}

function isValidVerdict(value: unknown): value is CriticVerdict {
  if (typeof value !== "object" || value === null) return false;
  if (!("verdict" in value) || !("feedback" in value)) return false;
  return (
    (value.verdict === "pass" || value.verdict === "revise") &&
    typeof value.feedback === "string"
  );
}

export class ReflectionLoop {
  constructor(
    private readonly generator: BaseAgent,
    private readonly critic: BaseAgent,
    private readonly maxIterations: number = 3,
  ) {}

  async run(
    input: string,
    emitter: StreamEmitter,
  ): Promise<ReflectionResult> {
    const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
    let generatorOutput = "";
    let lastFeedback = "";

    for (let iteration = 1; iteration <= this.maxIterations; iteration++) {
      // Build generator input
      const generatorInput =
        iteration === 1
          ? input
          : `Original request: ${input}\n\nYour previous draft:\n${generatorOutput}\n\nReviewer feedback:\n${lastFeedback}\n\nPlease revise your response to address all feedback points.`;

      // Run generator
      const genResult = await this.generator.run(generatorInput, emitter);
      generatorOutput = genResult.output;
      addUsage(totalUsage, genResult.usage);

      // On final iteration, skip critic
      if (iteration === this.maxIterations) {
        break;
      }

      // Handoff to critic
      emitter.emit({
        type: "handoff",
        from: "generator",
        to: "critic",
        reason: `iteration ${iteration} — reviewing generated content`,
      });

      // Build critic input
      const criticInput = `Original request: ${input}\n\nContent to review:\n${generatorOutput}\n\nEvaluate this content and respond with JSON: {"verdict": "pass" or "revise", "feedback": "your feedback"}`;

      // Run critic
      const criticResult = await this.critic.run(criticInput, emitter);
      addUsage(totalUsage, criticResult.usage);

      // Parse verdict
      const verdict = parseCriticVerdict(criticResult.output);

      if (verdict.verdict === "pass") {
        break;
      }

      // Prepare for next iteration — handoff back to generator
      lastFeedback = verdict.feedback;
      emitter.emit({
        type: "handoff",
        from: "critic",
        to: "generator",
        reason: `iteration ${iteration} — revision needed: ${verdict.feedback.length > 120 ? verdict.feedback.slice(0, 120) + "…" : verdict.feedback}`,
      });
    }

    return { output: generatorOutput, totalUsage };
  }
}
