import { useCallback, useEffect, useRef, useState } from "react";
import type { TokenUsage, TraceEdge, TraceNode } from "../types.ts";
import { LearnView } from "./LearnView.tsx";
import { TabBar } from "./TabBar.tsx";
import type { TabId } from "./TabBar.tsx";
import { TraceView } from "./TraceView.tsx";

interface RightPanelProps {
  selectedPattern: string | null;
  traceNodes: TraceNode[];
  traceEdges: TraceEdge[];
  totalUsage: TokenUsage | null;
  isStreaming: boolean;
  onTryPrompt: (prompt: string) => void;
}

export function RightPanel({
  selectedPattern,
  traceNodes,
  traceEdges,
  totalUsage,
  isStreaming,
  onTryPrompt,
}: RightPanelProps) {
  /* Per-pattern tab state */
  const tabMapRef = useRef(new Map<string, TabId>());

  const getTab = useCallback((): TabId => {
    if (!selectedPattern) return "learn";
    return tabMapRef.current.get(selectedPattern) ?? "learn";
  }, [selectedPattern]);

  const [activeTab, setActiveTab] = useState<TabId>(getTab);

  /* Restore tab state on pattern switch */
  useEffect(() => {
    setActiveTab(getTab());
  }, [getTab]);

  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      if (selectedPattern) {
        tabMapRef.current.set(selectedPattern, tab);
      }
    },
    [selectedPattern],
  );

  /* Auto-switch to trace when streaming starts */
  const wasStreamingRef = useRef(false);
  useEffect(() => {
    if (isStreaming && !wasStreamingRef.current) {
      handleTabChange("trace");
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming, handleTabChange]);

  return (
    <div className="flex flex-col h-full">
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="flex-1 min-h-0">
        {activeTab === "trace" ? (
          <div
            role="tabpanel"
            id="tabpanel-trace"
            aria-labelledby="tab-trace"
            className="h-full"
          >
            <TraceView
              traceNodes={traceNodes}
              traceEdges={traceEdges}
              totalUsage={totalUsage}
              isStreaming={isStreaming}
              patternName={selectedPattern}
            />
          </div>
        ) : (
          <div
            role="tabpanel"
            id="tabpanel-learn"
            aria-labelledby="tab-learn"
            className="h-full"
          >
            <LearnView
              selectedPattern={selectedPattern}
              onTryPrompt={onTryPrompt}
            />
          </div>
        )}
      </div>
    </div>
  );
}
