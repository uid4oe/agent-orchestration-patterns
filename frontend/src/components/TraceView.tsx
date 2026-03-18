import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { TokenUsage, TraceEdge, TraceNode } from "../types.ts";
import { AgentAvatar } from "./AgentAvatar.tsx";
import { StatusBadge } from "./StatusBadge.tsx";

/* ── Pattern descriptions ──────────────────────────────────── */

const PATTERN_DESCRIPTIONS: Record<string, string> = {
  router: "Routes input to the best specialist agent",
  pipeline: "Processes input through a chain of agents sequentially",
  supervisor: "A supervisor delegates and reviews agent work",
  debate: "Agents debate and a judge picks the best answer",
};

function guessPattern(nodes: TraceNode[]): string | null {
  for (const node of nodes) {
    const role = node.role.toLowerCase();
    if (role === "classifier" || role === "router") return "router";
    if (role === "supervisor") return "supervisor";
    if (role === "debater") return "debate";
    if (role === "judge") return "debate";
  }
  if (nodes.length >= 2) return "pipeline";
  return null;
}

/* ── Helpers ───────────────────────────────────────────────── */

function formatTokens(usage: TokenUsage): string {
  const total = usage.inputTokens + usage.outputTokens;
  return `${total} tok`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/* ── Elapsed Timer (live tick for running nodes) ───────────── */

interface ElapsedTimerProps {
  startedAt: number;
}

function ElapsedTimer({ startedAt }: ElapsedTimerProps) {
  const [elapsed, setElapsed] = useState(() => Date.now() - startedAt);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 100);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startedAt]);

  const seconds = (elapsed / 1000).toFixed(1);
  return (
    <span className="font-mono text-blue-600 tabular-nums">
      {seconds}s&hellip;
    </span>
  );
}

/* ── Token Proportion Bar ──────────────────────────────────── */

interface TokenBarProps {
  usage: TokenUsage;
  height?: string;
}

function TokenBar({ usage, height = "h-1.5" }: TokenBarProps) {
  const total = usage.inputTokens + usage.outputTokens;
  if (total === 0) return null;

  const inputPct = (usage.inputTokens / total) * 100;
  const outputPct = (usage.outputTokens / total) * 100;

  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className={`flex-1 ${height} rounded-full bg-[var(--color-surface-tertiary)] overflow-hidden flex`}>
        <div
          className="h-full bg-blue-400 transition-all duration-500"
          style={{ width: `${inputPct}%` }}
          title={`Input: ${formatNumber(usage.inputTokens)} (${inputPct.toFixed(0)}%)`}
        />
        <div
          className="h-full bg-indigo-600 transition-all duration-500"
          style={{ width: `${outputPct}%` }}
          title={`Output: ${formatNumber(usage.outputTokens)} (${outputPct.toFixed(0)}%)`}
        />
      </div>
    </div>
  );
}

/* ── Status Stripe Color ───────────────────────────────────── */

const STATUS_STRIPE: Record<TraceNode["status"], string> = {
  running: "bg-blue-500 animate-status-pulse",
  done: "bg-emerald-500",
  error: "bg-red-500",
};

const STATUS_BORDER: Record<TraceNode["status"], string> = {
  running: "border-blue-200",
  done: "border-emerald-200",
  error: "border-red-200",
};

/* ── Trace Node Card ───────────────────────────────────────── */

/** Stable timestamp per node so the timer doesn't reset on re-render */
const nodeTimestamps = new Map<string, number>();

function getNodeTimestamp(key: string): number {
  const existing = nodeTimestamps.get(key);
  if (existing !== undefined) return existing;
  const now = Date.now();
  nodeTimestamps.set(key, now);
  return now;
}

interface TraceNodeCardProps {
  node: TraceNode;
  index: number;
  step: number;
}

