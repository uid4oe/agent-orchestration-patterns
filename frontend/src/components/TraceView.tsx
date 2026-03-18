import { useCallback, useState } from "react";
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

/* ── Trace Node Card ───────────────────────────────────────── */

const STATUS_BORDER: Record<TraceNode["status"], string> = {
  running: "border-blue-200",
  done: "border-emerald-200",
  error: "border-red-200",
};

interface TraceNodeCardProps {
  node: TraceNode;
  index: number;
}

function TraceNodeCard({ node, index }: TraceNodeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const borderColor = STATUS_BORDER[node.status];

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const maxDuration = 5000; // for progress bar scaling
  const durationPct =
    node.durationMs !== undefined
      ? Math.min((node.durationMs / maxDuration) * 100, 100)
      : 0;

  return (
    <div
      className={`animate-node-in rounded-xl border ${borderColor} glass-card transition-all duration-200 hover:shadow-md cursor-pointer`}
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
      <div className="flex items-center gap-3 px-3.5 py-3">
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
          {(node.usage || node.durationMs !== undefined) && (
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--color-text-tertiary)]">
              {node.durationMs !== undefined && (
                <span>{formatDuration(node.durationMs)}</span>
              )}
              {node.usage && <span>{formatTokens(node.usage)}</span>}
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

          {/* Token breakdown */}
          {node.usage && (
            <div className="space-y-1.5">
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
      className="animate-edge-grow flex flex-col items-center gap-0.5 py-1"
      style={{ animationDelay: `${index * 80 + 40}ms` }}
    >
      <div className="w-px h-3 bg-[var(--color-border)]" />
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)]">
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className="text-[var(--color-accent)] shrink-0 opacity-60"
        >
          <path d="M6 1 L6 8.5 M3 5.5 L6 8.5 L9 5.5" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="truncate max-w-[180px]">
          {edge.reason || `${edge.from} \u2192 ${edge.to}`}
        </span>
      </div>
      <div className="w-px h-3 bg-[var(--color-border)]" />
    </div>
  );
}

/* ── Summary Card ──────────────────────────────────────────── */

interface SummaryCardProps {
  totalUsage: TokenUsage;
  nodes: TraceNode[];
}

function SummaryCard({ totalUsage, nodes }: SummaryCardProps) {
  const totalDuration = nodes.reduce(
    (sum, n) => sum + (n.durationMs ?? 0),
    0,
  );
  const completedCount = nodes.filter((n) => n.status === "done").length;
  const errorCount = nodes.filter((n) => n.status === "error").length;

  return (
    <div className="animate-fade-in rounded-xl glass-card p-4 mt-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-3">
        Summary
      </h4>
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
            {completedCount} done{errorCount > 0 ? `, ${errorCount} error` : ""}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-[var(--color-text-tertiary)]">Input Tokens</div>
          <div className="text-sm font-semibold text-[var(--color-text-primary)] font-mono">
            {formatNumber(totalUsage.inputTokens)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-[var(--color-text-tertiary)]">Output Tokens</div>
          <div className="text-sm font-semibold text-[var(--color-text-primary)] font-mono">
            {formatNumber(totalUsage.outputTokens)}
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-[var(--color-border-light)] flex items-center justify-between">
        <span className="text-[11px] text-[var(--color-text-tertiary)]">Total Tokens</span>
        <span className="text-sm font-bold text-[var(--color-accent)] font-mono">
          {formatNumber(totalUsage.inputTokens + totalUsage.outputTokens)}
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
}

export function TraceView({
  traceNodes,
  traceEdges,
  totalUsage,
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
        elements.push(
          <div
            key={`connector-${i}`}
            className="animate-edge-grow flex justify-center py-1"
            style={{ animationDelay: `${i * 80 + 40}ms` }}
          >
            <div className="w-px h-5 bg-[var(--color-border)]" />
          </div>,
        );
      }
    }

    elements.push(
      <TraceNodeCard key={`node-${node.agent}-${i}`} node={node} index={i} />,
    );
  }

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

      {totalUsage && <SummaryCard totalUsage={totalUsage} nodes={traceNodes} />}
    </div>
  );
}
