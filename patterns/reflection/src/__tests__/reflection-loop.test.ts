import { describe, it, expect, vi } from "vitest";
import { BaseAgent } from "@agent-patterns/core";
import type { AgentResult } from "@agent-patterns/core";
import type {
  StreamEmitter,
  StreamEvent,
  TokenUsage,
} from "@agent-patterns/core";
import type { ChatMessage } from "@agent-patterns/core";
import type { LLMProvider } from "@agent-patterns/core";
import { ReflectionLoop, parseCriticVerdict } from "../reflection-loop.js";

function createMockProvider(
  streamChunks: string[],
  usage: TokenUsage,
): LLMProvider {
  return {
    lastUsage: usage,
    chatStream: vi
      .fn()
      .mockImplementation(
        async function* (_messages: ReadonlyArray<ChatMessage>) {
          for (const chunk of streamChunks) {
            yield chunk;
          }
        },
      ),
    chat: vi.fn(),
  } as unknown as LLMProvider;
}

function createMockProviderSequence(
  calls: Array<{ chunks: string[]; usage: TokenUsage }>,
): LLMProvider {
  const chatStreamFn = vi.fn();
  const provider = {
    lastUsage: calls[0]?.usage ?? { inputTokens: 0, outputTokens: 0 },
    chatStream: chatStreamFn,
    chat: vi.fn(),
  } as unknown as LLMProvider;

  for (let i = 0; i < calls.length; i++) {
    const call = calls[i]!;
    chatStreamFn.mockImplementationOnce(
      async function* (_messages: ReadonlyArray<ChatMessage>) {
        // Update lastUsage for the current call
        (provider as unknown as { lastUsage: TokenUsage }).lastUsage =
          call.usage;
        for (const chunk of call.chunks) {
          yield chunk;
        }
      },
    );
  }

  return provider;
}

function createEmitter(): { emitter: StreamEmitter; events: StreamEvent[] } {
  const events: StreamEvent[] = [];
  const emitter: StreamEmitter = {
    emit: (event: StreamEvent) => events.push(event),
  };
  return { emitter, events };
}

class MockAgent extends BaseAgent {
  protected async execute(
    input: string,
    emitter: StreamEmitter,
  ): Promise<AgentResult> {
    const messages: ReadonlyArray<ChatMessage> = [
      { role: "system", content: this.config.systemPrompt },
      { role: "user", content: input },
    ];
    const { output, usage } = await this.chatStream(messages, emitter);
    return { output, usage, durationMs: 0 };
  }
}

const defaultUsage: TokenUsage = { inputTokens: 10, outputTokens: 5 };

function createMockAgent(
  name: string,
  role: string,
  chunks: string[],
): MockAgent {
  return new MockAgent({
    name,
    role,
    systemPrompt: `You are ${name}.`,
    provider: createMockProvider(chunks, defaultUsage),
  });
}

// --- parseCriticVerdict tests ---

describe("parseCriticVerdict", () => {
  it("parses valid JSON with pass verdict", () => {
    const result = parseCriticVerdict(
      '{"verdict":"pass","feedback":"looks good"}',
    );
    expect(result).toEqual({ verdict: "pass", feedback: "looks good" });
  });

  it("parses valid JSON with revise verdict", () => {
    const result = parseCriticVerdict(
      '{"verdict":"revise","feedback":"needs work"}',
    );
    expect(result).toEqual({ verdict: "revise", feedback: "needs work" });
  });

  it("parses JSON in fenced code blocks", () => {
    const output = `Here is my evaluation:

\`\`\`json
{"verdict":"pass","feedback":"well written"}
\`\`\``;
    const result = parseCriticVerdict(output);
    expect(result).toEqual({ verdict: "pass", feedback: "well written" });
  });

  it('returns revise with full output as feedback when JSON is malformed', () => {
    const output = "This content needs improvement but I forgot the JSON";
    const result = parseCriticVerdict(output);
    expect(result).toEqual({ verdict: "revise", feedback: output });
  });

  it("handles extra text before and after JSON block", () => {
    const output =
      'The content is strong overall. {"verdict":"pass","feedback":"meets all criteria"} End of review.';
    const result = parseCriticVerdict(output);
    expect(result).toEqual({
      verdict: "pass",
      feedback: "meets all criteria",
    });
  });
});

