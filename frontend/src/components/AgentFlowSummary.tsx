import type { TraceEdge, TraceNode } from "../types.ts";
import { AgentAvatar } from "./AgentAvatar.tsx";

/* ── Status dot colors ─────────────────────────────────────── */

const STATUS_DOT: Record<TraceNode["status"], string> = {
  running: "bg-blue-500 animate-pulse",
  done: "bg-emerald-500",
  error: "bg-red-500",
};

/* ── Flow Node ─────────────────────────────────────────────── */

function FlowNode({ node }: { node: TraceNode }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div className="relative">
        <AgentAvatar name={node.agent} role={node.role} size="sm" />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white ${STATUS_DOT[node.status]}`}
        />
      </div>
      <span className="text-[10px] font-medium text-[var(--color-text-primary)] truncate max-w-[72px] text-center leading-tight">
        {node.agent}
      </span>
    </div>
  );
}

/* ── Flow Arrow ────────────────────────────────────────────── */

function FlowArrow({ edge }: { edge: TraceEdge | undefined }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 px-1 shrink-0">
      <svg
        width="20"
        height="10"
        viewBox="0 0 20 10"
        className="text-[var(--color-text-tertiary)]"
      >
        <path
          d="M0 5h16M12 1l4 4-4 4"
          stroke="currentColor"
          fill="none"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {edge?.reason && (
        <span className="text-[9px] text-[var(--color-accent)] max-w-[64px] truncate text-center leading-tight">
          {edge.reason}
        </span>
      )}
    </div>
  );
}

/* ── Agent Flow Summary ────────────────────────────────────── */

interface AgentFlowSummaryProps {
  traceNodes: TraceNode[];
  traceEdges: TraceEdge[];
  isStreaming: boolean;
}

export function AgentFlowSummary({
  traceNodes,
  traceEdges,
  isStreaming,
}: AgentFlowSummaryProps) {
  if (traceNodes.length === 0) return null;

  // Find edge between consecutive nodes
  function findEdge(fromAgent: string, toAgent: string): TraceEdge | undefined {
    return traceEdges.find((e) => e.from === fromAgent && e.to === toAgent);
  }

  return (
    <div
      className={`animate-fade-in px-4 py-3 ${
        isStreaming ? "animate-summary-pulse" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[var(--color-text-tertiary)]"
        >
          <path d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          Agent Flow
        </span>
        {isStreaming && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
            <span className="h-1 w-1 rounded-full bg-blue-500 animate-pulse" />
            Live
          </span>
        )}
      </div>

      {/* Flow chain */}
      <div className="flex items-center flex-wrap gap-y-3">
        {traceNodes.map((node, i) => (
          <div key={`${node.agent}-${i}`} className="flex items-center">
            {i > 0 && (
              <FlowArrow
                edge={findEdge(traceNodes[i - 1]?.agent ?? "", node.agent)}
              />
            )}
            <FlowNode node={node} />
          </div>
        ))}
      </div>
    </div>
  );
}
