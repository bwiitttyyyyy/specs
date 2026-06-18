import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readArtifact, writeArtifact } from "../../src/services/specs/artifacts.js";
import { detectConflict } from "../../src/services/conflicts/detect.js";

let dir: string;
let file: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "conflict-"));
  file = join(dir, "spec.md");
  writeFileSync(file, "original\n");
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("detectConflict (T047, FR-020/SC-007)", () => {
  it("reports no conflict when the baseline matches the on-disk fingerprint", () => {
    const { fingerprint } = readArtifact(file);
    const result = detectConflict(file, fingerprint);
    expect(result.conflict).toBe(false);
  });

  it("reports a conflict and returns current content when the file changed", () => {
    const { fingerprint } = readArtifact(file);
    // Simulate the session / external process changing the file.
    writeArtifact(file, "changed by someone else\n");
    const result = detectConflict(file, fingerprint);
    expect(result.conflict).toBe(true);
    expect(result.currentContent).toBe("changed by someone else\n");
    expect(result.currentFingerprint).not.toBe(fingerprint);
  });

  it("a fresh write produces a baseline that no longer conflicts", () => {
    const newFp = writeArtifact(file, "v2\n");
    expect(detectConflict(file, newFp).conflict).toBe(false);
  });
});
