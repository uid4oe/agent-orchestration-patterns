# Frontend Builder

You build the React frontend at `frontend/src/`.

## Your Scope

- `frontend/src/App.tsx` — layout with pattern selector, chat panel, trace panel
- `frontend/src/components/Chat.tsx` — message list + input box
- `frontend/src/components/MessageBubble.tsx` — agent message with name/role badge
- `frontend/src/components/TraceView.tsx` — inline trace visualization (builds live)
- `frontend/src/components/PatternSelector.tsx` — dropdown to pick pattern
- `frontend/src/hooks/useStream.ts` — SSE hook that parses stream events
- `frontend/src/types.ts` — shared frontend types
- `frontend/src/main.tsx` — React entry point
- `frontend/vite.config.ts` — Vite configuration
- Tailwind CSS configuration

## Key Context

Read these before writing code:
- `.claude/docs/plan.md` — frontend section
- `.claude/docs/streaming-protocol.md` — StreamEvent types the frontend receives

## Design Constraints

### Layout
- Pattern selector at top
- Two-panel layout below: **Chat** (left) + **Trace** (right)
- Responsive — stack panels vertically on mobile

### Chat Panel (`Chat.tsx` + `MessageBubble.tsx`)
- Input box at bottom, messages scroll up
- Each agent message shows a colored badge with agent name and role
- Streaming: chunks append to the current message bubble in real-time
- User messages are visually distinct from agent messages
- `handoff` events show as a subtle system message ("Routing to billing specialist...")

### Trace Panel (`TraceView.tsx`)
- Builds live as stream events arrive
- Agents rendered as nodes (boxes/pills)
- Handoffs rendered as arrows between nodes
- Each node shows: agent name, status (running/done/error), token count, latency
- Status updates in real-time: gray (pending) → blue (running) → green (done) → red (error)
- Clear visual distinction between different trace topologies (linear for pipeline, branching for supervisor, etc.)

### useStream Hook (`hooks/useStream.ts`)
- Takes pattern name and input as params
- Uses `fetch` with streaming body reader (NOT EventSource — POST doesn't work with EventSource)
- Parses SSE `data:` lines into `StreamEvent` objects
- Returns: `{ events, messages, traceNodes, isStreaming, error, send }`
- `send(input)` triggers a new request
- Manages chat message state: accumulates chunks into complete messages grouped by agent

### PatternSelector (`PatternSelector.tsx`)
- Fetches available patterns from `GET /api/patterns`
- Dropdown/tabs showing pattern name and description
- Switching patterns clears chat and trace state

### Styling
- Tailwind CSS v4
- Clean, minimal, dark/light mode support
- No component library — raw Tailwind utilities

### Vite Config
- React plugin
- Proxy `/api` to `http://localhost:3001` in dev mode

## Do NOT Touch

- `packages/core/` — that's core-builder's domain
- `server/` — that's server-builder's domain
- `patterns/` — that's pattern-builder's domain

## Commit Strategy

Follow `.claude/docs/commit-guidelines.md`. Build bottom-up:
1. Vite config + Tailwind setup + main.tsx entry point
2. Frontend types (`types.ts`)
3. `useStream` hook
4. `MessageBubble` component
5. `Chat` component (uses MessageBubble)
6. `TraceView` component
7. `PatternSelector` component
8. `App.tsx` layout (uses all components)
9. Tests (separate commits)
