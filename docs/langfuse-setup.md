# Langfuse Setup for Eval Dashboard

Langfuse is an open-source observability platform for LLM applications. This project uses it to track eval runs, log generations, and visualize scores across patterns and models.

## 1. Start Langfuse via Docker Compose

Langfuse runs alongside the server and frontend using the `langfuse` profile:

```bash
docker compose --profile langfuse up
```

This starts:
- **Server** on `http://localhost:3001`
- **Frontend** on `http://localhost:3000`
- **Langfuse** on `http://localhost:3002`

If you only want Langfuse (e.g., server running separately via `npm run dev`):

```bash
docker compose --profile langfuse up langfuse
```

## 2. Create an Account and API Keys

1. Open `http://localhost:3002` in your browser
2. Create a new account (first user becomes admin)
3. Create a new project (e.g., "agent-patterns")
4. Go to **Settings > API Keys**
5. Click **Create API Key**
6. Copy the **Secret Key** (`sk-lf-...`) and **Public Key** (`pk-lf-...`)

## 3. Configure Environment Variables

Add the keys to your `.env` file (copy from `.env.example` if needed):

```bash
LANGFUSE_SECRET_KEY=sk-lf-your-secret-key
LANGFUSE_PUBLIC_KEY=pk-lf-your-public-key
LANGFUSE_BASEURL=http://localhost:3002
```

The eval system automatically detects these variables. When `LANGFUSE_SECRET_KEY` is set, all eval runs push traces and scores to Langfuse. When unset, evals still work but results are only returned in the API response.

## 4. Run an Eval

Send a POST request to run an eval for any pattern:

```bash
curl -X POST http://localhost:3001/api/evals/router/run \
  -H "Content-Type: application/json" \
  -d '{"criteria": ["relevance", "accuracy"]}'
```

The endpoint automatically loads the dataset from `patterns/{name}/src/eval/dataset.json`. You can override with a custom path:

```bash
curl -X POST http://localhost:3001/api/evals/router/run \
  -H "Content-Type: application/json" \
  -d '{"datasetPath": "/path/to/custom/dataset.json", "criteria": ["relevance"]}'
```

The response includes per-item scores and averages:

```json
{
  "results": [
    {
      "input": "My invoice shows the wrong amount",
      "output": "...",
      "scores": {
        "relevance": { "score": 0.9, "reasoning": "..." }
      }
    }
  ],
  "averages": {
    "relevance": 0.85
  }
}
```

## 5. View Results in the Dashboard

After running evals, open Langfuse at `http://localhost:3002`:

### Traces

Navigate to **Traces** to see each eval run. Each trace is named `eval:{pattern-name}` and contains:

- **Generations** for each dataset item (showing the input prompt and model output)
- **Scores** for each criterion on each item (e.g., relevance: 0.9)
- **Average scores** as top-level trace scores (e.g., `avg:relevance: 0.85`)

### Comparing Runs

To compare eval runs across different models or configurations:

1. Change `EVAL_MODEL` in your `.env` (e.g., from `gpt-4o-mini` to `gpt-4o`)
2. Run the eval again
3. In Langfuse, filter traces by name and compare scores side-by-side

### Score Dashboard

The **Scores** tab provides aggregate views:
- Score distributions per criterion
- Trends over time as you iterate on prompts or models
- Drill-down into individual items that scored low
