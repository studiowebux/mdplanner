// Cached markdown repository — adds SQLite read-through cache on top of
// BaseMarkdownRepository disk operations. Subclasses provide table name and
// row-to-entity conversion.

import type { CacheDatabase } from "../database/sqlite/mod.ts";
import type { RepositoryConfig } from "./base.repository.ts";
import { BaseMarkdownRepository } from "./base.repository.ts";
import { log } from "../singletons/logger.ts";

export abstract class CachedMarkdownRepository<
  T extends { id: string },
  C,
  U,
> extends BaseMarkdownRepository<T, C, U> {
  protected cacheDb: CacheDatabase | null = null;

  /** SQLite table name for this entity. */
  protected abstract readonly tableName: string;

  /** Convert a SQLite row to a domain entity. */
  protected abstract rowToEntity(row: Record<string, unknown>): T;

  constructor(projectDir: string, config: RepositoryConfig) {
    super(projectDir, config);
  }

  setCacheDb(db: CacheDatabase): void {
    this.cacheDb = db;
  }

  /** Always read from disk — used by cache sync. */
  async findAllFromDisk(): Promise<T[]> {
    return super.findAll();
  }

  override async findAll(): Promise<T[]> {
    if (this.cacheDb) {
      try {
        const count = this.cacheDb.count(this.tableName);
        if (count > 0) {
          return this.cacheDb.query<Record<string, unknown>>(
            `SELECT * FROM "${this.tableName}"`,
          ).map((row) => this.rowToEntity(row));
        }
      } catch (err) {
        log.warn(
          `[cache] ${this.tableName} read failed, falling back to disk:`,
          err,
        );
      }
    }
    return this.findAllFromDisk();
  }

  override async findById(id: string): Promise<T | null> {
    if (this.cacheDb) {
      try {
        const row = this.cacheDb.queryOne<Record<string, unknown>>(
          `SELECT * FROM "${this.tableName}" WHERE id = ?`,
          [id],
        );
        if (row) return this.rowToEntity(row);
      } catch (err) {
        log.warn(
          `[cache] ${this.tableName} read failed, falling back to disk:`,
          err,
        );
      }
    }
    return super.findById(id);
  }

  override async create(data: C): Promise<T> {
    const item = await super.create(data);
    this.cacheRemove(item.id);
    return item;
  }

  override async update(id: string, data: U): Promise<T | null> {
    const updated = await super.update(id, data);
    if (updated) this.cacheRemove(updated.id);
    return updated;
  }

  override async delete(id: string): Promise<boolean> {
    const deleted = await super.delete(id);
    if (deleted) this.cacheRemove(id);
    return deleted;
  }

  private cacheRemove(id: string): void {
    if (!this.cacheDb) return;
    try {
      this.cacheDb.execute(
        `DELETE FROM "${this.tableName}" WHERE id = ?`,
        [id],
      );
    } catch (err) {
      log.error(`[cache] failed to remove ${this.tableName}/${id}:`, err);
    }
  }
}
