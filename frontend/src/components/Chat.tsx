import { useEffect, useRef } from "react";
import type {
  AgentMessage,
  ChatMessage,
  HandoffMessage,
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
}

export function Chat({
  messages,
  isStreaming,
  error,
}: ChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      aria-live="polite"
      className="h-full overflow-y-auto py-4 custom-scrollbar"
    >
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-tertiary)]">
          <svg
            className="h-10 w-10 mb-3 opacity-30"
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
            <div key={msg.id} className="animate-message-in flex justify-end px-5 py-2.5">
              <div className="max-w-md">
                <div className="rounded-2xl rounded-br-md bg-[var(--color-accent)] px-4 py-2.5 text-[13px] text-white leading-relaxed whitespace-pre-wrap shadow-sm">
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
              className="animate-message-in flex items-center gap-2.5 px-5 py-2 my-0.5"
            >
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />
              <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-white/50 px-3 py-1 text-[11px] text-[var(--color-text-secondary)] shadow-sm">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[var(--color-accent)] shrink-0"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <span className="font-medium">{msg.from}</span>
                <span className="text-[var(--color-text-tertiary)]">&rarr;</span>
                <span className="font-medium">{msg.to}</span>
                {msg.reason && (
                  <span className="text-[var(--color-text-tertiary)]">
                    {msg.reason}
                  </span>
                )}
              </span>
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />
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

    </div>
  );
}
