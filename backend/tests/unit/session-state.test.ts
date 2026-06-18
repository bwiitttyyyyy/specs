import { describe, expect, it } from "vitest";
import { MockSessionAdapter } from "../../src/services/sessions/adapter.js";
import { Session } from "../../src/services/sessions/session.js";
import type { SessionState } from "@speckit-dashboard/shared";

function track(session: Session): SessionState[] {
  const states: SessionState[] = [];
  session.onStateChange((s) => states.push(s));
  return states;
}

describe("Session state machine (T032)", () => {
  it("transitions disconnected → connecting → connected on connect", async () => {
    const session = new Session(new MockSessionAdapter());
    const states = track(session);
    await session.connect();
    expect(states.map((s) => s.connectionState)).toEqual(["connecting", "connected"]);
  });

  it("runs idle → running → idle for a simple interaction", async () => {
    const session = new Session(new MockSessionAdapter());
    await session.connect();
    const states = track(session);
    await new Promise<void>((resolve) => {
      session.run("i1", "command", "/speckit-plan", (e) => {
        if (e.kind === "end") resolve();
      });
    });
    const activity = states.map((s) => s.activity);
    expect(activity[0]).toBe("running");
    expect(activity.at(-1)).toBe("idle");
  });

  it("enters awaiting-input on clarification then returns to running and idle", async () => {
    const session = new Session(new MockSessionAdapter());
    await session.connect();
    const seen: string[] = [];
    session.onStateChange((s) => seen.push(s.activity));
    await new Promise<void>((resolve) => {
      session.run("i2", "command", "/speckit-clarify ASK", (e) => {
        if (e.kind === "clarification") session.answer("i2", "A");
        if (e.kind === "end") resolve();
      });
    });
    expect(seen).toContain("awaiting-input");
    expect(seen.at(-1)).toBe("idle");
  });

  it("drop() resets to disconnected/idle (FR-004, SC-005)", async () => {
    const session = new Session(new MockSessionAdapter());
    await session.connect();
    session.drop();
    expect(session.state.connectionState).toBe("disconnected");
    expect(session.state.activity).toBe("idle");
  });
});
