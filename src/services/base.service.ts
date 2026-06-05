// Base service — standard CRUD pass-through to a repository.
// Subclasses implement applyFilters for domain-specific list filtering.

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
    return this.repo.create(data);
  }

  async update(id: string, data: U): Promise<T | null> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.repo.delete(id);
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
    return this.repo.archive(id, by);
  }

  /** Restore an archived item (clear `archived`/`archivedAt`/`archivedBy`). */
  async restore(id: string): Promise<boolean> {
    if (!this.repo.restore) {
      throw new Error(
        `${this.constructor.name}: restore() not supported by repository`,
      );
    }
    return this.repo.restore(id);
  }

  /** Permanently remove the item from disk (no recovery). */
  async hardDelete(id: string): Promise<boolean> {
    if (!this.repo.hardDelete) {
      throw new Error(
        `${this.constructor.name}: hardDelete() not supported by repository`,
      );
    }
    return this.repo.hardDelete(id);
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
    return { count, errors };
  }
}
