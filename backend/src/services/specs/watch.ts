import { watch, type FSWatcher } from "node:fs";
import { join } from "node:path";
import { artifactTypeForFile } from "./artifacts.js";
import type { ArtifactType } from "@speckit-dashboard/shared";

export type FileChangeListener = (artifactType: ArtifactType, relativePath: string) => void;

/**
 * Watches a spec directory and reports artifact changes (T038, FR-016).
 * Recursive where supported; debounced so a burst of writes yields one event
 * per file. Best-effort — failures to watch never crash the session.
 */
export class SpecWatcher {
  private watcher: FSWatcher | null = null;
  private readonly debounce = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly specsPath: string,
    private readonly specId: string,
  ) {}

  start(listener: FileChangeListener): void {
    const dir = join(this.specsPath, this.specId);
    try {
      this.watcher = watch(dir, { recursive: true }, (_event, filename) => {
        if (!filename) return;
        const rel = filename.toString().replace(/\\/g, "/");
        const prev = this.debounce.get(rel);
        if (prev) clearTimeout(prev);
        this.debounce.set(
          rel,
          setTimeout(() => {
            this.debounce.delete(rel);
            listener(artifactTypeForFile(join(dir, rel)), rel);
          }, 100),
        );
      });
    } catch {
      /* watching unavailable (platform / permissions) — degrade gracefully */
    }
  }

  stop(): void {
    this.watcher?.close();
    this.watcher = null;
    for (const t of this.debounce.values()) clearTimeout(t);
    this.debounce.clear();
  }
}
