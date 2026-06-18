import type { InteractionRecord } from "@speckit-dashboard/shared";
import { JsonRepository, type Repository } from "./store.js";

/**
 * Append-only interaction history (commands + chat). Used by US2; defined here
 * in the foundational phase so the persistence layer is complete. The MVP (US1)
 * does not write to it.
 */
export type InteractionRepository = Repository<InteractionRecord>;

export function createInteractionRepository(dataDir: string): InteractionRepository {
  return new JsonRepository<InteractionRecord>(dataDir, "interactions");
}
