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

  async upsertMany(
    items: T[],
  ): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;
    // deno-lint-ignore no-explicit-any
    const repo = this.repo as any;
    const hasUpsert = typeof repo.upsertEntity === "function";
    for (const item of items) {
      const id = (item as Record<string, unknown>).id as string ?? "?";
      try {
        if (hasUpsert) {
          await repo.upsertEntity(item);
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
