import type { StreamEvent, TokenUsage } from "@agent-patterns/core";

export type { StreamEvent, TokenUsage };

export interface PatternInfo {
  name: string;
  description: string;
}

export interface AgentMessage {
  id: string;
  agent: string;
  role: string;
  content: string;
  isStreaming: boolean;
  usage?: TokenUsage;
  durationMs?: number;
}

export interface UserMessage {
  id: string;
  content: string;
  isUser: true;
}

export interface HandoffMessage {
  id: string;
  from: string;
  to: string;
  reason: string;
  isHandoff: true;
}

export type ChatMessage = AgentMessage | UserMessage | HandoffMessage;

export interface TraceNode {
  agent: string;
  role: string;
  status: "running" | "done" | "error";
  usage?: TokenUsage;
  durationMs?: number;
}

export interface TraceEdge {
  from: string;
  to: string;
  reason: string;
}

export interface StreamState {
  messages: ChatMessage[];
  traceNodes: TraceNode[];
  traceEdges: TraceEdge[];
  isStreaming: boolean;
  error: string | null;
  totalUsage: TokenUsage | null;
}
