import { useState } from "react";
import type { ConnectionState, SessionActivity } from "@speckit-dashboard/shared";
import { Button } from "./ui/primitives";
import { CommandBar } from "./CommandBar";
import { ClarificationPrompt } from "./ClarificationPrompt";
import type { SessionHandle } from "../services/ws";
import { useSessionStore } from "../state/connection";

/** The session workspace: status, commands, transcript, chat (T043, FR-012/013). */
export function SessionPanel({ session }: { session: SessionHandle }) {
  const { connectionState, activity, interactions, currentInteractionId, lastError } =
    useSessionStore();
  const [message, setMessage] = useState("");

  const disconnected = connectionState === "disconnected";
  const busy = activity !== "idle";

  return (
    <div className="flex h-full flex-col border-l border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <ActivityIndicator connectionState={connectionState} activity={activity} />
        {busy && currentInteractionId && (
          <Button variant="ghost" onClick={() => session.cancel(currentInteractionId)}>
            Stop
          </Button>
        )}
      </div>

      {disconnected && (
        <div
          className="flex items-center justify-between bg-red-50 px-4 py-2 text-sm text-red-700"
          role="alert"
        >
          <span>Session disconnected — your work is preserved.</span>
          <Button variant="ghost" onClick={session.reconnect}>
            Reconnect
          </Button>
        </div>
      )}

      <CommandBar session={session} />

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {interactions.length === 0 && (
          <p className="text-sm text-muted">
            Run a command above or send a message to iterate on this spec.
          </p>
        )}
        {interactions.map((i) => (
          <div key={i.id} className="rounded-md border border-line">
            <div className="flex items-center justify-between border-b border-line bg-canvas px-3 py-1.5">
              <span className="font-mono text-xs text-ink">
                {i.kind === "chat" ? "💬" : "▶"} {i.input}
              </span>
              <span className="text-xs text-muted">{i.status}</span>
            </div>
            {i.output && (
              <pre className="whitespace-pre-wrap px-3 py-2 text-xs text-ink">{i.output}</pre>
            )}
          </div>
        ))}
        <ClarificationPrompt session={session} />
        {lastError && <p className="text-xs text-red-600">Error: {lastError}</p>}
      </div>

      <form
        className="flex gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (message.trim() && !disconnected) {
            session.chat(message.trim());
            setMessage("");
          }
        }}
      >
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask Claude to refine this spec…"
          aria-label="Chat message"
          disabled={disconnected}
          className="flex-1 rounded-md border border-line px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:bg-canvas"
        />
        <Button type="submit" disabled={disconnected || busy}>
          Send
        </Button>
      </form>
    </div>
  );
}

function ActivityIndicator({
  connectionState,
  activity,
}: {
  connectionState: ConnectionState;
  activity: SessionActivity;
}) {
  const { color, label } =
    connectionState !== "connected"
      ? { color: "bg-red-500", label: connectionState }
      : activity === "running"
        ? { color: "bg-blue-500 animate-pulse", label: "working" }
        : activity === "awaiting-input"
          ? { color: "bg-amber-500", label: "waiting on you" }
          : { color: "bg-emerald-500", label: "idle" };
  return (
    <span
      className="flex items-center gap-2 text-sm"
      role="status"
      aria-label="Session status"
      aria-live="polite"
    >
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} aria-hidden />
      <span className="font-medium">Session:</span> {label}
    </span>
  );
}
