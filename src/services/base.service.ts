// Base service — standard CRUD pass-through to a repository.
// Subclasses implement applyFilters for domain-specific list filtering.

import { publish } from "../singletons/event-bus.ts";

/** Minimal repository interface expected by BaseService. */
export interface ReadWriteRepository<T, C, U> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  findByName(name: string): Promise<T | null>;
  create(data: C): Promise<T>;
  update(id: string, data: U): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  // Optional — present on BaseMarkdownRepository-derived repos. Standalone
  // repos (portfolio, project, note, task) gain these in their per-domain
  // soft-delete rollout. BaseService throws when called against a repo that
  // hasn't implemented them — the factory gates calls behind
  // `DomainConfig.supportsArchive` so the throw path is unreachable in
  // properly-configured domains.
  findArchived?(): Promise<T[]>;
  archive?(id: string, by?: string): Promise<boolean>;
  restore?(id: string): Promise<boolean>;
  hardDelete?(id: string): Promise<boolean>;
  // Optional — present on BaseMarkdownRepository-derived repos. When absent,
  // upsertMany falls back to findById + create/update.
  upsertEntity?(item: T): Promise<T>;
}

export abstract class BaseService<
  T,
  C,
  U,
  Options = void,
> {
  constructor(protected repo: ReadWriteRepository<T, C, U>) {}

  /**
   * SSE event prefix for this domain (e.g. "task", "business-model"). Set once
   * at startup from the authoritative `DomainConfig.ssePrefix` (see
   * `createDomainRoutes`). When set, every mutation broadcasts
   * `<ssePrefix>.updated` / `.deleted` so connected browsers live-refresh —
   * regardless of whether the mutation arrived via REST or MCP. The publish
   * lives here (the single business-logic layer), not in the interfaces.
   */
  private ssePrefix?: string;

  setSsePrefix(prefix: string): void {
    this.ssePrefix = prefix;
  }

  protected publishChange(event: "updated" | "deleted" = "updated"): void {
    if (this.ssePrefix) publish(`${this.ssePrefix}.${event}`);
  }

  async list(options?: Options): Promise<T[]> {
    let items = await this.repo.findAll();
    if (options) {
      items = this.applyFilters(items, options);
    }
    return items;
  }

  /** Filter items by domain-specific options. Called only when options is truthy. */
  protected abstract applyFilters(items: T[], options: Options): T[];

  async getById(id: string): Promise<T | null> {
    return this.repo.findById(id);
  }

  async getByName(name: string): Promise<T | null> {
    return this.repo.findByName(name);
  }

  async create(data: C): Promise<T> {
    const created = await this.repo.create(data);
    this.publishChange();
    return created;
  }

  async update(id: string, data: U): Promise<T | null> {
    const updated = await this.repo.update(id, data);
    if (updated) this.publishChange();
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.repo.delete(id);
    if (deleted) this.publishChange("deleted");
    return deleted;
  }

  /**
   * Soft-delete an item (set `archived = true` on disk, stamp
   * `archivedAt`/`archivedBy`). Throws if the underlying repo does not
   * support archive — the factory only routes here for domains with
   * `DomainConfig.supportsArchive !== false`.
   */
  async archive(id: string, by?: string): Promise<boolean> {
    if (!this.repo.archive) {
      throw new Error(
        `${this.constructor.name}: archive() not supported by repository`,
      );
    }
    const archived = await this.repo.archive(id, by);
    if (archived) this.publishChange();
    return archived;
  }

  /** Restore an archived item (clear `archived`/`archivedAt`/`archivedBy`). */
  async restore(id: string): Promise<boolean> {
    if (!this.repo.restore) {
      throw new Error(
        `${this.constructor.name}: restore() not supported by repository`,
      );
    }
    const restored = await this.repo.restore(id);
    if (restored) this.publishChange();
    return restored;
  }

  /** Permanently remove the item from disk (no recovery). */
  async hardDelete(id: string): Promise<boolean> {
    if (!this.repo.hardDelete) {
      throw new Error(
        `${this.constructor.name}: hardDelete() not supported by repository`,
      );
    }
    const removed = await this.repo.hardDelete(id);
    if (removed) this.publishChange("deleted");
    return removed;
  }

  /**
   * List archived items only. Returns [] for repos without archive support
   * (lets callers render an empty archived view without crashing).
   */
  async listArchived(): Promise<T[]> {
    if (!this.repo.findArchived) return [];
    return this.repo.findArchived();
  }

  async upsertMany(
    items: T[],
  ): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;
    const upsertEntity = this.repo.upsertEntity?.bind(this.repo);
    for (const item of items) {
      const id = (item as Record<string, unknown>).id as string ?? "?";
      try {
        if (upsertEntity) {
          await upsertEntity(item);
        } else {
          const existing = await this.repo.findById(id);
          if (existing) {
            await this.repo.update(id, item as unknown as U);
          } else {
            await this.repo.create(item as unknown as C);
          }
        }
        count++;
      } catch (err) {
        errors.push(
          `${id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    if (count > 0) this.publishChange();
    return { count, errors };
  }
}
