import { mkdtempSync, mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSpec, nextSpecNumber, slugify } from "../../src/services/specs/create.js";

let specsPath: string;

beforeEach(() => {
  specsPath = mkdtempSync(join(tmpdir(), "create-"));
});
afterEach(() => rmSync(specsPath, { recursive: true, force: true }));

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("My New Feature!")).toBe("my-new-feature");
    expect(slugify("  OAuth2 / API  ")).toBe("oauth2-api");
    expect(slugify("")).toBe("feature");
  });
});

describe("nextSpecNumber (T058)", () => {
  it("starts at 001 in an empty directory", () => {
    expect(nextSpecNumber(specsPath)).toBe("001");
  });
  it("returns max+1 zero-padded", () => {
    mkdirSync(join(specsPath, "001-a"));
    mkdirSync(join(specsPath, "007-b"));
    mkdirSync(join(specsPath, "scratch")); // ignored (non-conforming)
    expect(nextSpecNumber(specsPath)).toBe("008");
  });
});

describe("createSpec", () => {
  it("scaffolds the next-numbered spec with a starter spec.md", () => {
    const { id } = createSpec(specsPath, "Cool Feature", "do the thing");
    expect(id).toBe("001-cool-feature");
    const file = join(specsPath, id, "spec.md");
    expect(existsSync(file)).toBe(true);
    const content = readFileSync(file, "utf8");
    expect(content).toContain("# Feature Specification: Cool Feature");
    expect(content).toContain("do the thing");
  });
});
