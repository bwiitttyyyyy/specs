import { readArtifact } from "../specs/artifacts.js";

export interface ConflictResult {
  /** True when the on-disk file changed since the baseline was captured. */
  conflict: boolean;
  currentContent: string;
  currentFingerprint: string;
}

/**
 * Detect whether an artifact changed on disk since the editor captured its
 * baseline fingerprint (T049, FR-020, SC-007). A save must be blocked when this
 * returns `conflict: true` so neither side is silently overwritten.
 */
export function detectConflict(filePath: string, baselineFingerprint: string): ConflictResult {
  const { content, fingerprint } = readArtifact(filePath);
  return {
    conflict: fingerprint !== baselineFingerprint,
    currentContent: content,
    currentFingerprint: fingerprint,
  };
}
