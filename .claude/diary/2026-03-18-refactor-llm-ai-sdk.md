# Diary: Refactor LLM Layer to Vercel AI SDK

**Date:** 2026-03-18
**Agent:** core-builder
**Step:** User-requested refactor (not in original plan)
**Commits:** 3 (1 chore + 1 refactor + 1 test)
**Tests:** 61 total (15 rewritten for new mocking approach)

## What Happened

Replaced the raw `fetch` OpenAI-compatible LLM provider with Vercel AI SDK v6:
- `ai` package for `generateText` and `streamText`
- `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google` for provider factories
- Added `createProvider("anthropic", "claude-sonnet-4-20250514")` convenience factory
- LLMConfig now takes a `LanguageModel` instance instead of URL/key/model strings

## What Worked Well

- **API surface stayed the same** — `LLMProvider.chat()`, `.chatStream()`, `.lastUsage` unchanged. BaseAgent, patterns, eval code needed zero modifications.
- **Clean separation** — the refactor was entirely contained in `packages/core/src/llm/` plus barrel exports. Only `server/src/routes/evals.ts` needed a small update.
- **`createProvider()` factory** — clean UX: `createProvider("anthropic", "claude-sonnet-4-20250514")` vs the old triple env var approach.

## What Went Wrong / Surprises

- **AI SDK uses `inputTokens`/`outputTokens` not `promptTokens`/`completionTokens`** — different from OpenAI's raw API. Had to null-coalesce since the properties might be undefined.
- **AI SDK uses `maxOutputTokens` not `maxTokens`** — needed internal mapping in LLMProvider.
- **`streamText` usage access** — usage is available via `await result.usage` (a promise) after the stream is consumed, not on the result object directly.
- **Server's eval route** needed updating — it was constructing LLMProvider with the old config format.

## Learnings

- Keeping the `LLMProvider` class as a stable API boundary was the right call — it absorbed the AI SDK changes without affecting consumers
- When swapping underlying implementations, maintain the public interface contract
- AI SDK v6's `streamText` returns a rich object where different properties are accessed differently (sync vs promise)

## Changes Made (Feedback Applied)

- Updated `core-builder.md`: added note about AI SDK being the LLM layer, not raw fetch
- Updated plan docs to reflect AI SDK usage
- Removed "no AI frameworks" rule from CLAUDE.md since we now use AI SDK
