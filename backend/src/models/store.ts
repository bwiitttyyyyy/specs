import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Minimal durable key-collection store backed by a JSON file.
 *
 * NOTE (documented deviation from plan.md/data-model.md): the plan specifies
 * SQLite (better-sqlite3) for dashboard-local state. This environment lacks a C
 * toolchain, so the native driver cannot build. The MVP (US1) only needs the
 * Project registry, so this JSON-backed repository stands in behind the same
 * `Repository` interface. Swapping to a SQLite implementation later is localized
 * to this file. Spec files on disk remain the source of truth either way.
 */
export interface Repository<T extends { id: string }> {
  list(): T[];
  get(id: string): T | undefined;
  upsert(entity: T): T;
  delete(id: string): boolean;
}

export class JsonRepository<T extends { id: string }> implements Repository<T> {
  private readonly file: string;
  private cache: T[];

  constructor(dataDir: string, name: string) {
    this.file = join(dataDir, `${name}.json`);
    mkdirSync(dirname(this.file), { recursive: true });
    this.cache = existsSync(this.file) ? this.read() : [];
  }

  private read(): T[] {
    try {
      return JSON.parse(readFileSync(this.file, "utf8")) as T[];
    } catch {
      return [];
    }
  }

  private flush(): void {
    writeFileSync(this.file, JSON.stringify(this.cache, null, 2), "utf8");
  }

  list(): T[] {
    return [...this.cache];
  }

  get(id: string): T | undefined {
    return this.cache.find((e) => e.id === id);
  }

  upsert(entity: T): T {
    const idx = this.cache.findIndex((e) => e.id === entity.id);
    if (idx >= 0) this.cache[idx] = entity;
    else this.cache.push(entity);
    this.flush();
    return entity;
  }

  delete(id: string): boolean {
    const before = this.cache.length;
    this.cache = this.cache.filter((e) => e.id !== id);
    if (this.cache.length === before) return false;
    this.flush();
    return true;
  }
}
