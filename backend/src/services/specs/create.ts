import { existsSync, mkdirSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SPEC_DIR_RE = /^(\d{3})-/;

/** Next available 3-digit spec number in a specs directory. */
export function nextSpecNumber(specsPath: string): string {
  let max = 0;
  if (existsSync(specsPath) && statSync(specsPath).isDirectory()) {
    for (const entry of readdirSync(specsPath)) {
      const m = SPEC_DIR_RE.exec(entry);
      if (m) max = Math.max(max, Number(m[1]));
    }
  }
  return String(max + 1).padStart(3, "0");
}

/** Turn a feature name into a directory slug. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "feature";
}

export interface CreatedSpec {
  id: string;
  dir: string;
}

/**
 * Scaffold a new spec directory with a starter spec.md (FR-021). This is the
 * dashboard-coordinated part of "create a new spec"; the remote session's
 * /speckit-specify step then populates/refines it. Returns the new spec id.
 */
export function createSpec(specsPath: string, name: string, description: string): CreatedSpec {
  mkdirSync(specsPath, { recursive: true });
  const number = nextSpecNumber(specsPath);
  const id = `${number}-${slugify(name)}`;
  const dir = join(specsPath, id);
  if (existsSync(dir)) {
    throw new Error(`spec directory already exists: ${id}`);
  }
  mkdirSync(dir, { recursive: true });

  const body = [
    `# Feature Specification: ${name}`,
    "",
    `**Feature Branch**: \`${id}\``,
    "",
    "**Status**: Draft",
    "",
    `**Input**: User description: "${description}"`,
    "",
    "## User Scenarios & Testing *(mandatory)*",
    "",
    "_Run /speckit-specify from the session panel to flesh this out._",
    "",
  ].join("\n");
  writeFileSync(join(dir, "spec.md"), body, "utf8");

  return { id, dir };
}
