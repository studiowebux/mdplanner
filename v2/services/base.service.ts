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
}
