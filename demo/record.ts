#!/usr/bin/env npx tsx
/**
 * Record a demo from a live server run.
 *
 * Usage:
 *   npx tsx demo/record.ts <pattern> "<input>" [--server http://localhost:3001]
 *
 * Example:
 *   npx tsx demo/record.ts reflection "Write a persuasive argument for renewable energy"
 *
 * Outputs JSON to stdout in DemoRecording format (pipe to file):
 *   npx tsx demo/record.ts reflection "..." > demo/recordings/reflection.json
 *
 * Requires the server to be running (npm run dev:server).
 */

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

type StreamEvent =
  | { type: "agent_start"; agent: string; role: string }
  | { type: "chunk"; agent: string; content: string }
  | { type: "handoff"; from: string; to: string; reason: string }
  | { type: "agent_end"; agent: string; durationMs: number; usage: TokenUsage }
  | { type: "error"; agent: string; message: string }
  | { type: "done"; totalUsage: TokenUsage };

interface TimedEvent {
  event: StreamEvent;
  delayMs: number;
}

interface DemoRecording {
  pattern: string;
  description: string;
  turns: Array<{
    userInput: string;
    events: TimedEvent[];
  }>;
}

function parseArgs(): { pattern: string; input: string; server: string } {
  const args = process.argv.slice(2);
  const serverIdx = args.indexOf("--server");
  let server = "http://localhost:3001";
  if (serverIdx !== -1) {
    server = args[serverIdx + 1] ?? server;
    args.splice(serverIdx, 2);
  }
  const pattern = args[0];
  const input = args[1];
  if (!pattern || !input) {
    console.error("Usage: npx tsx demo/record.ts <pattern> \"<input>\" [--server URL]");
    process.exit(1);
  }
  return { pattern, input, server };
}

/** Merge consecutive chunk events from the same agent into larger blocks. */
function mergeChunks(events: TimedEvent[]): TimedEvent[] {
  const merged: TimedEvent[] = [];
  let pendingChunk: { agent: string; content: string; delayMs: number } | null = null;

  for (const te of events) {
    if (te.event.type === "chunk") {
      if (pendingChunk && pendingChunk.agent === te.event.agent) {
        pendingChunk.content += te.event.content;
      } else {
        if (pendingChunk) {
          merged.push({
            event: { type: "chunk", agent: pendingChunk.agent, content: pendingChunk.content },
            delayMs: pendingChunk.delayMs,
          });
        }
        pendingChunk = {
          agent: te.event.agent,
          content: te.event.content,
          delayMs: te.delayMs,
        };
      }
      // Merge chunks until we've accumulated ~200 chars
      if (pendingChunk.content.length >= 200) {
        merged.push({
          event: { type: "chunk", agent: pendingChunk.agent, content: pendingChunk.content },
          delayMs: pendingChunk.delayMs,
        });
        pendingChunk = null;
      }
    } else {
      if (pendingChunk) {
        merged.push({
          event: { type: "chunk", agent: pendingChunk.agent, content: pendingChunk.content },
          delayMs: pendingChunk.delayMs,
        });
        pendingChunk = null;
      }
      merged.push(te);
    }
  }
  if (pendingChunk) {
    merged.push({
      event: { type: "chunk", agent: pendingChunk.agent, content: pendingChunk.content },
      delayMs: pendingChunk.delayMs,
    });
  }
  return merged;
}

async function record(): Promise<void> {
  const { pattern, input, server } = parseArgs();

  // Fetch pattern description
  const listRes = await fetch(`${server}/api/patterns`);
  if (!listRes.ok) {
    console.error(`Failed to fetch patterns: ${listRes.status}`);
    process.exit(1);
  }
  const patterns = (await listRes.json()) as Array<{ name: string; description: string }>;
  const patternInfo = patterns.find((p) => p.name === pattern);
  if (!patternInfo) {
    console.error(`Pattern "${pattern}" not found. Available: ${patterns.map((p) => p.name).join(", ")}`);
    process.exit(1);
  }

  // Run the pattern and capture SSE events with timestamps
  const res = await fetch(`${server}/api/patterns/${pattern}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });

  if (!res.ok || !res.body) {
    console.error(`Failed to run pattern: ${res.status}`);
    process.exit(1);
  }

  const rawEvents: TimedEvent[] = [];
  let lastTimestamp = Date.now();
  const decoder = new TextDecoder();
  let buffer = "";

  for await (const chunk of res.body as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (!json) continue;

      const now = Date.now();
      const delayMs = now - lastTimestamp;
      lastTimestamp = now;

      try {
        const event = JSON.parse(json) as StreamEvent;
        rawEvents.push({ event, delayMs });
      } catch {
        console.error(`Failed to parse event: ${json}`);
      }
    }
  }

  // Merge tiny chunks into larger blocks for smoother replay
  const events = mergeChunks(rawEvents);

  // Normalize delays: cap at reasonable values for demo replay
  for (const te of events) {
    if (te.event.type === "chunk") {
      te.delayMs = 60; // Consistent chunk timing for smooth replay
    } else if (te.event.type === "agent_start") {
      te.delayMs = 200;
    } else if (te.event.type === "agent_end") {
      te.delayMs = 200;
    } else if (te.event.type === "handoff") {
      te.delayMs = 200;
    } else if (te.event.type === "done") {
      te.delayMs = 200;
    }
  }
  // First event should have no delay
  if (events.length > 0 && events[0]) {
    events[0].delayMs = 200;
  }

  const recording: DemoRecording = {
    pattern: patternInfo.name,
    description: patternInfo.description,
    turns: [{ userInput: input, events }],
  };

  console.log(JSON.stringify(recording, null, 2));
}

record().catch((err: unknown) => {
  console.error("Recording failed:", err);
  process.exit(1);
});
