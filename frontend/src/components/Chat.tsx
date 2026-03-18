import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AgentMessage,
  ChatMessage,
  HandoffMessage,
  TokenUsage,
  UserMessage,
} from "../types.ts";
import { MessageBubble } from "./MessageBubble.tsx";

function isUserMessage(msg: ChatMessage): msg is UserMessage {
  return "isUser" in msg && msg.isUser === true;
}

function isHandoffMessage(msg: ChatMessage): msg is HandoffMessage {
  return "isHandoff" in msg && msg.isHandoff === true;
}

function isAgentMessage(msg: ChatMessage): msg is AgentMessage {
  return "agent" in msg && !("isHandoff" in msg);
}

interface ChatProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  totalUsage: TokenUsage | null;
  onSend: (input: string) => void;
}

export function Chat({
  messages,
  isStreaming,
  error,
  totalUsage,
  onSend,
}: ChatProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    onSend(trimmed);
  }, [input, isStreaming, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-0 py-4 custom-scrollbar"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-tertiary)]">
            <svg
              className="h-10 w-10 mb-3 opacity-40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
              />
            </svg>
            <span className="text-sm">Send a message to begin</span>
          </div>
        )}

        {messages.map((msg) => {
          if (isUserMessage(msg)) {
            return (
              <div key={msg.id} className="animate-message-in flex justify-end px-5 py-3">
                <div className="max-w-md">
                  <div className="rounded-2xl rounded-br-md bg-[var(--color-accent)] px-4 py-2.5 text-sm text-white leading-relaxed whitespace-pre-wrap shadow-sm">
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          }
          if (isHandoffMessage(msg)) {
            return (
              <div
                key={msg.id}
                className="animate-message-in flex items-center gap-3 px-5 py-2 my-1"
              >
                <span className="h-px flex-1 bg-[var(--color-border-light)]" />
                <span className="shrink-0 flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-60"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                  <span className="font-medium text-[var(--color-text-secondary)]">
                    {msg.from}
                  </span>
                  <span className="opacity-50">&rarr;</span>
                  <span className="font-medium text-[var(--color-text-secondary)]">
                    {msg.to}
                  </span>
                  {msg.reason && (
                    <span className="opacity-60 ml-0.5">
                      &middot; {msg.reason}
                    </span>
                  )}
                </span>
                <span className="h-px flex-1 bg-[var(--color-border-light)]" />
              </div>
            );
          }
          if (isAgentMessage(msg)) {
            return <MessageBubble key={msg.id} message={msg} />;
          }
          return null;
        })}

        {error && (
          <div className="px-5 py-2 animate-fade-in">
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          </div>
        )}

        {!isStreaming && totalUsage && (
          <div className="px-5 py-1 text-[11px] text-[var(--color-text-tertiary)] text-right animate-fade-in">
            Total: {totalUsage.inputTokens + totalUsage.outputTokens} tokens
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 p-3 lg:p-4">
        <div className="flex items-center gap-2 max-w-3xl mx-auto rounded-2xl border border-white/50 bg-white/60 backdrop-blur-xl shadow-sm px-2 py-1.5 focus-within:border-[var(--color-accent)]/30 focus-within:ring-2 focus-within:ring-[var(--color-accent)]/10 transition-shadow">
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
            <span className="text-[10px] text-[var(--color-text-tertiary)] opacity-50 pointer-events-none select-none shrink-0 hidden sm:block">
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
