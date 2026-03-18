import type { AgentMessage } from "../types.ts";

const AGENT_COLORS: Record<string, string> = {
  router: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  classifier: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  specialist: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  reviewer: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  supervisor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  debater: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  judge: "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

const DEFAULT_COLOR = "bg-gray-500/20 text-gray-300 border-gray-500/30";

function getAgentColor(role: string): string {
  return AGENT_COLORS[role.toLowerCase()] ?? DEFAULT_COLOR;
}

interface MessageBubbleProps {
  message: AgentMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const badgeColor = getAgentColor(message.role);

  return (
    <div className="group px-4 py-3">
      <div className="flex items-start gap-3 max-w-3xl">
        <div className="shrink-0 pt-0.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${badgeColor}`}
          >
            {message.agent}
            <span className="opacity-60">/ {message.role}</span>
          </span>
        </div>
        {message.isStreaming && !message.content && (
          <div className="flex items-center gap-1 pt-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse [animation-delay:300ms]" />
          </div>
        )}
      </div>
      {message.content && (
        <div className="mt-1.5 pl-0 text-sm leading-relaxed text-gray-200 whitespace-pre-wrap">
          {message.content}
          {message.isStreaming && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-blue-400/70 animate-pulse align-text-bottom" />
          )}
        </div>
      )}
      {!message.isStreaming && message.usage && (
        <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-500">
          <span>{message.durationMs}ms</span>
          <span>
            {message.usage.inputTokens + message.usage.outputTokens} tokens
          </span>
        </div>
      )}
    </div>
  );
}
