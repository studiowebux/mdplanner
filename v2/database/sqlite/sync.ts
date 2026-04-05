/**
 * Cache Sync Engine
 * Pattern: Observer pattern — syncs markdown changes to SQLite cache
 *
 * Delegates to ENTITIES registry. Adding a new entity requires
 * only a new entry in entities.ts — no changes here.
 */

import { log } from "../../singletons/logger.ts";
import type { CacheDatabase } from "./database.ts";
import { dropSchema, initSchema } from "./schema.ts";
import { ENTITIES, json } from "./entities.ts";

export type SyncResult = {
  tables: number;
  items: number;
  duration: number;
  errors: string[];
};

export type SyncOptions = {
  /** Specific tables to sync, or all if empty */
  tables?: string[];
  /** Force rebuild even if cache exists */
  force?: boolean;
};

export function getAllTables(): string[] {
  return ENTITIES.map((e) => e.table);
}

export class CacheSync {
  private lastSyncTime: Date | null = null;

  constructor(private db: CacheDatabase) {}

  /** Expose underlying database for read queries by services. */
  getDb(): CacheDatabase {
    return this.db;
  }

  init(): void {
    initSchema(this.db);
    if (this.schemaNeedsRebuild()) {
      dropSchema(this.db);
      initSchema(this.db);
    }
    this.setMeta("initialized", new Date().toISOString());
  }

  /** Detect schema mismatch by checking for known columns on entity tables. */
  private schemaNeedsRebuild(): boolean {
    for (const entity of ENTITIES) {
      try {
        this.db.query(
          `SELECT synced_at, created_by FROM "${entity.table}" LIMIT 0`,
        );
      } catch (err) {
        log.warn(`[cache] schema check failed for ${entity.table}:`, err);
        return true;
      }
    }
    return false;
  }

  async fullSync(options?: SyncOptions): Promise<SyncResult> {
    const start = Date.now();
    const result: SyncResult = {
      tables: 0,
      items: 0,
      duration: 0,
      errors: [],
    };
    const tables = options?.tables ?? getAllTables();

    const syncTimestamp = new Date().toISOString();

    this.db.exec("BEGIN TRANSACTION");
    try {
      for (const table of tables) {
        const count = await this.syncTable(table, syncTimestamp);
        result.tables++;
        result.items += count;
      }
      // Purge rows not touched during this sync (deleted from disk)
      for (const table of tables) {
        this.db.execute(
          `DELETE FROM "${table}" WHERE synced_at IS NULL OR synced_at < ?`,
          [syncTimestamp],
        );
      }
      // Mark files not touched during this sync as stale
      for (const table of tables) {
        this.db.execute(
          `UPDATE files SET stale = 1
           WHERE entity_type = ? AND last_synced_at < ?`,
          [table, syncTimestamp],
        );
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      result.errors.push(`sync rolled back: ${error}`);
      result.duration = Date.now() - start;
      return result;
    }

    // Rebuild FTS indexes after sync to ensure consistency
    this.rebuildFts();

    this.lastSyncTime = new Date();
    this.setMeta("last_sync", this.lastSyncTime.toISOString());
    result.duration = Date.now() - start;
    return result;
  }

  async rebuild(): Promise<SyncResult> {
    dropSchema(this.db);
    initSchema(this.db);
    return this.fullSync({ force: true });
  }

  private async syncTable(
    table: string,
    syncedAt: string,
  ): Promise<number> {
    const entity = ENTITIES.find((e) => e.table === table);
    if (!entity) {
      throw new Error(`Unknown table: ${table}`);
    }
    return entity.sync(this.db, syncedAt);
  }

  upsert(table: string, record: Record<string, unknown>): void {
    const cols = Object.keys(record);
    const placeholders = cols.map(() => "?").join(", ");
    const values = cols.map((k) => {
      const v = record[k];
      if (v === undefined || v === null) return null;
      if (
        typeof v === "string" ||
        typeof v === "number" ||
        typeof v === "bigint"
      ) return v as string | number | bigint;
      if (v instanceof Uint8Array) return v;
      return json(v);
    });
    this.db.execute(
      `INSERT OR REPLACE INTO "${table}" (${
        cols.join(", ")
      }) VALUES (${placeholders})`,
      values,
    );
  }

  remove(table: string, id: string): void {
    this.db.execute(`DELETE FROM "${table}" WHERE id = ?`, [id]);
    this.db.execute(
      `UPDATE files SET stale = 1 WHERE entity_type = ? AND entity_id = ?`,
      [table, id],
    );
  }

  upsertFile(
    entityType: string,
    entityId: string,
    filePath: string,
    rawContent: string,
    contentHash: string,
  ): void {
    const now = new Date().toISOString();
    this.db.execute(
      `INSERT OR REPLACE INTO files
       (entity_type, entity_id, file_path, raw_content, content_hash, updated_at, last_synced_at, stale)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [entityType, entityId, filePath, rawContent, contentHash, now, now],
    );
  }

  purgeStale(): number {
    return this.db.execute(`DELETE FROM files WHERE stale = 1`);
  }

  listStale(): Array<
    { entity_type: string; entity_id: string; file_path: string }
  > {
    return this.db.query(
      `SELECT entity_type, entity_id, file_path FROM files WHERE stale = 1`,
    );
  }

  async syncOneTable(table: string): Promise<void> {
    await this.fullSync({ tables: [table] });
  }

  getLastSyncTime(): Date | null {
    if (this.lastSyncTime) return this.lastSyncTime;
    const meta = this.getMeta("last_sync");
    return meta ? new Date(meta) : null;
  }

  needsSync(): boolean {
    return this.getMeta("last_sync") === null;
  }

  rebuildFts(): void {
    for (const entity of ENTITIES) {
      if (entity.fts) {
        try {
          this.db.exec(
            `INSERT INTO ${entity.table}_fts(${entity.table}_fts) VALUES('rebuild')`,
          );
        } catch (err) {
          log.warn(`[cache] FTS rebuild failed for ${entity.table}:`, err);
        }
      }
    }
  }

  private setMeta(key: string, value: string): void {
    this.db.execute(
      "INSERT OR REPLACE INTO cache_meta (key, value, updated_at) VALUES (?, ?, ?)",
      [key, value, new Date().toISOString()],
    );
  }

  private getMeta(key: string): string | null {
    const row = this.db.queryOne<{ value: string }>(
      "SELECT value FROM cache_meta WHERE key = ?",
      [key],
    );
    return row?.value ?? null;
  }
}
