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
import { DebateArena } from "../debate-arena.js";

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
    return { output, usage };
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

describe("DebateArena", () => {
  describe("transcript accumulation", () => {
    it("builds transcript across rounds so each debater sees prior arguments", async () => {
      const bullProvider = createMockProvider(["Bull argument"], defaultUsage);
      const bearProvider = createMockProvider(["Bear argument"], defaultUsage);
      const judgeProvider = createMockProvider(["Judge verdict"], defaultUsage);

      const bull = new MockAgent({
        name: "bull",
        role: "debater",
        systemPrompt: "",
        provider: bullProvider,
      });
      const bear = new MockAgent({
        name: "bear",
        role: "debater",
        systemPrompt: "",
        provider: bearProvider,
      });
      const judge = new MockAgent({
        name: "judge",
        role: "judge",
        systemPrompt: "",
        provider: judgeProvider,
      });

      const arena = new DebateArena(bull, bear, judge, 2);
      const { emitter } = createEmitter();

      await arena.run("Test thesis", emitter);

      // Bear in round 1 should receive bull's round 1 argument in transcript
      const bearChatStream = bearProvider.chatStream as ReturnType<typeof vi.fn>;
      const bearRound1Call = bearChatStream.mock.calls[0] as ReadonlyArray<ChatMessage>[];
      const bearRound1Input = bearRound1Call[0][1]?.content as string;
      expect(bearRound1Input).toContain("Bull (Round 1)");
      expect(bearRound1Input).toContain("Bull argument");

      // Bull in round 2 should see both round 1 arguments
      const bullChatStream = bullProvider.chatStream as ReturnType<typeof vi.fn>;
      const bullRound2Call = bullChatStream.mock.calls[1] as ReadonlyArray<ChatMessage>[];
      const bullRound2Input = bullRound2Call[0][1]?.content as string;
      expect(bullRound2Input).toContain("Bull (Round 1)");
      expect(bullRound2Input).toContain("Bear (Round 1)");
    });

    it("judge receives the full transcript from all rounds", async () => {
      const judgeProvider = createMockProvider(["Final verdict"], defaultUsage);

      const bull = createMockAgent("bull", "debater", ["For!"]);
      const bear = createMockAgent("bear", "debater", ["Against!"]);
      const judge = new MockAgent({
        name: "judge",
        role: "judge",
        systemPrompt: "",
        provider: judgeProvider,
      });

      const arena = new DebateArena(bull, bear, judge, 2);
      const { emitter } = createEmitter();

      await arena.run("Thesis X", emitter);

      const judgeChatStream = judgeProvider.chatStream as ReturnType<typeof vi.fn>;
      const judgeCall = judgeChatStream.mock.calls[0] as ReadonlyArray<ChatMessage>[];
      const judgeInput = judgeCall[0][1]?.content as string;
      expect(judgeInput).toContain("Bull (Round 1)");
      expect(judgeInput).toContain("Bear (Round 1)");
      expect(judgeInput).toContain("Bull (Round 2)");
      expect(judgeInput).toContain("Bear (Round 2)");
      expect(judgeInput).toContain("Evaluate and declare a winner");
    });
  });

  describe("round progression and handoffs", () => {
    it("emits correct sequence of events for 2 rounds", async () => {
      const bull = createMockAgent("bull", "debater", ["arg"]);
      const bear = createMockAgent("bear", "debater", ["counter"]);
      const judge = createMockAgent("judge", "judge", ["verdict"]);

      const arena = new DebateArena(bull, bear, judge, 2);
      const { emitter, events } = createEmitter();

      await arena.run("Thesis", emitter);

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toEqual([
        // Round 1: bull
        "agent_start",
        "chunk",
        "agent_end",
        // handoff bull -> bear
        "handoff",
        // Round 1: bear
        "agent_start",
        "chunk",
        "agent_end",
        // handoff bear -> bull (next round)
        "handoff",
        // Round 2: bull
        "agent_start",
        "chunk",
        "agent_end",
        // handoff bull -> bear
        "handoff",
        // Round 2: bear
        "agent_start",
        "chunk",
        "agent_end",
        // handoff bear -> judge
        "handoff",
        // Judge
        "agent_start",
        "chunk",
        "agent_end",
      ]);
    });

    it("emits handoff events with correct from/to/reason", async () => {
      const bull = createMockAgent("bull", "debater", ["arg"]);
      const bear = createMockAgent("bear", "debater", ["counter"]);
      const judge = createMockAgent("judge", "judge", ["verdict"]);

      const arena = new DebateArena(bull, bear, judge, 2);
      const { emitter, events } = createEmitter();

      await arena.run("Thesis", emitter);

      const handoffs = events.filter(
        (e): e is Extract<StreamEvent, { type: "handoff" }> =>
          e.type === "handoff",
      );

      expect(handoffs).toEqual([
        { type: "handoff", from: "bull", to: "bear", reason: "round 1" },
        { type: "handoff", from: "bear", to: "bull", reason: "next round" },
        { type: "handoff", from: "bull", to: "bear", reason: "round 2" },
        { type: "handoff", from: "bear", to: "judge", reason: "debate complete" },
      ]);
    });

    it("does not emit bear-to-bull handoff on the last round", async () => {
      const bull = createMockAgent("bull", "debater", ["arg"]);
      const bear = createMockAgent("bear", "debater", ["counter"]);
      const judge = createMockAgent("judge", "judge", ["verdict"]);

      const arena = new DebateArena(bull, bear, judge, 1);
      const { emitter, events } = createEmitter();

      await arena.run("Thesis", emitter);

      const handoffs = events.filter(
        (e): e is Extract<StreamEvent, { type: "handoff" }> =>
          e.type === "handoff",
      );

      expect(handoffs).toEqual([
        { type: "handoff", from: "bull", to: "bear", reason: "round 1" },
        { type: "handoff", from: "bear", to: "judge", reason: "debate complete" },
      ]);
    });
  });

  describe("result", () => {
    it("returns judge output and aggregated token usage", async () => {
      const bull = createMockAgent("bull", "debater", ["For"]);
      const bear = createMockAgent("bear", "debater", ["Against"]);
      const judge = createMockAgent("judge", "judge", ["Winner: Bull"]);

      const arena = new DebateArena(bull, bear, judge, 2);
      const { emitter } = createEmitter();

      const result = await arena.run("Thesis", emitter);

      expect(result.output).toBe("Winner: Bull");
      // 5 agent runs (bull x2, bear x2, judge x1) each with 10 input, 5 output
      expect(result.totalUsage).toEqual({
        inputTokens: 50,
        outputTokens: 25,
      });
    });
  });
});
