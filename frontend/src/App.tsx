import { useCallback, useEffect, useRef, useState } from "react";
import { Chat } from "./components/Chat.tsx";
import { PatternSelector } from "./components/PatternSelector.tsx";
import { TraceView } from "./components/TraceView.tsx";
import { useStream } from "./hooks/useStream.ts";

export function App() {
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
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

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || !selectedPattern || isStreaming) return;
    setInput("");
    send(selectedPattern, trimmed);
  }, [input, selectedPattern, isStreaming, send]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden p-2 lg:p-2.5 gap-2 lg:gap-2">
      {/* Minimal header: just project name */}
      <header className="shrink-0 flex items-center justify-between px-4 py-1">
        <span className="text-[13px] font-semibold text-[var(--color-text-primary)] tracking-tight">
          Agent Orchestration Patterns
        </span>
      </header>

      {/* Main panels */}
      <main className="flex flex-1 min-h-0 flex-col lg:flex-row gap-2 lg:gap-2.5">
        <div className="flex-[3] min-h-0 glass-strong rounded-2xl overflow-hidden">
          <Chat
            messages={messages}
            isStreaming={isStreaming}
            error={error}
            totalUsage={totalUsage}
          />
        </div>
        <div className="flex-[2] min-h-0 glass rounded-2xl overflow-hidden">
          <TraceView
            traceNodes={traceNodes}
            traceEdges={traceEdges}
            totalUsage={totalUsage}
            isStreaming={isStreaming}
          />
        </div>
      </main>

      {/* Unified input bar: pattern selector + textarea + send */}
      <div className="shrink-0">
        <div className="flex flex-col gap-1.5 max-w-4xl w-full mx-auto rounded-2xl glass-strong px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--color-accent)]/15 transition-shadow">
          {/* Textarea row */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="w-full resize-none bg-transparent px-1 py-1 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none disabled:opacity-50"
            disabled={isStreaming}
          />
          {/* Bottom row: pattern tabs + send */}
          <div className="flex items-center gap-2">
            <PatternSelector
              selected={selectedPattern}
              onSelect={handlePatternSelect}
            />
            <div className="flex-1" />
            {!isStreaming && !input.trim() && (
              <span className="text-[10px] text-[var(--color-text-tertiary)] opacity-40 pointer-events-none select-none shrink-0 hidden sm:block">
                Enter &crarr;
              </span>
            )}
            <button
            type="button"
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="shrink-0 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white hover:brightness-110 focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm shadow-blue-500/15"
          >
            {isStreaming ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin-slow" />
                Running
              </span>
            ) : (
              "Send"
            )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
