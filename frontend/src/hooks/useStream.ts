import { useCallback, useRef, useState } from "react";
import type {
  AgentMessage,
  ChatMessage,
  HandoffMessage,
  StreamEvent,
  StreamState,
  TokenUsage,
  TraceEdge,
  TraceNode,
} from "../types.ts";

function createInitialState(): StreamState {
  return {
    messages: [],
    traceNodes: [],
    traceEdges: [],
    isStreaming: false,
    error: null,
    totalUsage: null,
  };
}

let messageIdCounter = 0;

function nextMessageId(): string {
  messageIdCounter += 1;
  return `msg-${messageIdCounter}`;
}

export function parseSSELines(raw: string): StreamEvent[] {
  const events: StreamEvent[] = [];
  const lines = raw.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) {
      continue;
    }
    const jsonStr = trimmed.slice(5).trim();
    if (jsonStr === "" || jsonStr === "[DONE]") {
      continue;
    }
    try {
      events.push(JSON.parse(jsonStr) as StreamEvent);
    } catch {
      // Skip malformed lines
    }
  }

  return events;
}

export function reduceEvent(
  state: StreamState,
  event: StreamEvent,
): StreamState {
  switch (event.type) {
    case "agent_start": {
      const agentMsg: AgentMessage = {
        id: nextMessageId(),
        agent: event.agent,
        role: event.role,
        content: "",
        isStreaming: true,
      };
      const traceNode: TraceNode = {
        agent: event.agent,
        role: event.role,
        status: "running",
      };
      return {
        ...state,
        messages: [...state.messages, agentMsg],
        traceNodes: [...state.traceNodes, traceNode],
      };
    }

    case "chunk": {
      const messages = state.messages.map((msg) => {
        if (
          "agent" in msg &&
          msg.agent === event.agent &&
          (msg as AgentMessage).isStreaming
        ) {
          return {
            ...msg,
            content: (msg as AgentMessage).content + event.content,
          };
        }
        return msg;
      });
      return { ...state, messages };
    }

    case "handoff": {
      const handoffMsg: HandoffMessage = {
        id: nextMessageId(),
        from: event.from,
        to: event.to,
        reason: event.reason,
        isHandoff: true,
      };
      const traceEdge: TraceEdge = {
        from: event.from,
        to: event.to,
        reason: event.reason,
      };
      return {
        ...state,
        messages: [...state.messages, handoffMsg],
        traceEdges: [...state.traceEdges, traceEdge],
      };
    }

    case "agent_end": {
      const messages = state.messages.map((msg) => {
        if (
          "agent" in msg &&
          msg.agent === event.agent &&
          (msg as AgentMessage).isStreaming
        ) {
          return {
            ...msg,
            isStreaming: false,
            usage: event.usage,
            durationMs: event.durationMs,
          };
        }
        return msg;
      });
      const traceNodes = state.traceNodes.map((node) =>
        node.agent === event.agent && node.status === "running"
          ? {
              ...node,
              status: "done" as const,
              usage: event.usage,
              durationMs: event.durationMs,
            }
          : node,
      );
      return { ...state, messages, traceNodes };
    }

    case "error": {
      const traceNodes = state.traceNodes.map((node) =>
        node.agent === event.agent && node.status === "running"
          ? { ...node, status: "error" as const }
          : node,
      );
      return { ...state, traceNodes, error: event.message };
    }

    case "done": {
      return {
        ...state,
        isStreaming: false,
        totalUsage: event.totalUsage,
      };
    }

    default:
      return state;
  }
}

interface UseStreamReturn {
  messages: ChatMessage[];
  traceNodes: TraceNode[];
  traceEdges: TraceEdge[];
  isStreaming: boolean;
  error: string | null;
  totalUsage: TokenUsage | null;
  send: (pattern: string, input: string) => void;
  reset: () => void;
}

export function useStream(activePattern: string | null): UseStreamReturn {
  const [state, setStateRaw] = useState<StreamState>(createInitialState);
  const stateRef = useRef<StreamState>(state);
  const abortRef = useRef<AbortController | null>(null);
  const stateMapRef = useRef<Map<string, StreamState>>(new Map());
  const prevPatternRef = useRef<string | null>(null);

  // Wrapper that keeps the ref in sync with state
  const setState: typeof setStateRaw = useCallback((action) => {
    setStateRaw((prev) => {
      const next = typeof action === "function" ? action(prev) : action;
      stateRef.current = next;
      return next;
    });
  }, []);

  // When active pattern changes, snapshot current state and restore the new pattern's state
  if (activePattern !== prevPatternRef.current) {
    if (prevPatternRef.current !== null) {
      stateMapRef.current.set(prevPatternRef.current, stateRef.current);
    }
    prevPatternRef.current = activePattern;

    if (activePattern !== null) {
      const cached = stateMapRef.current.get(activePattern);
      const next = cached ?? createInitialState();
      stateRef.current = next;
      setStateRaw(next);
    } else {
      const next = createInitialState();
      stateRef.current = next;
      setStateRaw(next);
    }
  }

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setState(createInitialState());
  }, [setState]);

  const send = useCallback((pattern: string, input: string) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: ChatMessage = {
      id: nextMessageId(),
      content: input,
      isUser: true as const,
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      traceNodes: [],
      traceEdges: [],
      isStreaming: true,
      error: null,
      totalUsage: null,
    }));

    void (async () => {
      try {
        const response = await fetch(`/api/patterns/${pattern}/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text();
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error: `HTTP ${response.status}: ${text}`,
          }));
          return;
        }

        const body = response.body;
        if (!body) {
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error: "No response body",
          }));
          return;
        }

        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const events = parseSSELines(part);
            for (const event of events) {
              setState((prev) => reduceEvent(prev, event));
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          const events = parseSSELines(buffer);
          for (const event of events) {
            setState((prev) => reduceEvent(prev, event));
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Unknown error occurred";
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: message,
        }));
      }
    })();
  }, []);

  return {
    messages: state.messages,
    traceNodes: state.traceNodes,
    traceEdges: state.traceEdges,
    isStreaming: state.isStreaming,
    error: state.error,
    totalUsage: state.totalUsage,
    send,
    reset,
  };
}