function TraceNodeCard({ node, index, step }: TraceNodeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const borderColor = STATUS_BORDER[node.status];
  const stripeColor = STATUS_STRIPE[node.status];

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const maxDuration = 5000; // for progress bar scaling
  const durationPct =
    node.durationMs !== undefined
      ? Math.min((node.durationMs / maxDuration) * 100, 100)
      : 0;

  const nodeKey = `${node.agent}-${index}`;

  return (
    <div
      className={`animate-node-in rounded-xl border ${borderColor} glass-card transition-all duration-200 hover:shadow-md cursor-pointer overflow-hidden`}
      style={{ animationDelay: `${index * 80}ms` }}
      onClick={toggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
    >
      <div className="flex">
        {/* Status stripe on left edge */}
        <div className={`w-1 shrink-0 ${stripeColor} rounded-l-xl`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 px-3 py-3">
            {/* Step number */}
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-surface-tertiary)] shrink-0">
              <span className="text-[10px] font-bold text-[var(--color-text-tertiary)] tabular-nums">
                {step}
              </span>
            </div>

            <AgentAvatar name={node.agent} role={node.role} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                  {node.agent}
                </span>
                <span className="text-xs text-[var(--color-text-tertiary)] truncate">
                  / {node.role}
                </span>
              </div>
              {/* Summary row: timing + token bar */}
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--color-text-tertiary)]">
                {node.status === "running" && (
                  <ElapsedTimer startedAt={getNodeTimestamp(nodeKey)} />
                )}
                {node.status !== "running" && node.durationMs !== undefined && (
                  <span className="font-mono">{formatDuration(node.durationMs)}</span>
                )}
                {node.usage && <span>{formatTokens(node.usage)}</span>}
              </div>
              {/* Inline token proportion bar in summary */}
              {node.usage && (
                <div className="mt-1">
                  <TokenBar usage={node.usage} height="h-1" />
                </div>
              )}
            </div>
            <StatusBadge status={node.status} />
            <svg
              className={`h-4 w-4 text-[var(--color-text-tertiary)] transition-transform duration-200 shrink-0 ${
                expanded ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Expanded detail */}
          {expanded && (
            <div className="border-t border-[var(--color-border-light)] px-3.5 py-3 animate-fade-in">
              {/* Timing bar */}
              {node.durationMs !== undefined && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)] mb-1">
                    <span>Duration</span>
                    <span className="font-mono">{formatDuration(node.durationMs)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--color-surface-tertiary)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
                      style={{ width: `${durationPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Token breakdown with proportion bar */}
              {node.usage && (
                <div className="space-y-1.5">
                  {/* Visual bar */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-[10px] text-[var(--color-text-tertiary)] mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-sm bg-blue-400" />
                        <span>Input</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>Output</span>
                        <span className="inline-block w-2 h-2 rounded-sm bg-indigo-600" />
                      </div>
                    </div>
                    <TokenBar usage={node.usage} height="h-2" />
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--color-text-tertiary)]">Input tokens</span>
                    <span className="font-mono text-[var(--color-text-secondary)]">
                      {formatNumber(node.usage.inputTokens)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--color-text-tertiary)]">Output tokens</span>
                    <span className="font-mono text-[var(--color-text-secondary)]">
                      {formatNumber(node.usage.outputTokens)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[var(--color-border-light)]">
                    <span className="text-[var(--color-text-secondary)] font-medium">Total tokens</span>
                    <span className="font-mono text-[var(--color-text-primary)] font-medium">
                      {formatNumber(node.usage.inputTokens + node.usage.outputTokens)}
                    </span>
                  </div>
                </div>
              )}

              {!node.usage && !node.durationMs && (
                <p className="text-xs text-[var(--color-text-tertiary)] italic">
                  Details will appear when the agent finishes.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Trace Edge Arrow ──────────────────────────────────────── */

interface TraceEdgeArrowProps {
  edge: TraceEdge;
  index: number;
}

function TraceEdgeArrow({ edge, index }: TraceEdgeArrowProps) {
  return (
    <div
      className="animate-edge-grow flex flex-col items-center gap-0 py-0.5"
      style={{ animationDelay: `${index * 80 + 40}ms` }}
    >
      {/* Gradient connector line */}
      <div
        className="w-px h-3"
        style={{
          background: "linear-gradient(to bottom, var(--color-accent), rgba(99, 102, 241, 0.6))",
        }}
      />

      {/* Reason pill badge */}
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-accent-muted)] border border-[var(--color-accent-light)]">
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          className="text-[var(--color-accent)] shrink-0"
        >
          <path d="M6 1 L6 8.5 M3 5.5 L6 8.5 L9 5.5" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[10px] font-medium text-[var(--color-accent)] truncate max-w-[160px]">
          {edge.reason || `${edge.from} \u2192 ${edge.to}`}
        </span>
      </div>

      {/* Gradient connector line */}
      <div
        className="w-px h-3"
        style={{
          background: "linear-gradient(to bottom, rgba(99, 102, 241, 0.6), var(--color-accent))",
        }}
      />
    </div>
  );
}

/* ── Summary Card ──────────────────────────────────────────── */

interface SummaryCardProps {
  totalUsage: TokenUsage | null;
  nodes: TraceNode[];
  isStreaming: boolean;
}

