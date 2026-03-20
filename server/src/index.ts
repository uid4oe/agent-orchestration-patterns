import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });
import express from "express";
import cors from "cors";
import type { PatternRunner, ProviderConfig } from "@agent-patterns/core";
import { resolveProviderFromEnv } from "@agent-patterns/core";
import { createPatternRoutes } from "./routes/patterns.js";
import type { PatternEntry } from "./routes/patterns.js";
import { createEvalRoutes } from "./routes/evals.js";
import { requestLogger } from "./middleware/request-logger.js";
import { createRateLimiter } from "./middleware/rate-limiter.js";

const PORT = Number(process.env["SERVER_PORT"] ?? 3001);

interface PatternModule {
  readonly name: string;
  readonly description: string;
  readonly createRunner: (config: ProviderConfig) => PatternRunner;
}

const PATTERN_PACKAGES = [
  "@agent-patterns/router",
  "@agent-patterns/pipeline",
  "@agent-patterns/supervisor",
  "@agent-patterns/debate",
  "@agent-patterns/swarm",
  "@agent-patterns/map-reduce",
  "@agent-patterns/reflection",
] as const;

async function loadPatterns(config: ProviderConfig): Promise<Map<string, PatternEntry>> {
  const patterns = new Map<string, PatternEntry>();

  for (const pkg of PATTERN_PACKAGES) {
    try {
      const mod = (await import(pkg)) as PatternModule;
      patterns.set(mod.name, {
        name: mod.name,
        description: mod.description,
        runner: mod.createRunner(config),
      });
      console.log(`  Loaded pattern: ${mod.name}`);
    } catch {
      console.log(`  Pattern not available: ${pkg}`);
    }
  }

  return patterns;
}

async function main(): Promise<void> {
  const app = express();

  app.use(cors({ origin: process.env["FRONTEND_URL"] ?? "http://localhost:3000" }));
  app.use(express.json());
  app.use(requestLogger);

  const providerConfig = resolveProviderFromEnv();
  console.log(`LLM_PROVIDER=${providerConfig.providerName}, LLM_MODEL=${providerConfig.modelName}`);
  console.log("Loading patterns...");
  const patterns = await loadPatterns(providerConfig);

  const rateLimiter = createRateLimiter(20, 60_000);
  app.use("/api/patterns/:name/run", rateLimiter);
  app.use("/api/evals/:name/run", rateLimiter);

  app.use("/api/patterns", createPatternRoutes(patterns));
  app.use("/api/evals", createEvalRoutes(patterns));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log(`Registered patterns: ${patterns.size}`);
  });
}

main().catch((err: unknown) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
