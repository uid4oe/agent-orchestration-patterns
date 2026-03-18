import { useCallback, useState } from "react";
import { Chat } from "./components/Chat.tsx";
import { PatternSelector } from "./components/PatternSelector.tsx";
import { TraceView } from "./components/TraceView.tsx";
import { useStream } from "./hooks/useStream.ts";

export function App() {
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const {
    messages,
    traceNodes,
    traceEdges,
    isStreaming,
    error,
    totalUsage,
    send,
    reset,
  } = useStream();

  const handlePatternSelect = useCallback(
    (pattern: string) => {
      setSelectedPattern(pattern);
      reset();
    },
    [reset],
  );

  const handleSend = useCallback(
    (input: string) => {
      if (!selectedPattern) return;
      send(selectedPattern, input);
    },
    [selectedPattern, send],
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-gray-800 bg-gray-950">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-gray-200 tracking-tight">
              Agent Orchestration Patterns
            </h1>
            <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
              dev
            </span>
          </div>
        </div>
        <div className="border-t border-gray-800/60">
          <PatternSelector
            selected={selectedPattern}
            onSelect={handlePatternSelect}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 min-h-0 flex-col lg:flex-row">
        {/* Chat panel */}
        <div className="flex-[3] min-h-0 border-b lg:border-b-0 lg:border-r border-gray-800">
          <Chat
            messages={messages}
            isStreaming={isStreaming}
            error={error}
            totalUsage={totalUsage}
            onSend={handleSend}
          />
        </div>

        {/* Trace panel */}
        <div className="flex-[2] min-h-0 bg-gray-950/50">
          <TraceView
            traceNodes={traceNodes}
            traceEdges={traceEdges}
            totalUsage={totalUsage}
          />
        </div>
      </main>
    </div>
  );
}
