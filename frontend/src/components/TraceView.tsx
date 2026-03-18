import type { ReactNode } from "react";
import type { TokenUsage, TraceEdge, TraceNode } from "../types.ts";

const STATUS_STYLES: Record<
  TraceNode["status"],
  { dot: string; border: string; bg: string }
> = {
  running: {
    dot: "bg-blue-400 animate-pulse",
    border: "border-blue-500/40",
    bg: "bg-blue-500/5",
  },
  done: {
    dot: "bg-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
  },
  error: {
    dot: "bg-red-400",
    border: "border-red-500/30",
    bg: "bg-red-500/5",
  },
};

function formatTokens(usage: TokenUsage): string {
  const total = usage.inputTokens + usage.outputTokens;
  return `${total} tok`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

interface TraceNodeCardProps {
  node: TraceNode;
}

function TraceNodeCard({ node }: TraceNodeCardProps) {
  const style = STATUS_STYLES[node.status];

  return (
    <div
      className={`rounded-lg border ${style.border} ${style.bg} px-3 py-2.5 transition-all duration-300`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
        <span className="text-sm font-medium text-gray-200 truncate">
          {node.agent}
        </span>
        <span className="text-xs text-gray-500 truncate">/ {node.role}</span>
      </div>
      {(node.usage || node.durationMs !== undefined) && (
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-gray-500">
          {node.durationMs !== undefined && (
            <span>{formatDuration(node.durationMs)}</span>
          )}
          {node.usage && <span>{formatTokens(node.usage)}</span>}
        </div>
      )}
    </div>
  );
}

interface TraceEdgeArrowProps {
  edge: TraceEdge;
}

function TraceEdgeArrow({ edge }: TraceEdgeArrowProps) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-1">
      <div className="w-px h-3 bg-gray-700" />
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className="text-gray-600 shrink-0"
        >
          <path d="M5 0 L5 7 M2 4 L5 7 L8 4" stroke="currentColor" fill="none" strokeWidth="1.5" />
        </svg>
        <span className="truncate max-w-[180px]">
          {edge.reason || `${edge.from} \u2192 ${edge.to}`}
        </span>
      </div>
      <div className="w-px h-3 bg-gray-700" />
    </div>
  );
}

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
      <div className="flex items-center justify-center h-full text-gray-600 text-sm">
        <div className="text-center">
          <svg
            className="mx-auto mb-2 h-8 w-8 text-gray-700"
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
          Trace will appear here
        </div>
      </div>
    );
  }

  // Build interleaved list: node, edge, node, edge, node...
  const elements: ReactNode[] = [];
  for (let i = 0; i < traceNodes.length; i++) {
    const node = traceNodes[i];
    if (!node) continue;

    if (i > 0) {
      // Find edge from previous node to this one
      const prevNode = traceNodes[i - 1];
      const edge = prevNode
        ? traceEdges.find(
            (e) => e.from === prevNode.agent && e.to === node.agent,
          )
        : undefined;
      if (edge) {
        elements.push(
          <TraceEdgeArrow key={`edge-${edge.from}-${edge.to}`} edge={edge} />,
        );
      } else {
        // Show a simple connector when no explicit edge
        elements.push(
          <div
            key={`connector-${i}`}
            className="flex justify-center py-1"
          >
            <div className="w-px h-6 bg-gray-800" />
          </div>,
        );
      }
    }

    elements.push(
      <TraceNodeCard key={`node-${node.agent}-${i}`} node={node} />,
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
        Execution Trace
      </h3>
      <div className="space-y-0">{elements}</div>
      {totalUsage && (
        <div className="mt-4 pt-3 border-t border-gray-800">
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <span>Total tokens</span>
            <span className="font-mono">
              {totalUsage.inputTokens + totalUsage.outputTokens}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-gray-600">
            <span>Input / Output</span>
            <span className="font-mono">
              {totalUsage.inputTokens} / {totalUsage.outputTokens}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
