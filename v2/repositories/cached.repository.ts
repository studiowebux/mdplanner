// Cached markdown repository — adds SQLite read-through cache on top of
// BaseMarkdownRepository disk operations. Subclasses provide table name and
// row-to-entity conversion.

import type { CacheDatabase } from "../database/sqlite/mod.ts";
import type { RepositoryConfig } from "./base.repository.ts";
import { BaseMarkdownRepository } from "./base.repository.ts";

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
      } catch { /* fall through to disk */ }
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
      } catch { /* fall through to disk */ }
    }
    return super.findById(id);
  }
}
