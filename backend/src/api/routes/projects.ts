import type { FastifyInstance } from "fastify";
import type { ProjectWithSession, SessionState } from "@speckit-dashboard/shared";
import { ProjectRegistry, RegistryError } from "../../services/projects/registry.js";

/** US2 wires real session state; until then the session reports disconnected. */
const STUB_SESSION: SessionState = { connectionState: "disconnected", activity: "idle" };

export function registerProjectRoutes(app: FastifyInstance, registry: ProjectRegistry): void {
  app.get("/api/projects", async () => {
    const projects: ProjectWithSession[] = registry
      .list()
      .map((p) => ({ ...p, session: STUB_SESSION }));
    return projects;
  });

  app.post("/api/projects", async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    try {
      const project = registry.register(
        {
          name: String(body.name ?? ""),
          specsPath: String(body.specsPath ?? ""),
          sessionTarget: typeof body.sessionTarget === "string" ? body.sessionTarget : undefined,
        },
        new Date().toISOString(),
      );
      return reply.code(201).send(project);
    } catch (err) {
      if (err instanceof RegistryError) {
        return reply.code(400).send({ error: err.code, detail: err.message });
      }
      throw err;
    }
  });

  app.post<{ Params: { projectId: string } }>(
    "/api/projects/:projectId/activate",
    async (req, reply) => {
      try {
        const project = registry.activate(req.params.projectId, new Date().toISOString());
        return { project, session: STUB_SESSION };
      } catch (err) {
        if (err instanceof RegistryError && err.code === "not_found") {
          return reply.code(404).send({ error: "not_found", detail: err.message });
        }
        throw err;
      }
    },
  );
}
