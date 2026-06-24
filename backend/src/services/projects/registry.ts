import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { NewProject, Project } from "@speckit-dashboard/shared";
import type { ProjectRepository } from "../../models/project.js";

export class RegistryError extends Error {
  constructor(
    message: string,
    readonly code: "validation" | "not_found" | "conflict",
  ) {
    super(message);
    this.name = "RegistryError";
  }
}

/** Project registry: register / list / activate (FR-001, FR-002). */
export class ProjectRegistry {
  constructor(private readonly repo: ProjectRepository) {}

  list(): Project[] {
    return this.repo.list().sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));
  }

  get(id: string): Project | undefined {
    return this.repo.get(id);
  }

  register(input: NewProject, now: string): Project {
    const name = input.name?.trim();
    if (!name) throw new RegistryError("name is required", "validation");
    if (this.repo.list().some((p) => p.name === name)) {
      throw new RegistryError(`project name '${name}' already exists`, "conflict");
    }
    const specsPath = resolve(input.specsPath ?? "");
    if (!existsSync(specsPath) || !statSync(specsPath).isDirectory()) {
      throw new RegistryError(
        `specsPath does not exist or is not a directory: ${specsPath}`,
        "validation",
      );
    }
    const project: Project = {
      id: randomUUID(),
      name,
      specsPath,
      sessionTarget: input.sessionTarget?.trim() || randomUUID(),
      createdAt: now,
      lastActiveAt: now,
    };
    return this.repo.upsert(project);
  }

  activate(id: string, now: string): Project {
    const project = this.repo.get(id);
    if (!project) throw new RegistryError(`project not found: ${id}`, "not_found");
    return this.repo.upsert({ ...project, lastActiveAt: now });
  }
}
