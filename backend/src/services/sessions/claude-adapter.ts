import type { InteractionKind } from "@speckit-dashboard/shared";
import type { EmitFn, SessionAdapter } from "./adapter.js";

/**
 * Attaches to a real, externally provisioned remote Claude session via the
 * Claude Agent SDK / Claude Code headless mode (stub).
 *
 * Provisioning, authentication, and model selection happen OUTSIDE this app
 * (see spec.md Assumptions). This adapter would:
 *   1. connect(): attach to the session identified by `sessionTarget`, bound to
 *      the project's working directory, and begin consuming its streamed event
 *      feed (assistant text, tool calls, permission/ask events, results).
 *   2. run(): send the speckit slash-command prompt or chat turn to the session.
 *   3. map the session's streamed events → AdapterEvent (output / clarification /
 *      end), translating the session's "ask the user a question" events into
 *      `clarification` so FR-014 can be satisfied from the dashboard.
 *   4. answer()/cancel(): forward the user's reply / interrupt to the session.
 *
 * It is intentionally not wired up here because this environment has no live
 * session to attach to; MockSessionAdapter is the default. Selection happens in
 * SessionManager based on configuration.
 */
export class ClaudeSessionAdapter implements SessionAdapter {
  constructor(private readonly sessionTarget: string) {}

  async connect(): Promise<void> {
    throw new Error(
      `ClaudeSessionAdapter is not configured in this environment (target: ${this.sessionTarget}). ` +
        "Provision a remote Claude session and wire the Agent SDK to enable it.",
    );
  }

  disconnect(): void {
    /* no-op until wired */
  }

  run(_interactionId: string, _kind: InteractionKind, _input: string, _emit: EmitFn): void {
    throw new Error("ClaudeSessionAdapter not configured");
  }

  answer(_interactionId: string, _answer: string): void {
    throw new Error("ClaudeSessionAdapter not configured");
  }

  cancel(_interactionId: string): void {
    throw new Error("ClaudeSessionAdapter not configured");
  }
}
