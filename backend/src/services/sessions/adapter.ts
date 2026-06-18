import type { InteractionKind, InteractionStatus } from "@speckit-dashboard/shared";

/**
 * SessionAdapter abstracts the remote Claude session (T036). The dashboard does
 * not provision or pick a model — it attaches to an already-running session and
 * drives it. Two implementations exist:
 *   - MockSessionAdapter: deterministic, used by tests and local dev.
 *   - ClaudeSessionAdapter: attaches to a real session via the Claude Agent SDK
 *     / Claude Code headless mode (stubbed; requires external provisioning).
 */

export type AdapterEvent =
  | { kind: "output"; interactionId: string; chunk: string }
  | { kind: "clarification"; interactionId: string; question: string; options?: string[] }
  | { kind: "end"; interactionId: string; status: InteractionStatus };

export type EmitFn = (event: AdapterEvent) => void;

export interface SessionAdapter {
  connect(): Promise<void>;
  disconnect(): void;
  /** Start a command or chat interaction; events are delivered via `emit`. */
  run(interactionId: string, kind: InteractionKind, input: string, emit: EmitFn): void;
  /** Provide an answer to a pending clarification. */
  answer(interactionId: string, answer: string): void;
  /** Cancel a running interaction. */
  cancel(interactionId: string): void;
}

/**
 * Deterministic in-memory adapter. Behaviour is keyed off the input so tests can
 * exercise every path:
 *   - input containing "ASK" → emits a clarification, then resumes after answer.
 *   - otherwise → streams a few chunks then ends "completed".
 *   - cancel() → ends "cancelled".
 */
export class MockSessionAdapter implements SessionAdapter {
  private connected = false;
  private readonly active = new Map<
    string,
    { emit: EmitFn; timers: ReturnType<typeof setTimeout>[]; awaiting: boolean }
  >();

  async connect(): Promise<void> {
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
    for (const [, entry] of this.active) {
      entry.timers.forEach(clearTimeout);
    }
    this.active.clear();
  }

  run(interactionId: string, kind: InteractionKind, input: string, emit: EmitFn): void {
    if (!this.connected) throw new Error("session not connected");
    const entry = { emit, timers: [] as ReturnType<typeof setTimeout>[], awaiting: false };
    this.active.set(interactionId, entry);

    const label = kind === "command" ? `Running ${input}` : `Thinking about: ${input}`;
    entry.timers.push(
      setTimeout(() => emit({ kind: "output", interactionId, chunk: `${label}\n` }), 5),
    );

    if (input.includes("ASK")) {
      entry.timers.push(
        setTimeout(() => {
          entry.awaiting = true;
          emit({
            kind: "clarification",
            interactionId,
            question: "Which option do you want?",
            options: ["A", "B"],
          });
        }, 10),
      );
      return;
    }

    this.finish(interactionId);
  }

  answer(interactionId: string, answer: string): void {
    const entry = this.active.get(interactionId);
    if (!entry || !entry.awaiting) return;
    entry.awaiting = false;
    entry.emit({ kind: "output", interactionId, chunk: `Using answer: ${answer}\n` });
    this.finish(interactionId);
  }

  cancel(interactionId: string): void {
    const entry = this.active.get(interactionId);
    if (!entry) return;
    entry.timers.forEach(clearTimeout);
    entry.emit({ kind: "end", interactionId, status: "cancelled" });
    this.active.delete(interactionId);
  }

  private finish(interactionId: string): void {
    const entry = this.active.get(interactionId);
    if (!entry) return;
    entry.timers.push(
      setTimeout(() => entry.emit({ kind: "output", interactionId, chunk: "Done.\n" }), 5),
    );
    entry.timers.push(
      setTimeout(() => {
        entry.emit({ kind: "end", interactionId, status: "completed" });
        this.active.delete(interactionId);
      }, 10),
    );
  }
}
