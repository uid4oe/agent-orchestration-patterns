import { useCallback, useEffect, useRef, useState } from "react";
import { Chat } from "./components/Chat.tsx";
import { PatternSelector } from "./components/PatternSelector.tsx";
import { RightPanel } from "./components/RightPanel.tsx";
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
  } = useStream(selectedPattern);

  const handlePatternSelect = useCallback(
    (pattern: string) => {
      setSelectedPattern(pattern);
      // Don't reset — keep previous conversation visible
    },
    [],
  );

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || !selectedPattern || isStreaming) return;
    setInput("");
    send(selectedPattern, trimmed);
  }, [input, selectedPattern, isStreaming, send]);

  const handleTryPrompt = useCallback((prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  }, []);

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
      {/* Minimal header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-1">
        <span className="text-base font-normal text-[var(--color-text-primary)] tracking-tight">
          Agent Orchestration Patterns
        </span>
        <a
          href="https://github.com/uid4oe/agent-orchestration-patterns"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
          title="View on GitHub"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        </a>
      </header>

      {/* Main panels */}
      <main className="flex flex-1 min-h-0 flex-col lg:flex-row gap-2 lg:gap-2.5">
        <div className="flex-[3] min-h-0 glass rounded-2xl overflow-hidden">
          <RightPanel
            selectedPattern={selectedPattern}
            traceNodes={traceNodes}
            traceEdges={traceEdges}
            totalUsage={totalUsage}
            isStreaming={isStreaming}
            onTryPrompt={handleTryPrompt}
          />
        </div>
        <div className="flex-[2] min-h-0 glass-strong rounded-2xl overflow-hidden">
          <Chat
            messages={messages}
            isStreaming={isStreaming}
            error={error}
            totalUsage={totalUsage}
          />
        </div>
      </main>

      {/* Input bar */}
      <div className="shrink-0">
        <div className="max-w-2xl w-full mx-auto rounded-2xl glass-strong px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--color-accent)]/15 transition-shadow">
          {/* Top row: textarea + send */}
          <div className="flex items-center gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none disabled:opacity-50"
              disabled={isStreaming}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isStreaming || !input.trim()}
              className="shrink-0 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:brightness-110 focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm shadow-blue-500/15"
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
          {/* Bottom row: pattern tabs */}
          <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-[var(--color-border-light)]">
            <PatternSelector
              selected={selectedPattern}
              onSelect={handlePatternSelect}
              isStreaming={isStreaming}
            />
            <div className="flex-1" />
            {!isStreaming && (
              <span className="text-[11px] text-[var(--color-text-tertiary)] pointer-events-none select-none shrink-0 hidden sm:flex items-center gap-1">
                <kbd className="rounded bg-[var(--color-surface-tertiary)] px-1.5 py-0.5 text-[10px] font-mono font-medium text-[var(--color-text-secondary)]">
                  &crarr;
                </kbd>
                <span className="text-[10px]">to send</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
