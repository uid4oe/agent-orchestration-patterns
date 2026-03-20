# Step 8: Educational Content & Interactive Tutorials

**Agent:** `frontend-builder`
**Branch:** `feat/educational-content`
**Depends on:** Steps 1-7 (all patterns + frontend complete)

## Overview

Add educational content tabs to the right panel. Users can switch between "Trace" (existing execution trace) and "Learn" (pattern documentation, architecture diagrams, best practices, and interactive "Try it" prompts). Each pattern gets dedicated educational sections extracted from its README.

## Demo Scenario

1. User opens app → sees Learn tab with overview grid of all 7 patterns
2. Selects "Router" pattern → Learn tab shows Router documentation with collapsible sections
3. Clicks "Try it: billing route" → input field fills with prompt, user presses Enter
4. Panel auto-switches to Trace tab → watches live execution
5. User switches back to Learn tab to read about tradeoffs

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

### 8.3 TabBar Component (`frontend/src/components/TabBar.tsx`)

- WAI-ARIA: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`
- Keyboard: Arrow Left/Right to switch, Home/End for first/last
- Two tabs with SVG icons: Trace + Learn
- Sliding underline indicator with CSS transition
- Matches existing design system typography

**Commit:** `feat(frontend): add WAI-ARIA compliant TabBar component`

### 8.4 CollapsibleSection Component (`frontend/src/components/CollapsibleSection.tsx`)

- Reusable expand/collapse wrapper (mirrors TraceNodeCard pattern)
- Props: title, icon, defaultOpen, children
- Accessibility: `aria-expanded`, `aria-controls`, keyboard Enter/Space
- animate-fade-in on expand

**Commit:** `feat(frontend): add reusable CollapsibleSection component`

### 8.5 RightPanel + App Integration

- Create `frontend/src/components/RightPanel.tsx`
- Manages activeTab per pattern (Map<string, "trace" | "learn">)
- role="tabpanel" with aria-labelledby
- Modify App.tsx: replace `<TraceView>` with `<RightPanel>`, add `onTryPrompt`

**Commit:** `feat(frontend): add RightPanel with tab switching and per-pattern state`

### 8.6 LearnView — General Overview

- Create `frontend/src/components/LearnView.tsx`
- No pattern selected: grid of all 7 patterns with icons and taglines
- Add `.prose-learn` styles to index.css

**Commit:** `feat(frontend): add LearnView with pattern overview grid`

### 8.7 LearnView — Router Content

- Hero + all collapsible sections for Router pattern
- Establishes the section component structure for all patterns

**Commit:** `feat(frontend): add Router pattern educational content`

### 8.8 LearnView — Pipeline Content

**Commit:** `feat(frontend): add Pipeline pattern educational content`

### 8.9 LearnView — Supervisor Content

**Commit:** `feat(frontend): add Supervisor pattern educational content`

### 8.10 LearnView — Debate Content

**Commit:** `feat(frontend): add Debate pattern educational content`

### 8.11 LearnView — Swarm Content

- Includes comparison table vs Router

**Commit:** `feat(frontend): add Swarm pattern educational content`

### 8.12 LearnView — Map-Reduce Content

- Includes parallelism implementation detail

**Commit:** `feat(frontend): add Map-Reduce pattern educational content`

### 8.13 LearnView — Reflection Content

- Includes critic criteria and conditional exit detail

**Commit:** `feat(frontend): add Reflection pattern educational content`

### 8.14 Suggested Prompts + Auto-Switch

- Create `frontend/src/components/SuggestedPrompts.tsx`
- 2-3 pill buttons per pattern
- Wire onTryPrompt callback through App → RightPanel → LearnView
- Auto-switch to Trace tab when isStreaming becomes true

**Commit:** `feat(frontend): add try-it prompts with auto-switch to trace on run`

### 8.15 TraceView Cleanup

- Remove `PATTERN_DESCRIPTIONS` and `guessPattern()` from TraceView
- Accept `patternName` prop instead

**Commit:** `refactor(frontend): pass pattern name to TraceView, remove guessPattern heuristic`

## Tests

- Existing tests remain unchanged (no behavioral changes to TraceView)
- Manual testing: tab switching, content rendering, Try it flow, auto-switch

## Done When

- [ ] Tabs switch between Trace and Learn
- [ ] Learn tab shows educational content per pattern with collapsible sections
- [ ] General overview grid renders when no pattern selected
- [ ] "Try it" buttons populate input and focus textarea
- [ ] Auto-switch to Trace tab when streaming starts
- [ ] Tab state persists when switching patterns
- [ ] Existing trace functionality unchanged
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
