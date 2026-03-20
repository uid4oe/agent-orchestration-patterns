import type { LLMProvider } from "../llm/provider.js";

export interface ScorerParams {
  provider: LLMProvider;
  criteria: string;
  input: string;
  output: string;
}

export interface ScorerResult {
  score: number;
  reasoning: string;
}

const JUDGE_SYSTEM_PROMPT = `You are an impartial judge evaluating AI-generated output.
Score the output on a scale from 0.0 to 1.0 based on the given criteria.
Respond in JSON format: {"score": <number>, "reasoning": "<explanation>"}
Only output valid JSON, nothing else.`;

function buildJudgePrompt(criteria: string, input: string, output: string): string {
  return `Criteria: ${criteria}

User input: ${input}

AI output: ${output}

Rate this output 0.0–1.0 on the given criteria.`;
}

export async function scoreLLMAsJudge(params: ScorerParams): Promise<ScorerResult> {
  const { provider, criteria, input, output } = params;

  const response = await provider.chat([
    { role: "system", content: JUDGE_SYSTEM_PROMPT },
    { role: "user", content: buildJudgePrompt(criteria, input, output) },
  ]);

  let raw: unknown;
  try {
    raw = JSON.parse(response.content);
  } catch {
    throw new Error(
      `LLM returned invalid JSON for scoring: ${response.content.slice(0, 200)}`,
    );
  }

  const parsed =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  const score =
    typeof parsed["score"] === "number"
      ? Math.max(0, Math.min(1, parsed["score"]))
      : 0;

  const reasoning =
    typeof parsed["reasoning"] === "string" ? parsed["reasoning"] : "";

  return { score, reasoning };
}
