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
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--color-surface-secondary)]">
      {/* Header */}
      <header className="shrink-0 bg-white border-b border-[var(--color-border-light)]">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                  />
                </svg>
              </div>
              <h1 className="text-sm font-semibold text-[var(--color-text-primary)] tracking-tight">
                Agent Orchestration
              </h1>
            </div>
            <span className="rounded-full bg-[var(--color-accent-light)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent)] uppercase tracking-wider">
              dev
            </span>
          </div>
        </div>
        <div className="border-t border-[var(--color-border-light)]">
          <PatternSelector
            selected={selectedPattern}
            onSelect={handlePatternSelect}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 min-h-0 flex-col lg:flex-row">
        {/* Chat panel */}
        <div className="flex-[3] min-h-0 bg-white lg:rounded-tr-none">
          <Chat
            messages={messages}
            isStreaming={isStreaming}
            error={error}
            totalUsage={totalUsage}
            onSend={handleSend}
          />
        </div>

        {/* Trace panel */}
        <div className="flex-[2] min-h-0 border-t lg:border-t-0 lg:border-l border-[var(--color-border-light)] bg-[var(--color-surface-secondary)]">
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
