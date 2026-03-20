import { describe, it, expect, vi } from "vitest";
import { scoreLLMAsJudge } from "../eval/scorer.js";
import type { LLMProvider } from "../llm/provider.js";
import type { LLMResponse } from "../llm/types.js";
import type { TokenUsage } from "../stream/types.js";

function createMockProvider(content: string): LLMProvider {
  const usage: TokenUsage = { inputTokens: 50, outputTokens: 20 };
  return {
    lastUsage: usage,
    chatStream: vi.fn(),
    chat: vi.fn().mockResolvedValue({ content, usage } satisfies LLMResponse),
  } as unknown as LLMProvider;
}

describe("scoreLLMAsJudge", () => {
  it("parses valid JSON response with score and reasoning", async () => {
    const provider = createMockProvider(
      '{"score": 0.85, "reasoning": "Well-structured response"}',
    );

    const result = await scoreLLMAsJudge({
      provider,
      criteria: "relevance",
      input: "test input",
      output: "test output",
    });

    expect(result.score).toBe(0.85);
    expect(result.reasoning).toBe("Well-structured response");
  });

  it("clamps score above 1.0 down to 1.0", async () => {
    const provider = createMockProvider('{"score": 1.5, "reasoning": "Excellent"}');

    const result = await scoreLLMAsJudge({
      provider,
      criteria: "relevance",
      input: "test",
      output: "test",
    });

    expect(result.score).toBe(1.0);
  });

  it("clamps score below 0.0 up to 0.0", async () => {
    const provider = createMockProvider('{"score": -0.3, "reasoning": "Poor"}');

    const result = await scoreLLMAsJudge({
      provider,
      criteria: "relevance",
      input: "test",
      output: "test",
    });

    expect(result.score).toBe(0.0);
  });

  it("throws on malformed JSON", async () => {
    const provider = createMockProvider("not valid json at all");

    await expect(
      scoreLLMAsJudge({
        provider,
        criteria: "relevance",
        input: "test",
        output: "test",
      }),
    ).rejects.toThrow("LLM returned invalid JSON for scoring");
  });

  it("defaults score to 0 when score field is missing", async () => {
    const provider = createMockProvider('{"reasoning": "No score given"}');

    const result = await scoreLLMAsJudge({
      provider,
      criteria: "relevance",
      input: "test",
      output: "test",
    });

    expect(result.score).toBe(0);
    expect(result.reasoning).toBe("No score given");
  });

  it("defaults reasoning to empty string when field is missing", async () => {
    const provider = createMockProvider('{"score": 0.7}');

    const result = await scoreLLMAsJudge({
      provider,
      criteria: "relevance",
      input: "test",
      output: "test",
    });

    expect(result.score).toBe(0.7);
    expect(result.reasoning).toBe("");
  });

  it("defaults both fields for empty JSON object", async () => {
    const provider = createMockProvider("{}");

    const result = await scoreLLMAsJudge({
      provider,
      criteria: "relevance",
      input: "test",
      output: "test",
    });

    expect(result.score).toBe(0);
    expect(result.reasoning).toBe("");
  });

  it("passes correct messages to provider.chat", async () => {
    const provider = createMockProvider('{"score": 0.5, "reasoning": "OK"}');

    await scoreLLMAsJudge({
      provider,
      criteria: "accuracy",
      input: "user question",
      output: "ai answer",
    });

    expect(provider.chat).toHaveBeenCalledOnce();
    const messages = vi.mocked(provider.chat).mock.calls[0]![0];
    expect(messages).toHaveLength(2);
    expect(messages[0]!.role).toBe("system");
    expect(messages[1]!.content).toContain("accuracy");
    expect(messages[1]!.content).toContain("user question");
    expect(messages[1]!.content).toContain("ai answer");
  });
});
