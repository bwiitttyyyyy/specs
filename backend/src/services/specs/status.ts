import type { LifecycleStatus } from "@speckit-dashboard/shared";

/** Signals derived from a spec directory used to compute lifecycle status. */
export interface StatusSignals {
  hasSpec: boolean;
  hasPlan: boolean;
  hasTasks: boolean;
  /** spec.md contains a populated "## Clarifications" section. */
  specHasClarifications: boolean;
  /** Total task checkboxes in tasks.md (0 if none/absent). */
  tasksTotal: number;
  /** Checked task checkboxes in tasks.md. */
  tasksChecked: number;
}

/**
 * Derive lifecycle status from artifact presence/content (FR-005, FR-010).
 * Pure and deterministic — covered by unit tests. Returns the highest stage the
 * present artifacts justify; a directory missing artifacts still resolves to a
 * valid earlier stage rather than failing.
 */
export function deriveStatus(s: StatusSignals): LifecycleStatus {
  if (s.hasTasks && s.tasksTotal > 0 && s.tasksChecked === s.tasksTotal) {
    return "reviewed";
  }
  if (s.hasTasks && s.tasksChecked > 0) {
    return "implementing";
  }
  if (s.hasTasks) {
    return "tasks-generated";
  }
  if (s.hasPlan) {
    return "planned";
  }
  if (s.specHasClarifications) {
    return "clarified";
  }
  return "specified";
}

/** Count total and checked markdown task checkboxes in tasks.md content. */
export function countTaskCheckboxes(tasksContent: string): { total: number; checked: number } {
  const total = (tasksContent.match(/^- \[[ xX]\]/gm) ?? []).length;
  const checked = (tasksContent.match(/^- \[[xX]\]/gm) ?? []).length;
  return { total, checked };
}

/** True if spec.md has a non-empty "## Clarifications" section. */
export function hasClarifications(specContent: string): boolean {
  const lines = specContent.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##+\s+Clarifications\s*$/.test(l));
  if (start === -1) return false;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^##+\s+/.test(line)) break; // next heading ends the section
    if (line.trim().length > 0) return true;
  }
  return false;
}
