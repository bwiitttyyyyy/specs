import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { ArtifactSummary, Spec } from "@speckit-dashboard/shared";
import { artifactTypeForFile } from "./artifacts.js";
import { countTaskCheckboxes, deriveStatus, hasClarifications } from "./status.js";

const SPEC_DIR_RE = /^(\d{3})-(.+)$/;

/** Canonical lifecycle artifacts that are always reported (exists true/false). */
const CANONICAL_FILES: ReadonlyArray<string> = [
  "spec.md",
  "plan.md",
  "tasks.md",
  "research.md",
  "data-model.md",
  "quickstart.md",
];

function readIfExists(filePath: string): string | null {
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : null;
}

function extractName(specContent: string | null, fallback: string): string {
  if (!specContent) return fallback;
  const heading = specContent.match(/^#\s+(?:Feature Specification:\s*)?(.+?)\s*$/m);
  return heading?.[1]?.trim() || fallback;
}

function listArtifacts(specDir: string): ArtifactSummary[] {
  const summaries: ArtifactSummary[] = [];

  for (const file of CANONICAL_FILES) {
    const full = join(specDir, file);
    summaries.push({
      type: artifactTypeForFile(full),
      relativePath: file,
      exists: existsSync(full),
    });
  }

  // Discovered checklist + contract files (present only).
  for (const sub of ["checklists", "contracts"]) {
    const dir = join(specDir, sub);
    if (existsSync(dir) && statSync(dir).isDirectory()) {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isFile()) {
          summaries.push({
            type: artifactTypeForFile(full),
            relativePath: `${sub}/${entry}`,
            exists: true,
          });
        }
      }
    }
  }

  return summaries;
}

/** Discover all specs in a project's specs directory (FR-005, FR-010). */
export function discoverSpecs(specsPath: string, projectId: string): Spec[] {
  if (!existsSync(specsPath) || !statSync(specsPath).isDirectory()) {
    return [];
  }

  const specs: Spec[] = [];
  for (const entry of readdirSync(specsPath)) {
    const specDir = join(specsPath, entry);
    if (!statSync(specDir).isDirectory()) continue;

    const match = SPEC_DIR_RE.exec(entry);
    const malformed = match === null;
    const number = match?.[1] ?? "";
    const slug = match?.[2] ?? entry;

    const specContent = readIfExists(join(specDir, "spec.md"));
    const tasksContent = readIfExists(join(specDir, "tasks.md"));
    const checkboxes = tasksContent ? countTaskCheckboxes(tasksContent) : { total: 0, checked: 0 };

    const status = deriveStatus({
      hasSpec: existsSync(join(specDir, "spec.md")),
      hasPlan: existsSync(join(specDir, "plan.md")),
      hasTasks: tasksContent !== null,
      specHasClarifications: specContent ? hasClarifications(specContent) : false,
      tasksTotal: checkboxes.total,
      tasksChecked: checkboxes.checked,
    });

    specs.push({
      id: entry,
      number,
      name: extractName(specContent, slug),
      projectId,
      lifecycleStatus: status,
      artifacts: listArtifacts(specDir),
      malformed,
    });
  }

  // Stable ordering by directory name.
  specs.sort((a, b) => a.id.localeCompare(b.id));
  return specs;
}

/** Resolve the absolute path of an artifact by its relative path, guarding traversal. */
export function resolveArtifactPath(
  specsPath: string,
  specId: string,
  relativePath: string,
): string | null {
  const normalized = relativePath.replace(/\\/g, "/");
  if (normalized.includes("..") || normalized.startsWith("/")) return null;
  const full = join(specsPath, specId, normalized);
  if (!full.startsWith(join(specsPath, specId))) return null;
  return full;
}
