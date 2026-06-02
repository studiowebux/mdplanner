// Cached markdown repository — adds SQLite read-through cache on top of
// BaseMarkdownRepository disk operations. Subclasses provide table name and
// row-to-entity conversion.

import type { CacheDatabase, QueryResult } from "../database/sqlite/mod.ts";
import type { RepositoryConfig } from "./base.repository.ts";
import { BaseMarkdownRepository } from "./base.repository.ts";
import { log } from "../singletons/logger.ts";

export abstract class CachedMarkdownRepository<
  T extends { id: string },
  C,
  U,
> extends BaseMarkdownRepository<T, C, U> {
  protected cacheDb: CacheDatabase | null = null;

  // Set after any mutation; cleared after a successful fullSync.
  // findAll skips the SQLite cache while dirty so mutations are immediately
  // visible on the next read without wiping the table (findById still hits cache).
  private listDirty = false;

  /** SQLite table name for this entity. */
  protected abstract readonly tableName: string;

  /**
   * Opt-in flag for soft-delete (archive). When true, the cache table is
   * expected to have an `archived` column (gated by an idempotent migration
   * in the entity's cache.ts) and `findAll`/`findArchived` apply SQL filters.
   * Default false — domains that haven't run the rollout get unchanged
   * `SELECT * FROM table` behaviour. See
   * `[architecture] MD Planner — Soft-delete (archive) pattern`.
   */
  protected readonly supportsArchive: boolean = false;

  /** Convert a SQLite row to a domain entity. */
  protected abstract rowToEntity(
    row: Record<string, string | number | null>,
  ): T;

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

  /** Called by fullSync after repopulating the table — re-enables list cache. */
  markClean(): void {
    this.listDirty = false;
  }

  override async findAll(): Promise<T[]> {
    if (this.cacheDb && !this.listDirty) {
      try {
        const count = this.cacheDb.count(this.tableName);
        if (count > 0) {
          const sql = this.supportsArchive
            ? `SELECT * FROM "${this.tableName}" WHERE archived IS NULL OR archived = 0`
            : `SELECT * FROM "${this.tableName}"`;
          return this.cacheDb.query<QueryResult>(sql)
            .map((row) => this.rowToEntity(row));
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

  /**
   * Cached read of archived items. Falls through to disk
   * (`super.findArchived`) when the cache is dirty or unavailable.
   * Cross-domain references to archived items still resolve via `findById`
   * (which is intentionally NOT filtered).
   */
  override async findArchived(): Promise<T[]> {
    if (this.cacheDb && !this.listDirty && this.supportsArchive) {
      try {
        const count = this.cacheDb.count(this.tableName);
        if (count > 0) {
          return this.cacheDb.query<QueryResult>(
            `SELECT * FROM "${this.tableName}" WHERE archived = 1`,
          ).map((row) => this.rowToEntity(row));
        }
      } catch (err) {
        log.warn(
          `[cache] ${this.tableName} archived read failed, falling back to disk:`,
          err,
        );
      }
    }
    return super.findArchived();
  }

  override async findById(id: string): Promise<T | null> {
    if (this.cacheDb) {
      try {
        const row = this.cacheDb.queryOne<QueryResult>(
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
    this.listDirty = true;
    return item;
  }

  override async update(id: string, data: U): Promise<T | null> {
    const updated = await super.update(id, data);
    if (updated) {
      this.listDirty = true;
      this.cacheRemoveRow(id);
    }
    return updated;
  }

  // `delete` is intentionally NOT overridden — it inherits from the base as
  // `delete = archive`, and `archive`'s override below handles cache eviction.

  override async archive(id: string, by?: string): Promise<boolean> {
    const archived = await super.archive(id, by);
    if (archived) {
      this.listDirty = true;
      // Evict the row so the next findById/findAll re-reads from disk with
      // the new archived flag. The next fullSync reseeds.
      this.cacheRemoveRow(id);
    }
    return archived;
  }

  override async restore(id: string): Promise<boolean> {
    const restored = await super.restore(id);
    if (restored) {
      this.listDirty = true;
      this.cacheRemoveRow(id);
    }
    return restored;
  }

  override async hardDelete(id: string): Promise<boolean> {
    const deleted = await super.hardDelete(id);
    if (deleted) {
      this.listDirty = true;
      this.cacheRemoveRow(id);
    }
    return deleted;
  }

  override async upsertEntity(item: T): Promise<T> {
    const result = await super.upsertEntity(item);
    this.listDirty = true;
    this.cacheRemoveRow(item.id);
    return result;
  }

  // Remove a single row after delete — the row is genuinely gone, so this
  // is safe. findById will fall through to disk for the deleted id.
  private cacheRemoveRow(id: string): void {
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
