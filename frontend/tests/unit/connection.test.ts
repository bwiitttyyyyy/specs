import { beforeEach, describe, expect, it } from "vitest";
import { useSessionStore } from "../../src/state/connection";

// Unit test for the session store reducer (pure state logic behind US2).
describe("session store applyFrame", () => {
  beforeEach(() => useSessionStore.getState().reset());

  it("associates a started interaction id with the queued input", () => {
    const s = useSessionStore.getState();
    s.noteSent("command", "/speckit-plan");
    s.applyFrame({
      type: "status",
      connectionState: "connected",
      activity: "running",
      interactionId: "i1",
    });

    const state = useSessionStore.getState();
    expect(state.activity).toBe("running");
    expect(state.interactions).toHaveLength(1);
    expect(state.interactions[0]).toMatchObject({
      id: "i1",
      input: "/speckit-plan",
      kind: "command",
    });
  });

  it("appends streamed output in order", () => {
    const s = useSessionStore.getState();
    s.noteSent("command", "/x");
    s.applyFrame({
      type: "status",
      connectionState: "connected",
      activity: "running",
      interactionId: "i1",
    });
    s.applyFrame({ type: "output", interactionId: "i1", chunk: "hello " });
    s.applyFrame({ type: "output", interactionId: "i1", chunk: "world" });
    expect(useSessionStore.getState().interactions[0].output).toBe("hello world");
  });

  it("tracks clarification then clears it on interaction end", () => {
    const s = useSessionStore.getState();
    s.applyFrame({
      type: "clarification",
      interactionId: "i1",
      question: "Which?",
      options: ["A", "B"],
    });
    expect(useSessionStore.getState().clarification?.question).toBe("Which?");
    s.applyFrame({ type: "interaction_end", interactionId: "i1", status: "completed" });
    expect(useSessionStore.getState().clarification).toBeNull();
  });

  it("bumps the file-change tick on file_changed (FR-016)", () => {
    const before = useSessionStore.getState().fileChangeTick;
    useSessionStore
      .getState()
      .applyFrame({ type: "file_changed", specId: "s1", artifactType: "spec" });
    expect(useSessionStore.getState().fileChangeTick).toBe(before + 1);
  });
});
