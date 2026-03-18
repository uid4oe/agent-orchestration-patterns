# Step 5: Eval System

**Agent:** `core-builder` + `server-builder`
**Branch:** `feat/eval-system`
**Depends on:** Steps 1-2 + at least one pattern (4a-4d)

## Overview

Wire together the eval components built in Step 1 (scorer, dataset runner) with the server endpoint from Step 2 and the pattern datasets from Steps 4a-4d.

## Implementation

### 5.1 Wire Eval Endpoint

Complete `server/src/routes/evals.ts`:
- Load dataset from `patterns/<name>/src/eval/dataset.json`
- For each item: run pattern, collect output, score with LLM-as-judge
- Push results to Langfuse (if configured)
- Return JSON summary: scores per item, averages, total cost

**Commit:** `feat: wire eval endpoint with dataset loading and scoring`

### 5.2 Langfuse Dashboard Setup

- Document how to create Langfuse API keys after first docker compose up
- Add eval scores to Langfuse traces
- Verify scores appear in Langfuse dashboard

**Commit:** `docs: add Langfuse setup instructions for eval dashboard`

## Done When

- [ ] `POST /api/evals/router/run` executes all dataset items and returns scores
- [ ] Langfuse shows traces with generation logs and eval scores
- [ ] Can compare runs across different models
