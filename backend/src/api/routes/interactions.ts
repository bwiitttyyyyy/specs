import type { FastifyInstance } from "fastify";
import type { InteractionRecord } from "@speckit-dashboard/shared";
import type { InteractionRepository } from "../../models/interaction.js";

/** Interaction history for a spec (T040, FR-017). */
export function registerInteractionRoutes(
  app: FastifyInstance,
  interactions: InteractionRepository,
): void {
  app.get<{ Params: { projectId: string; specId: string } }>(
    "/api/projects/:projectId/specs/:specId/interactions",
    async (req) => {
      const { projectId, specId } = req.params;
      return interactions
        .list()
        .filter((r: InteractionRecord) => r.projectId === projectId && r.specId === specId)
        .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    },
  );
}
