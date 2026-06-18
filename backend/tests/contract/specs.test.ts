import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { Project, Spec } from "@speckit-dashboard/shared";
import { buildServer } from "../../src/api/server.js";
import { ProjectRegistry } from "../../src/services/projects/registry.js";
import { JsonRepository } from "../../src/models/store.js";

const AUTH = { authorization: "Bearer test-token" };
let app: FastifyInstance;
let tmp: string;
let specsPath: string;
let projectId: string;

beforeAll(async () => {
  tmp = mkdtempSync(join(tmpdir(), "speckit-test-"));
  specsPath = join(tmp, "specs");
  // A well-formed spec with spec + plan + tasks (partially checked → implementing).
  const specDir = join(specsPath, "001-demo-feature");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(join(specDir, "spec.md"), "# Feature Specification: Demo Feature\n");
  writeFileSync(join(specDir, "plan.md"), "# Plan\n");
  writeFileSync(join(specDir, "tasks.md"), "- [x] T001 done\n- [ ] T002 todo\n");
  // A malformed directory (no NNN- prefix).
  mkdirSync(join(specsPath, "scratch-notes"), { recursive: true });

  const registry = new ProjectRegistry(new JsonRepository<Project>(join(tmp, "data"), "projects"));
  const project = registry.register(
    { name: "Demo", specsPath, sessionTarget: "local" },
    new Date().toISOString(),
  );
  projectId = project.id;

  app = buildServer(
    {
      port: 0,
      host: "127.0.0.1",
      authToken: "test-token",
      dataDir: join(tmp, "data"),
      adapterMode: "mock",
    },
    { registry },
  );
  await app.ready();
});

afterAll(async () => {
  await app.close();
  rmSync(tmp, { recursive: true, force: true });
});

describe("specs endpoints (T021)", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const res = await app.inject({ method: "GET", url: `/api/projects/${projectId}/specs` });
    expect(res.statusCode).toBe(401);
  });

  it("lists specs with derived status and flags malformed dirs", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/specs`,
      headers: AUTH,
    });
    expect(res.statusCode).toBe(200);
    const specs = res.json() as Spec[];
    const demo = specs.find((s) => s.id === "001-demo-feature");
    const scratch = specs.find((s) => s.id === "scratch-notes");
    expect(demo?.name).toBe("Demo Feature");
    expect(demo?.lifecycleStatus).toBe("implementing");
    expect(demo?.malformed).toBe(false);
    expect(scratch?.malformed).toBe(true);
  });

  it("filters by ?q=", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/specs?q=demo`,
      headers: AUTH,
    });
    const specs = res.json() as Spec[];
    expect(specs.every((s) => s.id.includes("demo") || s.name.toLowerCase().includes("demo"))).toBe(
      true,
    );
    expect(specs.length).toBe(1);
  });

  it("reads an artifact's content + fingerprint", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/specs/001-demo-feature/artifacts/spec`,
      headers: AUTH,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { content: string; fingerprint: string };
    expect(body.content).toContain("Demo Feature");
    expect(body.fingerprint).toMatch(/^[0-9a-f]{16}-\d+$/);
  });

  it("returns 404 for an artifact whose step has not run", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/specs/001-demo-feature/artifacts/research`,
      headers: AUTH,
    });
    expect(res.statusCode).toBe(404);
  });

  it("saves an edit when the baseline fingerprint matches (FR-018)", async () => {
    const read = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/specs/001-demo-feature/artifacts/spec`,
      headers: AUTH,
    });
    const { fingerprint } = read.json() as { fingerprint: string };
    const res = await app.inject({
      method: "PUT",
      url: `/api/projects/${projectId}/specs/001-demo-feature/artifacts/spec`,
      headers: AUTH,
      payload: {
        content: "# Feature Specification: Demo Feature (edited)\n",
        baselineFingerprint: fingerprint,
      },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { fingerprint: string }).fingerprint).not.toBe(fingerprint);
  });

  it("rejects a save with a stale baseline as 409 + current content (FR-020, SC-007)", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/projects/${projectId}/specs/001-demo-feature/artifacts/spec`,
      headers: AUTH,
      payload: { content: "clobber\n", baselineFingerprint: "stale-0" },
    });
    expect(res.statusCode).toBe(409);
    const body = res.json() as { error: string; currentContent: string };
    expect(body.error).toBe("conflict");
    expect(body.currentContent).toContain("Demo Feature");
  });

  it("creates a new spec and lists it (FR-021)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/specs`,
      headers: AUTH,
      payload: { name: "Brand New Thing", description: "make it great" },
    });
    expect(res.statusCode).toBe(201);
    const spec = res.json() as Spec;
    expect(spec.id).toMatch(/^\d{3}-brand-new-thing$/);
    expect(spec.lifecycleStatus).toBe("specified");

    const list = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/specs`,
      headers: AUTH,
    });
    expect((list.json() as Spec[]).some((s) => s.id === spec.id)).toBe(true);
  });
});
