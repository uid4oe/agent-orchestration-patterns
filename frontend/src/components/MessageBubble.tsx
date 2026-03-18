import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AgentMessage } from "../types.ts";
import { AgentAvatar } from "./AgentAvatar.tsx";
import { StreamingCursor } from "./StreamingCursor.tsx";

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

interface MessageBubbleProps {
  message: AgentMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <div className="animate-message-in flex items-start gap-3 px-5 py-2.5 max-w-3xl group">
      <AgentAvatar name={message.agent} role={message.role} />
      <div className="min-w-0 flex-1">
        {/* Agent name + role label */}
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
            {message.agent}
          </span>
          <span className="text-[11px] text-[var(--color-text-tertiary)] bg-[var(--color-surface-tertiary)] rounded px-1.5 py-0.5">
            {message.role}
          </span>
        </div>

        {/* Streaming placeholder */}
        {message.isStreaming && !message.content && (
          <div className="flex items-center gap-1 pt-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse [animation-delay:300ms]" />
          </div>
        )}

        {/* Message content */}
        {message.content && (
          <div className="prose-chat text-[13px]">
            <Markdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </Markdown>
            {message.isStreaming && <StreamingCursor />}
          </div>
        )}

        {/* Token + timing metadata as subtle badges */}
        {!message.isStreaming && message.usage && (
          <div className="mt-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {message.durationMs !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-tertiary)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-text-tertiary)]">
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                {formatDuration(message.durationMs)}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-tertiary)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-text-tertiary)]">
              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Z" />
              </svg>
              {message.usage.inputTokens + message.usage.outputTokens} tok
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
