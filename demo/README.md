# Demo App

Static replay player for agent orchestration patterns. No backend needed — pre-recorded SSE event streams are replayed with simulated timing.

**Live:** https://agent-orch-a450e.web.app

## Quick Start

```bash
npm run dev --prefix demo/app   # http://localhost:4000
```

## How Recordings Work

Each pattern has a JSON file in `demo/recordings/` that captures the full SSE event stream:

```
demo/recordings/
├── index.json         # pattern list (name + description)
├── router.json        # one recording per pattern
├── pipeline.json
├── supervisor.json
├── debate.json
├── swarm.json
├── map-reduce.json
└── reflection.json
```

The demo app loads these at runtime and replays events with word-by-word timing to simulate a live stream.

## Adding a New Demo Recording

### Step 1: Capture from a live server run

Start the server, then use the recording script:

```bash
npm run dev:server                   # start server on :3001

npx tsx demo/record.ts <pattern> "<input prompt>" > demo/recordings/<pattern>.json
```

Example:

```bash
npx tsx demo/record.ts reflection "Write a persuasive argument for renewable energy" \
  > demo/recordings/reflection.json
```

The script captures real SSE events with actual LLM-generated content and token usage, then normalizes timing for smooth replay.

### Step 2: Adjust for demo purposes

The raw recording may need editing to make a good demo:

- **Trim long content**: Each agent turn should be ~100-150 words. The orchestration flow is the educational focus, not the full LLM output. Truncate chunk content and add `...` at natural word boundaries.
- **Synthesize additional iterations**: If a pattern supports loops (like reflection) but the LLM passes on the first try, create synthetic intermediate steps that show the full flow. Use realistic content that demonstrates what a revision cycle looks like.
- **Adjust timing**: The script normalizes delays (60ms chunks, 200ms transitions), but tweak if needed.
- **Fix token counts**: If you trim content, update `agent_end.usage` and `done.totalUsage` to stay proportionally realistic. Exact numbers don't matter — just keep them plausible.

### Step 3: Update the index

Add the new pattern to `demo/recordings/index.json`:

```json
{ "name": "my-pattern", "description": "Short description" }
```

### Step 4: Build and deploy

```bash
cd demo/app
npm run build          # copies recordings to dist/ via publicDir
firebase deploy --only hosting
```

## Recording Format

```typescript
interface DemoRecording {
  pattern: string;
  description: string;
  turns: Array<{
    userInput: string;
    events: Array<{
      event: StreamEvent;    // agent_start, chunk, agent_end, handoff, done
      delayMs: number;       // replay delay (60 for chunks, 200 for transitions)
    }>;
  }>;
}
```

Event ordering rules:
- Every agent: `agent_start` → `chunk`* → `agent_end`
- Between agents: `handoff`
- Final event: `done` with aggregated `totalUsage`

## Architecture

The demo app reuses `Chat` and `TraceView` components from the main frontend via path imports (`../../../frontend/src/`). It has its own `PatternSelector` (loads from static JSON instead of API) and `useDemoStream` hook (replays recordings instead of fetching SSE).

## Deploy

Firebase Hosting, project `agent-orch-a450e`:

```bash
cd demo/app
npm run build
firebase deploy --only hosting
```
