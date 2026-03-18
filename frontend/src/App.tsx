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
      {/* Compact header */}
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

      {/* Input bar — centered at bottom, spanning full width */}
      <div className="shrink-0">
        <div className="flex items-center gap-2 max-w-2xl mx-auto rounded-2xl glass-strong px-3 py-1.5 focus-within:ring-2 focus-within:ring-[var(--color-accent)]/15 transition-shadow">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none disabled:opacity-50"
            disabled={isStreaming}
          />
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
  );
}
