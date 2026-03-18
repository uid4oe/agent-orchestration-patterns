# Commit Guidelines

## Commit Sizing

Commits should be **atomic and reviewable** — small enough to understand in one read, large enough to be a coherent unit of work.

### Rules

1. **One logical change per commit.** A "logical change" is a single concern: one type definition, one module, one route, one component.

2. **Parent and child components go in separate commits.** If you build `Chat.tsx` and its child `MessageBubble.tsx`, commit `MessageBubble.tsx` first, then `Chat.tsx` in the next commit. Bottom-up: dependencies before dependents.

3. **Tests are always committed separately.** Never bundle test files with implementation files. The test commit should follow immediately after the implementation it tests.

4. **Types/interfaces go in their own commit** when they define a shared contract (e.g., `StreamEvent`, `PatternRunner`, `LLMProvider`). If a type is only used in one file, it can go with that file.

5. **Config files can be grouped.** `package.json`, `tsconfig.json`, `.env.example`, and similar config for the same workspace can go in one commit.

6. **Refactors are separate from features.** If you need to restructure existing code to support a new feature, commit the refactor first, then the feature.

### Commit Message Format

Use **conventional commit** prefixes:

```
<type>: <imperative description>

<optional body: why this change was made, any non-obvious decisions>
```

**Types:**
- `feat:` — new feature or functionality
- `fix:` — bug fix
- `refactor:` — code restructuring without behavior change
- `test:` — adding or updating tests
- `chore:` — config, tooling, deps, CI, build
- `docs:` — documentation only

**Examples:**
- `feat: add StreamEvent and TokenUsage types`
- `feat: implement OpenAI-compatible LLM provider with streaming`
- `feat: add billing specialist agent for router pattern`
- `test: add tests for router intent classification`
- `chore: configure Vite with React plugin and Tailwind`
- `fix: handle missing token usage in Ollama responses`
- `docs: add router pattern README with mermaid diagram`
- `refactor: extract streaming logic from BaseAgent into StreamEmitter`

### Bad Commits (avoid these)

- `Update files` — too vague, no type prefix
- `feat: add router pattern` — too big if it includes agent + specialists + orchestrator + tests
- `fix stuff` — no context
- A commit with both `Chat.tsx` and `useStream.ts` and `TraceView.tsx` — three separate concerns
- Missing type prefix — every commit MUST have a type

### Good Commit Sequence (example: Router pattern)

A module can span 2-3 tightly coupled files. Don't micro-commit every single file.

```
1. feat: add router specialist agents (billing, technical, general)
2. feat: add router agent with intent classification
3. feat: add router pattern orchestrator and PatternRunner export
4. test: add tests for router pattern
5. chore: add router eval dataset
```

### Good Commit Sequence (example: Core library)

```
1. feat: add LLM types and stream event types
2. feat: implement OpenAI-compatible LLM provider with streaming
3. feat: implement BaseAgent with event emission
4. feat: add Langfuse integration and eval utilities
5. feat: add core barrel exports
6. test: add tests for core library
```

## Git Best Practices

### Branching
- Work on feature branches, not main
- Branch naming: `<type>/<short-description>` — e.g., `feat/router-pattern`, `fix/sse-connection-close`
- Keep branches short-lived — merge and delete promptly

### History
- Never force push — treat history as append-only
- Never rewrite published commits
- If you need to undo, use `git revert` not `git reset --hard`
- Don't amend commits that have been pushed

### Before Committing
- Run `npm run typecheck` — no type errors
- Review the diff yourself — no debug logs, no TODO comments, no unrelated changes
- Stage specific files, not `git add .` — avoid accidentally committing secrets or build artifacts

### Pull Requests
- One logical feature/fix per PR
- PR title follows conventional commits: `feat: add router pattern`
- PR description: what changed, why, how to test
- Request review from `code-reviewer` agent before merging

### When in Doubt

Ask: "If I had to revert this commit, would it undo exactly one thing?" If yes, the commit is the right size.
