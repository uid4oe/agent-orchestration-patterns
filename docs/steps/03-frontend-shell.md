# Step 3: Frontend Shell

**Agent:** `frontend-builder`
**Branch:** `feat/frontend-shell`
**Depends on:** Step 2 (server — needs API to connect to)
**Blocks:** nothing (patterns can be built in parallel)

## Overview

Build the React frontend with Vite, Tailwind, and the core components. After this step, the UI is functional — it just needs patterns on the server to produce real output.

## Implementation Order

### 3.1 Vite + Tailwind Setup

- `vite.config.ts` with React plugin, API proxy to `:3001`
- Tailwind v4 setup
- `index.html` entry point
- `main.tsx` rendering `<App />`

**Commit:** `chore: configure Vite with React plugin, Tailwind, and API proxy`

### 3.2 Frontend Types (`types.ts`)

Mirror the StreamEvent types from core (frontend can't import from core directly — it communicates via API):

```typescript
interface TokenUsage { inputTokens: number; outputTokens: number }

type StreamEvent =
  | { type: "agent_start"; agent: string; role: string }
  | { type: "chunk"; agent: string; content: string }
  | { type: "handoff"; from: string; to: string; reason: string }
  | { type: "agent_end"; agent: string; durationMs: number; usage: TokenUsage }
  | { type: "error"; agent: string; message: string }
  | { type: "done"; totalUsage: TokenUsage }

interface PatternInfo { name: string; description: string }

interface AgentMessage {
  agent: string;
  role: string;
  content: string;
  usage?: TokenUsage;
  durationMs?: number;
}

interface TraceNode {
  agent: string;
  role: string;
  status: "running" | "done" | "error";
  usage?: TokenUsage;
  durationMs?: number;
}

interface TraceEdge {
  from: string;
  to: string;
  reason: string;
}
```

**Commit:** `feat: add frontend types for stream events and trace state`

### 3.3 useStream Hook (`hooks/useStream.ts`)

Core streaming hook:

- `useStream()` returns `{ messages, traceNodes, traceEdges, isStreaming, error, send, reset }`
- `send(pattern, input)`:
  - POST to `/api/patterns/${pattern}/run` with `{ input }`
  - Read response body as stream (ReadableStream + TextDecoder)
  - Parse SSE lines: split on `\n\n`, extract `data:` prefix, JSON.parse
  - Dispatch events to state:
    - `agent_start` → add new TraceNode (status: running), start new AgentMessage
    - `chunk` → append to current AgentMessage content
    - `handoff` → add TraceEdge
    - `agent_end` → update TraceNode (status: done, usage, duration), finalize AgentMessage
    - `error` → update TraceNode (status: error), set error state
    - `done` → set isStreaming false
- `reset()` clears all state

**Commit:** `feat: implement useStream SSE hook with state management`

### 3.4 MessageBubble Component (`components/MessageBubble.tsx`)

- Renders a single agent message
- Shows colored badge with agent name and role
- Content renders with basic markdown (or just whitespace-pre for v1)
- Streaming indicator (pulsing dot) when message is still accumulating

**Commit:** `feat: add MessageBubble component with agent badge`

### 3.5 Chat Component (`components/Chat.tsx`)

- Scrollable message list using MessageBubble
- Input box at bottom with send button
- Shows user message immediately, then streams agent responses
- `handoff` events render as subtle system messages
- Auto-scrolls to bottom on new messages

**Commit:** `feat: add Chat component with streaming message display`

### 3.6 TraceView Component (`components/TraceView.tsx`)

- Renders trace nodes and edges as a simple flow diagram
- Each node: rounded box with agent name, status indicator (colored dot), token count, latency
- Edges: arrows between nodes with reason label
- Builds progressively — nodes appear as `agent_start` events arrive
- Status colors: blue=running, green=done, red=error
- Layouts:
  - Vertical flow for pipeline/router (simple top-down)
  - Can be simple column layout for v1, fancy graph later

**Commit:** `feat: add TraceView component with live trace visualization`

### 3.7 PatternSelector Component (`components/PatternSelector.tsx`)

- Fetches patterns from `GET /api/patterns` on mount
- Renders as tabs or dropdown
- Shows pattern name + description
- Switching clears chat and trace state (calls `reset()`)

**Commit:** `feat: add PatternSelector with pattern switching`

### 3.8 App Layout (`App.tsx`)

- PatternSelector at top
- Two-panel layout: Chat (left, ~60%) + TraceView (right, ~40%)
- Responsive: stack vertically on mobile
- Wires useStream to both panels

**Commit:** `feat: add App layout with chat and trace panels`

## Tests

- `test: add tests for useStream event parsing`
- `test: add tests for message accumulation from chunks`

## Done When

- [ ] `npm run dev:frontend` starts Vite dev server
- [ ] UI renders with pattern selector, empty chat, empty trace
- [ ] Can type a message and send (will show error until patterns exist on server)
- [ ] Layout is responsive
