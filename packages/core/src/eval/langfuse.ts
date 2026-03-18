import type { TokenUsage } from "../stream/types.js";

/**
 * Langfuse integration — optional, no-op when LANGFUSE_SECRET_KEY is not set.
 * Lazy-loads the langfuse package only when configured.
 */

interface LangfuseTrace {
  id: string;
  generation(body: Record<string, unknown>): void;
  score(body: Record<string, unknown>): void;
}

interface LangfuseClient {
  trace(body: { name: string }): LangfuseTrace;
}

let client: LangfuseClient | null = null;
let initialized = false;

async function getClient(): Promise<LangfuseClient | null> {
  if (initialized) return client;
  initialized = true;

  const secretKey = process.env["LANGFUSE_SECRET_KEY"];
  if (!secretKey) return null;

  const publicKey = process.env["LANGFUSE_PUBLIC_KEY"];
  if (!publicKey) return null;

  const { Langfuse } = await import("langfuse");
  client = new Langfuse({
    secretKey,
    publicKey,
  }) as unknown as LangfuseClient;

  return client;
}

export async function createTrace(name: string): Promise<LangfuseTrace | null> {
  const lf = await getClient();
  if (!lf) return null;
  return lf.trace({ name });
}

export interface LogGenerationParams {
  trace: LangfuseTrace | null;
  name: string;
  model: string;
  input: ReadonlyArray<unknown>;
  output: string;
  usage: TokenUsage;
  latencyMs: number;
}

export function logGeneration(params: LogGenerationParams): void {
  if (!params.trace) return;
  params.trace.generation({
    name: params.name,
    model: params.model,
    input: params.input,
    output: params.output,
    usage: {
      input: params.usage.inputTokens,
      output: params.usage.outputTokens,
    },
    startTime: new Date(Date.now() - params.latencyMs),
    endTime: new Date(),
  });
}

export interface ScoreParams {
  trace: LangfuseTrace | null;
  name: string;
  value: number;
  comment?: string;
}

export function score(params: ScoreParams): void {
  if (!params.trace) return;
  params.trace.score({
    name: params.name,
    value: params.value,
    comment: params.comment,
  });
}
