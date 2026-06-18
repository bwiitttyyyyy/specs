import { useEffect, useRef } from "react";
import type { ClientFrame, ServerFrame } from "@speckit-dashboard/shared";
import { getToken } from "./api";
import { useSessionStore } from "../state/connection";

const WS_BASE = (import.meta.env.VITE_WS_BASE as string | undefined) ?? "ws://127.0.0.1:4317";

export interface SessionHandle {
  runCommand: (command: string) => void;
  chat: (message: string) => void;
  answer: (interactionId: string, answer: string) => void;
  cancel: (interactionId: string) => void;
  reconnect: () => void;
}

/**
 * Manages a per-spec WebSocket for the lifetime of the mounted spec (T041, T046).
 * On unexpected close it preserves accumulated state in the store and attempts a
 * bounded auto-reconnect; the open spec view and partial output are never lost
 * (FR-004, SC-005). A manual reconnect always reopens.
 */
export function useSpecSession(projectId: string, specId: string): SessionHandle {
  const socketRef = useRef<WebSocket | null>(null);
  const openRef = useRef<() => void>(() => {});
  const retryRef = useRef(0);
  const closedByUs = useRef(false);
  const { applyFrame, noteSent, reset } = useSessionStore.getState();

  useEffect(() => {
    closedByUs.current = false;
    reset();

    const open = (): void => {
      const url = `${WS_BASE}/ws?projectId=${encodeURIComponent(projectId)}&specId=${encodeURIComponent(
        specId,
      )}&token=${encodeURIComponent(getToken())}`;
      const ws = new WebSocket(url);
      socketRef.current = ws;
      ws.onmessage = (ev) => {
        try {
          applyFrame(JSON.parse(ev.data as string) as ServerFrame);
        } catch {
          /* ignore malformed frame */
        }
      };
      ws.onopen = () => {
        retryRef.current = 0;
      };
      ws.onclose = () => {
        if (closedByUs.current) return;
        applyFrame({ type: "status", connectionState: "disconnected", activity: "idle" });
        if (retryRef.current < 5) {
          retryRef.current += 1;
          setTimeout(open, Math.min(500 * retryRef.current, 3000));
        }
      };
    };

    openRef.current = open;
    open();
    return () => {
      closedByUs.current = true;
      socketRef.current?.close();
    };
  }, [projectId, specId, applyFrame, noteSent, reset]);

  const send = (frame: ClientFrame): void => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(frame));
  };

  return {
    runCommand: (command) => {
      noteSent("command", command);
      send({ type: "run_command", command, specId });
    },
    chat: (message) => {
      noteSent("chat", message);
      send({ type: "chat", message, specId });
    },
    answer: (interactionId, answer) => send({ type: "answer", interactionId, answer }),
    cancel: (interactionId) => send({ type: "cancel", interactionId }),
    reconnect: () => {
      retryRef.current = 0;
      const ws = socketRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        send({ type: "reconnect" });
      } else {
        openRef.current();
      }
    },
  };
}
