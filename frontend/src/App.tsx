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
    <div className="flex flex-col h-screen overflow-hidden p-2 lg:p-2.5 gap-2 lg:gap-2.5">
      {/* Compact header: logo + pattern tabs in one row */}
      <header className="shrink-0 glass-strong rounded-2xl px-4 py-2 flex items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm shadow-blue-500/20">
            <svg
              className="h-3.5 w-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
          </div>
          <h1 className="text-[13px] font-semibold text-[var(--color-text-primary)] tracking-tight hidden sm:block">
            Orchestration
          </h1>
        </div>
        <div className="h-5 w-px bg-[var(--color-border)] shrink-0 hidden sm:block" />
        <PatternSelector
          selected={selectedPattern}
          onSelect={handlePatternSelect}
        />
      </header>

      {/* Main content */}
      <main className="flex flex-1 min-h-0 flex-col lg:flex-row gap-2 lg:gap-2.5">
        {/* Chat panel */}
        <div className="flex-[3] min-h-0 glass-strong rounded-2xl overflow-hidden">
          <Chat
            messages={messages}
            isStreaming={isStreaming}
            error={error}
            totalUsage={totalUsage}
            onSend={handleSend}
          />
        </div>

        {/* Trace panel */}
        <div className="flex-[2] min-h-0 glass rounded-2xl overflow-hidden">
          <TraceView
            traceNodes={traceNodes}
            traceEdges={traceEdges}
            totalUsage={totalUsage}
            isStreaming={isStreaming}
          />
        </div>
      </main>
    </div>
  );
}
