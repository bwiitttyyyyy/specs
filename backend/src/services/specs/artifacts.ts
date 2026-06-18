import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import type { ArtifactType } from "@speckit-dashboard/shared";

/** Map a file path to an artifact type (FR-007). */
export function artifactTypeForFile(filePath: string): ArtifactType {
  const name = basename(filePath).toLowerCase();
  const parent = basename(dirname(filePath)).toLowerCase();
  if (parent === "checklists") return "checklist";
  if (parent === "contracts") return "contract";
  switch (name) {
    case "spec.md":
      return "spec";
    case "plan.md":
      return "plan";
    case "tasks.md":
      return "tasks";
    case "research.md":
      return "research";
    case "data-model.md":
      return "data-model";
    case "quickstart.md":
      return "quickstart";
    default:
      return "other";
  }
}

/** Compute the conflict-detection fingerprint (content hash + mtime) (FR-020). */
export function fingerprintFor(content: string, mtimeMs: number): string {
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 16);
  return `${hash}-${Math.floor(mtimeMs)}`;
}

export interface ReadArtifactResult {
  content: string;
  fingerprint: string;
}

/** Read an artifact's content and compute its fingerprint. */
export function readArtifact(filePath: string): ReadArtifactResult {
  const content = readFileSync(filePath, "utf8");
  const { mtimeMs } = statSync(filePath);
  return { content, fingerprint: fingerprintFor(content, mtimeMs) };
}

/** Write an artifact's content and return its new fingerprint (FR-018). */
export function writeArtifact(filePath: string, content: string): string {
  writeFileSync(filePath, content, "utf8");
  const { mtimeMs } = statSync(filePath);
  return fingerprintFor(content, mtimeMs);
}
