/**
 * Cache Sync Engine
 * Pattern: Observer pattern - syncs markdown changes to SQLite cache
 *
 * Delegates to ENTITIES registry. Adding a new entity requires
 * only a new entry in entities.ts — no changes here.
 */

import { CacheDatabase } from "./database.ts";
import { dropSchema, initSchema } from "./schema.ts";
import type { DirectoryMarkdownParser } from "../parser/directory/parser.ts";
import { ENTITIES } from "./entities.ts";

export interface SyncResult {
  tables: number;
  items: number;
  duration: number;
  errors: string[];
}

export interface SyncOptions {
  tables?: string[]; // Specific tables to sync, or all if empty
  force?: boolean; // Force rebuild even if cache exists
}

/** All syncable table names, derived from the registry. */
export const ALL_TABLES: string[] = ENTITIES.map((e) => e.table);

/**
 * Synchronizes markdown data to SQLite cache.
 */
export class CacheSync {
  private lastSyncTime: Date | null = null;

  constructor(
    private parser: DirectoryMarkdownParser,
    private db: CacheDatabase,
  ) {}

  /**
   * Initialize cache schema.
   */
  init(): void {
    initSchema(this.db);
    this.setMeta("initialized", new Date().toISOString());
  }

  /**
   * Full sync: rebuild entire cache from markdown in a single transaction.
   * If any table fails, the entire sync is rolled back so the cache
   * never lands in a partially-synced state.
   */
  async fullSync(options?: SyncOptions): Promise<SyncResult> {
    const start = Date.now();
    const result: SyncResult = { tables: 0, items: 0, duration: 0, errors: [] };
    const tables = options?.tables ?? ALL_TABLES;

    this.db.exec("BEGIN TRANSACTION");
    try {
      for (const table of tables) {
        const count = await this.syncTable(table);
        result.tables++;
        result.items += count;
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      result.errors.push(`sync rolled back: ${error}`);
      result.duration = Date.now() - start;
      return result;
    }

    this.lastSyncTime = new Date();
    this.setMeta("last_sync", this.lastSyncTime.toISOString());
    result.duration = Date.now() - start;

    return result;
  }

  /**
   * Rebuild cache: drop and recreate all tables.
   */
  async rebuild(): Promise<SyncResult> {
    dropSchema(this.db);
    initSchema(this.db);
    return this.fullSync({ force: true });
  }

  /**
   * Sync a single table.
   */
  private async syncTable(table: string): Promise<number> {
    const entity = ENTITIES.find((e) => e.table === table);
    if (!entity) {
      throw new Error(`Unknown table: ${table}`);
    }
    return entity.sync(this.parser, this.db);
  }

  /**
   * Get last sync time.
   */
  getLastSyncTime(): Date | null {
    if (this.lastSyncTime) return this.lastSyncTime;
    const meta = this.getMeta("last_sync");
    return meta ? new Date(meta) : null;
  }

  /**
   * Check if cache needs sync.
   * Returns true if a successful full sync has never been recorded.
   */
  needsSync(): boolean {
    return this.getMeta("last_sync") === null;
  }

  /**
   * Set metadata value.
   */
  private setMeta(key: string, value: string): void {
    this.db.execute(
      "INSERT OR REPLACE INTO cache_meta (key, value, updated_at) VALUES (?, ?, ?)",
      [key, value, new Date().toISOString()],
    );
  }

  /**
   * Get metadata value.
   */
  private getMeta(key: string): string | null {
    const row = this.db.queryOne<{ value: string }>(
      "SELECT value FROM cache_meta WHERE key = ?",
      [key],
    );
    return row?.value ?? null;
  }
}
