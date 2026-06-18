import type { FastifyInstance } from "fastify";
import type { ArtifactType } from "@speckit-dashboard/shared";
import { ProjectRegistry } from "../../services/projects/registry.js";
import { discoverSpecs, resolveArtifactPath } from "../../services/specs/discovery.js";
import { readArtifact, writeArtifact } from "../../services/specs/artifacts.js";
import { detectConflict } from "../../services/conflicts/detect.js";
import { createSpec } from "../../services/specs/create.js";

export function registerSpecRoutes(app: FastifyInstance, registry: ProjectRegistry): void {
  // List specs in a project, optionally filtered by ?q= (FR-005, FR-009).
  app.get<{ Params: { projectId: string }; Querystring: { q?: string } }>(
    "/api/projects/:projectId/specs",
    async (req, reply) => {
      const project = registry.get(req.params.projectId);
      if (!project) return reply.code(404).send({ error: "not_found", detail: "project" });

      let specs = discoverSpecs(project.specsPath, project.id);
      const q = req.query.q?.trim().toLowerCase();
      if (q) {
        specs = specs.filter(
          (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
        );
      }
      return specs;
    },
  );

  // Create a new spec scaffold (FR-021); the session's specify step then refines it.
  app.post<{ Params: { projectId: string }; Body: { name?: string; description?: string } }>(
    "/api/projects/:projectId/specs",
    async (req, reply) => {
      const project = registry.get(req.params.projectId);
      if (!project) return reply.code(404).send({ error: "not_found", detail: "project" });

      const name = req.body?.name?.trim();
      if (!name) return reply.code(400).send({ error: "bad_request", detail: "name is required" });

      try {
        const { id } = createSpec(project.specsPath, name, req.body?.description?.trim() ?? "");
        const spec = discoverSpecs(project.specsPath, project.id).find((s) => s.id === id);
        return reply.code(201).send(spec);
      } catch (err) {
        return reply.code(409).send({ error: "conflict", detail: (err as Error).message });
      }
    },
  );

  // Open one spec (FR-006, FR-007, FR-010).
  app.get<{ Params: { projectId: string; specId: string } }>(
    "/api/projects/:projectId/specs/:specId",
    async (req, reply) => {
      const project = registry.get(req.params.projectId);
      if (!project) return reply.code(404).send({ error: "not_found", detail: "project" });
      const spec = discoverSpecs(project.specsPath, project.id).find(
        (s) => s.id === req.params.specId,
      );
      if (!spec) return reply.code(404).send({ error: "not_found", detail: "spec" });
      return spec;
    },
  );

  // Read one artifact's content (FR-007); 404 if the step has not been run (FR-010).
  app.get<{
    Params: { projectId: string; specId: string; type: string };
    Querystring: { path?: string };
  }>("/api/projects/:projectId/specs/:specId/artifacts/:type", async (req, reply) => {
    const project = registry.get(req.params.projectId);
    if (!project) return reply.code(404).send({ error: "not_found", detail: "project" });

    const spec = discoverSpecs(project.specsPath, project.id).find(
      (s) => s.id === req.params.specId,
    );
    if (!spec) return reply.code(404).send({ error: "not_found", detail: "spec" });

    const type = req.params.type as ArtifactType;
    const summary =
      (req.query.path
        ? spec.artifacts.find((a) => a.relativePath === req.query.path)
        : spec.artifacts.find((a) => a.type === type && a.exists)) ?? undefined;

    if (!summary || !summary.exists) {
      return reply.code(404).send({ error: "not_found", detail: "artifact not present" });
    }

    const full = resolveArtifactPath(project.specsPath, spec.id, summary.relativePath);
    if (!full) return reply.code(400).send({ error: "bad_path" });

    const { content, fingerprint } = readArtifact(full);
    return { type: summary.type, relativePath: summary.relativePath, content, fingerprint };
  });

  // Save a direct edit (FR-018); 409 with current content on conflict (FR-020, SC-007).
  app.put<{
    Params: { projectId: string; specId: string; type: string };
    Querystring: { path?: string };
    Body: { content?: string; baselineFingerprint?: string };
  }>("/api/projects/:projectId/specs/:specId/artifacts/:type", async (req, reply) => {
    const project = registry.get(req.params.projectId);
    if (!project) return reply.code(404).send({ error: "not_found", detail: "project" });

    const spec = discoverSpecs(project.specsPath, project.id).find(
      (s) => s.id === req.params.specId,
    );
    if (!spec) return reply.code(404).send({ error: "not_found", detail: "spec" });

    const type = req.params.type as ArtifactType;
    const summary = req.query.path
      ? spec.artifacts.find((a) => a.relativePath === req.query.path)
      : spec.artifacts.find((a) => a.type === type && a.exists);
    if (!summary || !summary.exists) {
      return reply.code(404).send({ error: "not_found", detail: "artifact not present" });
    }

    const { content, baselineFingerprint } = req.body ?? {};
    if (typeof content !== "string" || typeof baselineFingerprint !== "string") {
      return reply
        .code(400)
        .send({ error: "bad_request", detail: "content + baselineFingerprint required" });
    }

    const full = resolveArtifactPath(project.specsPath, spec.id, summary.relativePath);
    if (!full) return reply.code(400).send({ error: "bad_path" });

    const result = detectConflict(full, baselineFingerprint);
    if (result.conflict) {
      return reply.code(409).send({
        error: "conflict",
        currentContent: result.currentContent,
        currentFingerprint: result.currentFingerprint,
      });
    }

    const fingerprint = writeArtifact(full, content);
    return { fingerprint };
  });
}
