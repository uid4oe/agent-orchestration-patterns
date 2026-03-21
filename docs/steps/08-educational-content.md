# Step 8: Educational Content & Interactive Tutorials

**Agent:** `frontend-builder`
**Branch:** `feat/educational-content`
**Depends on:** Steps 1-7 (all patterns + frontend complete)

## Overview

Add educational content tabs to the right panel. Users can switch between "Trace" (existing execution trace) and "Learn" (pattern documentation, architecture diagrams, best practices, and interactive "Try it" prompts). Each pattern gets dedicated educational sections extracted from its README.

## Demo Scenario

1. User opens app → sees Learn panel (left) with overview grid of all 7 patterns
2. Selects "Router" pattern → Learn panel shows Router documentation with collapsible sections
3. Clicks "Try it: billing route" → input field fills with prompt, user presses Enter
4. AgentFlowSummary appears (right) showing live agent execution trace
5. User reads tradeoffs in Learn panel while viewing agent flow

## Implementation Order

### 8.1 Step Doc + Plan Updates

- Create this step doc at `docs/steps/08-educational-content.md`
- Update `docs/plan.md` — add Step 8 to build order
- Update `CLAUDE.md` — add Step 8 row in implementation table + status

**Commit:** `docs: add step 8 educational content plan and step doc`

### 8.2 PatternContent Data (`frontend/src/data/pattern-content.ts`)

- Define `PatternContent` interface with typed fields:
  - name, icon, tagline, description
  - whenToUse (string[]), architectureMermaid (string)
  - howItWorks (string[]), eventFlow (string)
  - agents (PatternAgent[]), tradeoffs ({pros, cons})
  - suggestedPrompts ({label, prompt}[])
- Populate for all 7 patterns from their README files
- Include 2-3 curated prompts per pattern

**Commit:** `feat(frontend): add structured educational content data for all patterns`

### 8.3 CollapsibleSection Component (`frontend/src/components/CollapsibleSection.tsx`)

- Reusable expand/collapse wrapper (mirrors TraceNodeCard pattern)
- Props: title, icon, defaultOpen, children
- Accessibility: `aria-expanded`, `aria-controls`, keyboard Enter/Space
- animate-fade-in on expand

**Commit:** `feat(frontend): add TabBar, CollapsibleSection, and SuggestedPrompts components`

### 8.4 RightPanel + App Integration

- Create `frontend/src/components/RightPanel.tsx`
- Renders LearnView directly (Learn panel on left, AgentFlowSummary on right in App layout)
- Modify App.tsx: responsive layout — RightPanel (flex-3, learn) | Chat + AgentFlowSummary (flex-2, trace). Wire `onTryPrompt`

**Commit:** `feat(frontend): add RightPanel with Learn tab and educational content`

### 8.5 LearnView — General Overview

- Create `frontend/src/components/LearnView.tsx`
- No pattern selected: grid of all 7 patterns with icons and taglines
- Add `.prose-learn` styles to index.css

**Commit:** `feat(frontend): add LearnView with pattern overview grid`

### 8.6 LearnView — Router Content

- Hero + all collapsible sections for Router pattern
- Establishes the section component structure for all patterns

**Commit:** `feat(frontend): add Router pattern educational content`

### 8.7 LearnView — Pipeline Content

**Commit:** `feat(frontend): add Pipeline pattern educational content`

### 8.8 LearnView — Supervisor Content

**Commit:** `feat(frontend): add Supervisor pattern educational content`

### 8.9 LearnView — Debate Content

**Commit:** `feat(frontend): add Debate pattern educational content`

### 8.10 LearnView — Swarm Content

- Includes comparison table vs Router

**Commit:** `feat(frontend): add Swarm pattern educational content`

### 8.11 LearnView — Map-Reduce Content

- Includes parallelism implementation detail

**Commit:** `feat(frontend): add Map-Reduce pattern educational content`

### 8.12 LearnView — Reflection Content

- Includes critic criteria and conditional exit detail

**Commit:** `feat(frontend): add Reflection pattern educational content`

### 8.13 Suggested Prompts

- Create `frontend/src/components/SuggestedPrompts.tsx`
- 2-3 pill buttons per pattern
- Wire onTryPrompt callback through App → RightPanel → LearnView
- Clicking "Try it" populates the input textarea

**Commit:** `feat(frontend): add try-it prompts with auto-switch to trace on run`

### 8.14 AgentFlowSummary + TraceView Replacement

- Replace TraceView with compact AgentFlowSummary (horizontal node chain)
- Remove `PATTERN_DESCRIPTIONS` and `guessPattern()` heuristic
- AgentFlowSummary shows conditionally when `traceNodes.length > 0`
- Mermaid diagrams render as SVG in LearnView architecture sections

**Commit:** `refactor(frontend): replace TraceView tab with compact AgentFlowSummary`

## Tests

- Existing tests remain unchanged
- Manual testing: content rendering, Try it flow, agent flow visualization

## Done When

- [x] Learn panel shows educational content per pattern with collapsible sections
- [x] General overview grid renders when no pattern selected
- [x] "Try it" buttons populate input and focus textarea
- [x] AgentFlowSummary replaces TraceView with compact live trace
- [x] Mermaid architecture diagrams render as SVG
- [x] Existing streaming functionality unchanged
- [x] `npm run typecheck` passes
- [x] `npm run test` passes