function SummaryCard({ totalUsage, nodes, isStreaming }: SummaryCardProps) {
  const runningUsage: TokenUsage = totalUsage ?? nodes.reduce<TokenUsage>(
    (acc, n) => {
      if (n.usage) {
        return {
          inputTokens: acc.inputTokens + n.usage.inputTokens,
          outputTokens: acc.outputTokens + n.usage.outputTokens,
        };
      }
      return acc;
    },
    { inputTokens: 0, outputTokens: 0 },
  );

  const totalDuration = nodes.reduce(
    (sum, n) => sum + (n.durationMs ?? 0),
    0,
  );
  const completedCount = nodes.filter((n) => n.status === "done").length;
  const runningCount = nodes.filter((n) => n.status === "running").length;
  const errorCount = nodes.filter((n) => n.status === "error").length;

  const agentSummaryParts: string[] = [];
  if (completedCount > 0) agentSummaryParts.push(`${completedCount} done`);
  if (runningCount > 0) agentSummaryParts.push(`${runningCount} active`);
  if (errorCount > 0) agentSummaryParts.push(`${errorCount} error`);

  const pulseClass = isStreaming ? "animate-summary-pulse" : "";

  return (
    <div className={`animate-fade-in rounded-xl glass-card p-4 mt-4 ${pulseClass}`}>
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          Summary
        </h4>
        {isStreaming && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
            <span className="h-1 w-1 rounded-full bg-blue-500 animate-pulse" />
            In Progress
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[11px] text-[var(--color-text-tertiary)]">Total Time</div>
          <div className="text-sm font-semibold text-[var(--color-text-primary)] font-mono">
            {formatDuration(totalDuration)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-[var(--color-text-tertiary)]">Agents</div>
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">
            {agentSummaryParts.join(", ") || `${nodes.length} total`}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-[var(--color-text-tertiary)]">Input Tokens</div>
          <div className="text-sm font-semibold text-[var(--color-text-primary)] font-mono">
            {formatNumber(runningUsage.inputTokens)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-[var(--color-text-tertiary)]">Output Tokens</div>
          <div className="text-sm font-semibold text-[var(--color-text-primary)] font-mono">
            {formatNumber(runningUsage.outputTokens)}
          </div>
        </div>
      </div>

      {/* Token proportion bar */}
      {(runningUsage.inputTokens > 0 || runningUsage.outputTokens > 0) && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-[var(--color-text-tertiary)] mb-1">
            <div className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-blue-400" />
              <span>Input</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Output</span>
              <span className="inline-block w-2 h-2 rounded-sm bg-indigo-600" />
            </div>
          </div>
          <TokenBar usage={runningUsage} height="h-2" />
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-[var(--color-border-light)] flex items-center justify-between">
        <span className="text-[11px] text-[var(--color-text-tertiary)]">Total Tokens</span>
        <span className="text-sm font-bold text-[var(--color-accent)] font-mono">
          {formatNumber(runningUsage.inputTokens + runningUsage.outputTokens)}
        </span>
      </div>
    </div>
  );
}

/* ── Trace View ────────────────────────────────────────────── */

interface TraceViewProps {
  traceNodes: TraceNode[];
  traceEdges: TraceEdge[];
  totalUsage: TokenUsage | null;
  isStreaming?: boolean;
}

export function TraceView({
  traceNodes,
  traceEdges,
  totalUsage,
  isStreaming = false,
}: TraceViewProps) {
  if (traceNodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-tertiary)]">
        <div className="text-center">
          <svg
            className="mx-auto mb-3 h-10 w-10 opacity-30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
            />
          </svg>
          <span className="text-sm">Trace will appear here</span>
        </div>
      </div>
    );
  }

  const pattern = guessPattern(traceNodes);
  const patternDesc = pattern ? PATTERN_DESCRIPTIONS[pattern] : null;

  // Build interleaved list: node, edge, node, edge, node...
  const elements: ReactNode[] = [];
  for (let i = 0; i < traceNodes.length; i++) {
    const node = traceNodes[i];
    if (!node) continue;

    if (i > 0) {
      const prevNode = traceNodes[i - 1];
      const edge = prevNode
        ? traceEdges.find(
            (e) => e.from === prevNode.agent && e.to === node.agent,
          )
        : undefined;
      if (edge) {
        elements.push(
          <TraceEdgeArrow
            key={`edge-${edge.from}-${edge.to}`}
            edge={edge}
            index={i}
          />,
        );
      } else {
        // Simple gradient connector when no edge data
        elements.push(
          <div
            key={`connector-${i}`}
            className="animate-edge-grow flex justify-center py-0.5"
            style={{ animationDelay: `${i * 80 + 40}ms` }}
          >
            <div
              className="w-px h-5"
              style={{
                background: "linear-gradient(to bottom, var(--color-accent), rgba(99, 102, 241, 0.4))",
              }}
            />
          </div>,
        );
      }
    }

    elements.push(
      <TraceNodeCard key={`node-${node.agent}-${i}`} node={node} index={i} step={i + 1} />,
    );
  }

  const showSummary = totalUsage !== null || (isStreaming && traceNodes.length > 0);

  return (
    <div className="h-full overflow-y-auto p-5 custom-scrollbar">
      {/* Pattern description */}
      {patternDesc && (
        <div className="mb-4 flex items-center gap-2 animate-fade-in">
          <span className="rounded-full bg-[var(--color-accent-light)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-accent)] capitalize">
            {pattern}
          </span>
          <span className="text-xs text-[var(--color-text-tertiary)]">
            {patternDesc}
          </span>
        </div>
      )}

      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-4">
        Execution Trace
      </h3>

      <div className="space-y-0">{elements}</div>

      {showSummary && (
        <SummaryCard
          totalUsage={totalUsage}
          nodes={traceNodes}
          isStreaming={isStreaming}
        />
      )}
    </div>
  );
}