// --- ReflectionLoop tests ---

describe("ReflectionLoop", () => {
  describe("single iteration — critic passes on first review", () => {
    it("runs generator once and critic once, then stops", async () => {
      const generator = createMockAgent("generator", "content generator", [
        "great draft",
      ]);
      const critic = createMockAgent("critic", "content critic", [
        '{"verdict":"pass","feedback":"good"}',
      ]);

      const loop = new ReflectionLoop(generator, critic);
      const { emitter } = createEmitter();

      const result = await loop.run("write something", emitter);

      expect(result.output).toBe("great draft");
      // 2 agent calls: generator + critic
      expect(result.totalUsage).toEqual({
        inputTokens: 20,
        outputTokens: 10,
      });
    });

    it("emits correct event sequence for pass-on-first-try", async () => {
      const generator = createMockAgent("generator", "content generator", [
        "draft",
      ]);
      const critic = createMockAgent("critic", "content critic", [
        '{"verdict":"pass","feedback":"good"}',
      ]);

      const loop = new ReflectionLoop(generator, critic);
      const { emitter, events } = createEmitter();

      await loop.run("write something", emitter);

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toEqual([
        "agent_start", // generator
        "chunk",
        "agent_end",
        "handoff", // generator -> critic
        "agent_start", // critic
        "chunk",
        "agent_end",
        // pass — no handoff back to generator
      ]);
    });
  });

  describe("two iterations — critic revises first, passes second", () => {
    it("runs generator twice and critic twice", async () => {
      const generatorProvider = createMockProviderSequence([
        { chunks: ["draft 1"], usage: { inputTokens: 10, outputTokens: 5 } },
        { chunks: ["draft 2"], usage: { inputTokens: 15, outputTokens: 8 } },
      ]);
      const criticProvider = createMockProviderSequence([
        {
          chunks: ['{"verdict":"revise","feedback":"needs work"}'],
          usage: { inputTokens: 12, outputTokens: 6 },
        },
        {
          chunks: ['{"verdict":"pass","feedback":"good now"}'],
          usage: { inputTokens: 14, outputTokens: 7 },
        },
      ]);

      const generator = new MockAgent({
        name: "generator",
        role: "content generator",
        systemPrompt: "",
        provider: generatorProvider,
      });
      const critic = new MockAgent({
        name: "critic",
        role: "content critic",
        systemPrompt: "",
        provider: criticProvider,
      });

      const loop = new ReflectionLoop(generator, critic);
      const { emitter } = createEmitter();

      const result = await loop.run("write something", emitter);

      expect(result.output).toBe("draft 2");
      expect(result.totalUsage).toEqual({
        inputTokens: 51, // 10 + 12 + 15 + 14
        outputTokens: 26, // 5 + 6 + 8 + 7
      });
    });

    it("emits correct event sequence for two iterations", async () => {
      const generatorProvider = createMockProviderSequence([
        { chunks: ["draft 1"], usage: defaultUsage },
        { chunks: ["draft 2"], usage: defaultUsage },
      ]);
      const criticProvider = createMockProviderSequence([
        {
          chunks: ['{"verdict":"revise","feedback":"needs work"}'],
          usage: defaultUsage,
        },
        {
          chunks: ['{"verdict":"pass","feedback":"good"}'],
          usage: defaultUsage,
        },
      ]);

      const generator = new MockAgent({
        name: "generator",
        role: "content generator",
        systemPrompt: "",
        provider: generatorProvider,
      });
      const critic = new MockAgent({
        name: "critic",
        role: "content critic",
        systemPrompt: "",
        provider: criticProvider,
      });

      const loop = new ReflectionLoop(generator, critic);
      const { emitter, events } = createEmitter();

      await loop.run("write something", emitter);

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toEqual([
        // Iteration 1
        "agent_start", // generator
        "chunk",
        "agent_end",
        "handoff", // generator -> critic
        "agent_start", // critic
        "chunk",
        "agent_end",
        "handoff", // critic -> generator (revise)
        // Iteration 2
        "agent_start", // generator
        "chunk",
        "agent_end",
        "handoff", // generator -> critic
        "agent_start", // critic
        "chunk",
        "agent_end",
        // pass — done
      ]);
    });
  });

  describe("max iterations reached", () => {
    it("generator runs maxIterations times, critic runs maxIterations-1 times", async () => {
      const generatorProvider = createMockProviderSequence([
        { chunks: ["draft 1"], usage: defaultUsage },
        { chunks: ["draft 2"], usage: defaultUsage },
        { chunks: ["draft 3"], usage: defaultUsage },
      ]);
      const criticProvider = createMockProviderSequence([
        {
          chunks: ['{"verdict":"revise","feedback":"needs work"}'],
          usage: defaultUsage,
        },
        {
          chunks: ['{"verdict":"revise","feedback":"still needs work"}'],
          usage: defaultUsage,
        },
      ]);

      const generator = new MockAgent({
        name: "generator",
        role: "content generator",
        systemPrompt: "",
        provider: generatorProvider,
      });
      const critic = new MockAgent({
        name: "critic",
        role: "content critic",
        systemPrompt: "",
        provider: criticProvider,
      });

      const loop = new ReflectionLoop(generator, critic, 3);
      const { emitter } = createEmitter();

      const result = await loop.run("write something", emitter);

      expect(result.output).toBe("draft 3");

      const genChatStream = generatorProvider.chatStream as ReturnType<
        typeof vi.fn
      >;
      const criticChatStream = criticProvider.chatStream as ReturnType<
        typeof vi.fn
      >;
      expect(genChatStream).toHaveBeenCalledTimes(3);
      expect(criticChatStream).toHaveBeenCalledTimes(2);
    });
  });

  describe("handoff events", () => {
    it("has correct from/to fields", async () => {
      const generatorProvider = createMockProviderSequence([
        { chunks: ["draft 1"], usage: defaultUsage },
        { chunks: ["draft 2"], usage: defaultUsage },
      ]);
      const criticProvider = createMockProviderSequence([
        {
          chunks: ['{"verdict":"revise","feedback":"needs work"}'],
          usage: defaultUsage,
        },
        {
          chunks: ['{"verdict":"pass","feedback":"good"}'],
          usage: defaultUsage,
        },
      ]);

      const generator = new MockAgent({
        name: "generator",
        role: "content generator",
        systemPrompt: "",
        provider: generatorProvider,
      });
      const critic = new MockAgent({
        name: "critic",
        role: "content critic",
        systemPrompt: "",
        provider: criticProvider,
      });

      const loop = new ReflectionLoop(generator, critic);
      const { emitter, events } = createEmitter();

      await loop.run("write something", emitter);

      const handoffs = events.filter(
        (e): e is Extract<StreamEvent, { type: "handoff" }> =>
          e.type === "handoff",
      );

      expect(handoffs).toHaveLength(3);
      expect(handoffs[0]).toMatchObject({
        from: "generator",
        to: "critic",
      });
      expect(handoffs[1]).toMatchObject({
        from: "critic",
        to: "generator",
      });
      expect(handoffs[2]).toMatchObject({
        from: "generator",
        to: "critic",
      });
    });
  });

  describe("generator input construction", () => {
    it("receives original input on first iteration", async () => {
      const generatorProvider = createMockProvider(["draft"], defaultUsage);
      const criticProvider = createMockProvider(
        ['{"verdict":"pass","feedback":"good"}'],
        defaultUsage,
      );

      const generator = new MockAgent({
        name: "generator",
        role: "content generator",
        systemPrompt: "",
        provider: generatorProvider,
      });
      const critic = new MockAgent({
        name: "critic",
        role: "content critic",
        systemPrompt: "",
        provider: criticProvider,
      });

      const loop = new ReflectionLoop(generator, critic);
      const { emitter } = createEmitter();

      await loop.run("write about cats", emitter);

      const genChatStream = generatorProvider.chatStream as ReturnType<
        typeof vi.fn
      >;
      const firstCallMessages = genChatStream.mock
        .calls[0][0] as ReadonlyArray<ChatMessage>;
      const userMessage = firstCallMessages[1]?.content as string;
      expect(userMessage).toBe("write about cats");
    });

    it("receives input + previous output + feedback on revision", async () => {
      const generatorProvider = createMockProviderSequence([
        { chunks: ["first draft"], usage: defaultUsage },
        { chunks: ["revised draft"], usage: defaultUsage },
      ]);
      const criticProvider = createMockProviderSequence([
        {
          chunks: ['{"verdict":"revise","feedback":"add more detail"}'],
          usage: defaultUsage,
        },
        {
          chunks: ['{"verdict":"pass","feedback":"good"}'],
          usage: defaultUsage,
        },
      ]);

      const generator = new MockAgent({
        name: "generator",
        role: "content generator",
        systemPrompt: "",
        provider: generatorProvider,
      });
      const critic = new MockAgent({
        name: "critic",
        role: "content critic",
        systemPrompt: "",
        provider: criticProvider,
      });

      const loop = new ReflectionLoop(generator, critic);
      const { emitter } = createEmitter();

      await loop.run("write about cats", emitter);

      const genChatStream = generatorProvider.chatStream as ReturnType<
        typeof vi.fn
      >;
      const secondCallMessages = genChatStream.mock
        .calls[1][0] as ReadonlyArray<ChatMessage>;
      const userMessage = secondCallMessages[1]?.content as string;
      expect(userMessage).toContain("Original request: write about cats");
      expect(userMessage).toContain("Your previous draft:\nfirst draft");
      expect(userMessage).toContain("Reviewer feedback:\nadd more detail");
      expect(userMessage).toContain("Please revise your response");
    });
  });

  describe("critic input construction", () => {
    it("receives input + generator output", async () => {
      const generatorProvider = createMockProvider(
        ["my generated content"],
        defaultUsage,
      );
      const criticProvider = createMockProvider(
        ['{"verdict":"pass","feedback":"good"}'],
        defaultUsage,
      );

      const generator = new MockAgent({
        name: "generator",
        role: "content generator",
        systemPrompt: "",
        provider: generatorProvider,
      });
      const critic = new MockAgent({
        name: "critic",
        role: "content critic",
        systemPrompt: "",
        provider: criticProvider,
      });

      const loop = new ReflectionLoop(generator, critic);
      const { emitter } = createEmitter();

      await loop.run("write about dogs", emitter);

      const criticChatStream = criticProvider.chatStream as ReturnType<
        typeof vi.fn
      >;
      const firstCallMessages = criticChatStream.mock
        .calls[0][0] as ReadonlyArray<ChatMessage>;
      const userMessage = firstCallMessages[1]?.content as string;
      expect(userMessage).toContain("Original request: write about dogs");
      expect(userMessage).toContain(
        "Content to review:\nmy generated content",
      );
    });
  });

  describe("final output", () => {
    it("is the generator's last output", async () => {
      const generatorProvider = createMockProviderSequence([
        { chunks: ["draft 1"], usage: defaultUsage },
        { chunks: ["final draft"], usage: defaultUsage },
      ]);
      const criticProvider = createMockProviderSequence([
        {
          chunks: ['{"verdict":"revise","feedback":"improve"}'],
          usage: defaultUsage,
        },
        {
          chunks: ['{"verdict":"pass","feedback":"good"}'],
          usage: defaultUsage,
        },
      ]);

      const generator = new MockAgent({
        name: "generator",
        role: "content generator",
        systemPrompt: "",
        provider: generatorProvider,
      });
      const critic = new MockAgent({
        name: "critic",
        role: "content critic",
        systemPrompt: "",
        provider: criticProvider,
      });

      const loop = new ReflectionLoop(generator, critic);
      const { emitter } = createEmitter();

      const result = await loop.run("write something", emitter);
      expect(result.output).toBe("final draft");
    });
  });

  describe("token usage aggregation", () => {
    it("aggregates usage across all agent calls", async () => {
      const generatorProvider = createMockProviderSequence([
        { chunks: ["draft"], usage: { inputTokens: 100, outputTokens: 50 } },
      ]);
      const criticProvider = createMockProviderSequence([
        {
          chunks: ['{"verdict":"pass","feedback":"good"}'],
          usage: { inputTokens: 200, outputTokens: 30 },
        },
      ]);

      const generator = new MockAgent({
        name: "generator",
        role: "content generator",
        systemPrompt: "",
        provider: generatorProvider,
      });
      const critic = new MockAgent({
        name: "critic",
        role: "content critic",
        systemPrompt: "",
        provider: criticProvider,
      });

      const loop = new ReflectionLoop(generator, critic);
      const { emitter } = createEmitter();

      const result = await loop.run("write something", emitter);
      expect(result.totalUsage).toEqual({
        inputTokens: 300,
        outputTokens: 80,
      });
    });
  });

  describe("error handling", () => {
    it("propagates error if generator throws", async () => {
      const generatorProvider = {
        lastUsage: defaultUsage,
        chatStream: vi.fn().mockImplementation(async function* () {
          throw new Error("LLM failed");
        }),
        chat: vi.fn(),
      } as unknown as LLMProvider;

      const generator = new MockAgent({
        name: "generator",
        role: "content generator",
        systemPrompt: "",
        provider: generatorProvider,
      });
      const critic = createMockAgent("critic", "content critic", [
        '{"verdict":"pass","feedback":"good"}',
      ]);

      const loop = new ReflectionLoop(generator, critic);
      const { emitter } = createEmitter();

      await expect(loop.run("write something", emitter)).rejects.toThrow(
        "LLM failed",
      );
    });
  });

  describe("custom maxIterations", () => {
    it("respects custom maxIterations value of 2", async () => {
      const generatorProvider = createMockProviderSequence([
        { chunks: ["draft 1"], usage: defaultUsage },
        { chunks: ["draft 2"], usage: defaultUsage },
      ]);
      const criticProvider = createMockProviderSequence([
        {
          chunks: ['{"verdict":"revise","feedback":"needs work"}'],
          usage: defaultUsage,
        },
      ]);

      const generator = new MockAgent({
        name: "generator",
        role: "content generator",
        systemPrompt: "",
        provider: generatorProvider,
      });
      const critic = new MockAgent({
        name: "critic",
        role: "content critic",
        systemPrompt: "",
        provider: criticProvider,
      });

      const loop = new ReflectionLoop(generator, critic, 2);
      const { emitter } = createEmitter();

      const result = await loop.run("write something", emitter);

      expect(result.output).toBe("draft 2");

      const genChatStream = generatorProvider.chatStream as ReturnType<
        typeof vi.fn
      >;
      const criticChatStream = criticProvider.chatStream as ReturnType<
        typeof vi.fn
      >;
      // maxIterations=2: generator called 2 times, critic called 1 time (skipped on final)
      expect(genChatStream).toHaveBeenCalledTimes(2);
      expect(criticChatStream).toHaveBeenCalledTimes(1);
    });
  });
});
