import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { APIRequestContext } from "@playwright/test";

const API = "http://127.0.0.1:4317";
const AUTH = { authorization: "Bearer dev-token" };

/** Create a throwaway specs directory containing one sample spec. */
export function makeFixtureSpecs(opts: { withSample?: boolean } = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "speckit-e2e-fixture-"));
  if (opts.withSample ?? true) {
    const specDir = join(dir, "001-sample-feature");
    mkdirSync(specDir, { recursive: true });
    writeFileSync(
      join(specDir, "spec.md"),
      "# Feature Specification: Sample Feature\n\n## Overview\n\nA sample spec for e2e testing.\n",
    );
    writeFileSync(join(specDir, "plan.md"), "# Plan\n\nThe plan.\n");
    writeFileSync(join(specDir, "tasks.md"), "- [ ] T001 do a thing\n- [ ] T002 do another\n");
  }
  return dir;
}

export function cleanupFixture(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

/** Register a project via the API and return its id. */
export async function seedProject(
  request: APIRequestContext,
  name: string,
  specsPath: string,
): Promise<string> {
  const res = await request.post(`${API}/api/projects`, {
    headers: AUTH,
    data: { name, specsPath, sessionTarget: "mock" },
  });
  const body = (await res.json()) as { id: string };
  return body.id;
}
