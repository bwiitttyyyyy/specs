import type {
  ConnectionState,
  InteractionKind,
  SessionActivity,
  SessionState,
} from "@speckit-dashboard/shared";
import type { AdapterEvent, SessionAdapter } from "./adapter.js";

export type SessionListener = (event: AdapterEvent) => void;
export type StateListener = (state: SessionState) => void;

/**
 * Session: connection + activity state machine over a SessionAdapter (T036).
 *
 *   connectionState: disconnected → connecting → connected; any → disconnected on drop.
 *   activity:        idle → running → (awaiting-input → running)* → idle.
 *
 * State is always derivable so the UI can surface it (FR-003/004, SC-004).
 */
export class Session {
  private connectionState: ConnectionState = "disconnected";
  private activity: SessionActivity = "idle";
  private currentInteractionId: string | null = null;
  private readonly stateListeners = new Set<StateListener>();

  constructor(private readonly adapter: SessionAdapter) {}

  get state(): SessionState {
    return {
      connectionState: this.connectionState,
      activity: this.activity,
      currentInteractionId: this.currentInteractionId,
    };
  }

  onStateChange(cb: StateListener): () => void {
    this.stateListeners.add(cb);
    return () => this.stateListeners.delete(cb);
  }

  private setConnection(state: ConnectionState): void {
    this.connectionState = state;
    this.emitState();
  }

  private setActivity(activity: SessionActivity): void {
    this.activity = activity;
    this.emitState();
  }

  private emitState(): void {
    const snapshot = this.state;
    for (const cb of this.stateListeners) cb(snapshot);
  }

  async connect(): Promise<void> {
    if (this.connectionState === "connected") return;
    this.setConnection("connecting");
    try {
      await this.adapter.connect();
      this.setConnection("connected");
    } catch (err) {
      this.setConnection("disconnected");
      throw err;
    }
  }

  /** Simulate / handle an underlying transport drop (FR-004, SC-005). */
  drop(): void {
    this.adapter.disconnect();
    this.currentInteractionId = null;
    this.activity = "idle";
    this.setConnection("disconnected");
  }

  run(interactionId: string, kind: InteractionKind, input: string, onEvent: SessionListener): void {
    if (this.connectionState !== "connected") throw new Error("session not connected");
    this.currentInteractionId = interactionId;
    this.setActivity("running");
    this.adapter.run(interactionId, kind, input, (event) => {
      if (event.kind === "clarification") {
        this.setActivity("awaiting-input");
      } else if (event.kind === "end") {
        this.currentInteractionId = null;
        this.setActivity("idle");
      }
      onEvent(event);
    });
  }

  answer(interactionId: string, answer: string): void {
    this.setActivity("running");
    this.adapter.answer(interactionId, answer);
  }

  cancel(interactionId: string): void {
    this.adapter.cancel(interactionId);
  }
}
