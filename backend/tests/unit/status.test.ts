import { describe, expect, it } from "vitest";
import {
  countTaskCheckboxes,
  deriveStatus,
  hasClarifications,
} from "../../src/services/specs/status.js";

describe("deriveStatus (T020)", () => {
  const base = {
    hasSpec: true,
    hasPlan: false,
    hasTasks: false,
    specHasClarifications: false,
    tasksTotal: 0,
    tasksChecked: 0,
  };

  it("returns 'specified' for a spec-only directory", () => {
    expect(deriveStatus(base)).toBe("specified");
  });

  it("returns 'clarified' when spec has a populated Clarifications section", () => {
    expect(deriveStatus({ ...base, specHasClarifications: true })).toBe("clarified");
  });

  it("returns 'planned' when plan exists (clarified is superseded)", () => {
    expect(deriveStatus({ ...base, specHasClarifications: true, hasPlan: true })).toBe("planned");
  });

  it("returns 'tasks-generated' when tasks exist but none checked", () => {
    expect(deriveStatus({ ...base, hasPlan: true, hasTasks: true, tasksTotal: 10 })).toBe(
      "tasks-generated",
    );
  });

  it("returns 'implementing' when some tasks are checked", () => {
    expect(
      deriveStatus({ ...base, hasPlan: true, hasTasks: true, tasksTotal: 10, tasksChecked: 3 }),
    ).toBe("implementing");
  });

  it("returns 'reviewed' when all tasks are checked", () => {
    expect(
      deriveStatus({ ...base, hasPlan: true, hasTasks: true, tasksTotal: 10, tasksChecked: 10 }),
    ).toBe("reviewed");
  });

  it("still resolves a stage when artifacts are missing (FR-010)", () => {
    expect(deriveStatus({ ...base, hasSpec: false })).toBe("specified");
  });
});

describe("countTaskCheckboxes", () => {
  it("counts total and checked markdown checkboxes", () => {
    const md = ["- [ ] T001 a", "- [x] T002 b", "- [X] T003 c", "not a task"].join("\n");
    expect(countTaskCheckboxes(md)).toEqual({ total: 3, checked: 2 });
  });
});

describe("hasClarifications", () => {
  it("is true only for a non-empty Clarifications section", () => {
    expect(hasClarifications("## Clarifications\n\nQ: foo\nA: bar\n")).toBe(true);
    expect(hasClarifications("## Clarifications\n\n## Next\n")).toBe(false);
    expect(hasClarifications("# Spec\nno section here")).toBe(false);
  });
});
