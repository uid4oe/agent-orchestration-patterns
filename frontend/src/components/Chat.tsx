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
        className="flex-1 overflow-y-auto min-h-0 py-4 space-y-1"
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Send a message to begin
          </div>
        )}
        {messages.map((msg) => {
          if (isUserMessage(msg)) {
            return (
              <div key={msg.id} className="px-4 py-3">
                <div className="flex items-start gap-3 max-w-3xl">
                  <span className="inline-flex items-center rounded-md border border-gray-600/30 bg-gray-700/40 px-2 py-0.5 text-xs font-medium text-gray-300">
                    you
                  </span>
                </div>
                <div className="mt-1.5 text-sm leading-relaxed text-gray-100 whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            );
          }
          if (isHandoffMessage(msg)) {
            return (
              <div
                key={msg.id}
                className="px-4 py-1.5 flex items-center gap-2 text-xs text-gray-500"
              >
                <span className="h-px flex-1 bg-gray-800" />
                <span className="shrink-0">
                  {msg.from}{" "}
                  <span className="text-gray-600">&rarr;</span>{" "}
                  {msg.to}
                  {msg.reason && (
                    <span className="text-gray-600 ml-1">
                      &middot; {msg.reason}
                    </span>
                  )}
                </span>
                <span className="h-px flex-1 bg-gray-800" />
              </div>
            );
          }
          if (isAgentMessage(msg)) {
            return <MessageBubble key={msg.id} message={msg} />;
          }
          return null;
        })}

        {error && (
          <div className="px-4 py-2">
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          </div>
        )}

        {!isStreaming && totalUsage && (
          <div className="px-4 py-1 text-[11px] text-gray-600 text-right">
            Total: {totalUsage.inputTokens + totalUsage.outputTokens} tokens
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-gray-800 p-4">
        <div className="flex items-end gap-2 max-w-3xl">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 disabled:opacity-50"
            disabled={isStreaming}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isStreaming ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
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
