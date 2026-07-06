// Cached service — extends BaseService with SQLite cache write-through.
// Subclasses provide table name and insertRow for cache upsert.

import type { CacheDatabase, CacheSync } from "../database/sqlite/mod.ts";
import type { ReadWriteRepository } from "./base.service.ts";
import { BaseService } from "./base.service.ts";

export abstract class CachedService<
  T extends { id: string },
  C,
  U,
  Options = void,
> extends BaseService<T, C, U, Options> {
  private cache: CacheSync | null = null;

  /** SQLite table name for this entity. */
  protected abstract readonly tableName: string;

  /** Insert or replace a row in the cache table. */
  protected abstract insertRow(db: CacheDatabase, item: T): void;

  constructor(repo: ReadWriteRepository<T, C, U>) {
    super(repo);
  }

  setCache(cache: CacheSync): void {
    this.cache = cache;
  }

  protected cacheUpsert(item: T): void {
    if (!this.cache) return;
    this.cache.remove(this.tableName, item.id);
    this.insertRow(this.cache.getDb(), item);
  }

  protected cacheRemove(id: string): void {
    this.cache?.remove(this.tableName, id);
  }

  override async create(data: C): Promise<T> {
    const created = await super.create(data);
    this.cacheUpsert(created);
    return created;
  }

  override async update(id: string, data: U): Promise<T | null> {
    const updated = await super.update(id, data);
    if (updated) this.cacheUpsert(updated);
    return updated;
  }

  override async delete(id: string): Promise<boolean> {
    const deleted = await super.delete(id);
    if (deleted) this.cacheRemove(id);
    return deleted;
  }
}
