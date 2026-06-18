import type { Project } from "@speckit-dashboard/shared";
import { JsonRepository, type Repository } from "./store.js";

export type ProjectRepository = Repository<Project>;

export function createProjectRepository(dataDir: string): ProjectRepository {
  return new JsonRepository<Project>(dataDir, "projects");
}
