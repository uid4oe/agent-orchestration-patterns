import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AgentMessage } from "../types.ts";
import { AgentAvatar } from "./AgentAvatar.tsx";
import { StreamingCursor } from "./StreamingCursor.tsx";

interface MessageBubbleProps {
  message: AgentMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <div className="animate-message-in flex items-start gap-3 px-5 py-3 max-w-3xl">
      <AgentAvatar name={message.agent} role={message.role} />
      <div className="min-w-0 flex-1">
        {/* Agent name + role label */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
            {message.agent}
          </span>
          <span className="text-xs text-[var(--color-text-tertiary)]">
            {message.role}
          </span>
        </div>

        {/* Streaming placeholder */}
        {message.isStreaming && !message.content && (
          <div className="flex items-center gap-1 pt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse [animation-delay:300ms]" />
          </div>
        )}

        {/* Message content */}
        {message.content && (
          <div className="prose-chat text-sm">
            <Markdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </Markdown>
            {message.isStreaming && <StreamingCursor />}
          </div>
        )}

        {/* Token + timing metadata */}
        {!message.isStreaming && message.usage && (
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-[var(--color-text-tertiary)]">
            {message.durationMs !== undefined && (
              <span>{message.durationMs}ms</span>
            )}
            <span>
              {message.usage.inputTokens + message.usage.outputTokens} tokens
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
