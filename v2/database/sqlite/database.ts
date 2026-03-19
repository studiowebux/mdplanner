/**
 * SQLite Cache Database
 * Pattern: Repository pattern — database connection management
 *
 * Provides SQLite connection for caching markdown data.
 * Cache is optional and derived from markdown (source of truth).
 * Uses Deno's built-in node:sqlite module.
 */

import { DatabaseSync } from "node:sqlite";

export interface QueryResult {
  [key: string]: unknown;
}

export type BindValue = string | number | bigint | null | Uint8Array;
export type BindParams = BindValue[];

const VALID_TABLE_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function assertTableName(name: string): void {
  if (!VALID_TABLE_NAME.test(name)) {
    throw new Error(`Invalid table name: ${name}`);
  }
}

export class CacheDatabase {
  private db: DatabaseSync;
  private dbPath: string;

  constructor(dbPath: string = ".mdplanner.db") {
    this.dbPath = dbPath;
    this.db = new DatabaseSync(dbPath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA synchronous = NORMAL");
    this.db.exec("PRAGMA foreign_keys = ON");

    // Graceful shutdown — close db on process exit to prevent corruption
    const cleanup = () => this.close();
    globalThis.addEventListener("unload", cleanup);
    try { Deno.addSignalListener("SIGINT", cleanup); } catch { /* workers */ }
    try { Deno.addSignalListener("SIGTERM", cleanup); } catch { /* workers */ }
  }

  query<T = QueryResult>(sql: string, params: BindParams = []): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  queryOne<T = QueryResult>(
    sql: string,
    params: BindParams = [],
  ): T | null {
    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params);
    return (row as T) ?? null;
  }

  execute(sql: string, params: BindParams = []): number {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params);
    return Number(result.changes);
  }

  transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN TRANSACTION");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  tableExists(tableName: string): boolean {
    const result = this.queryOne<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName],
    );
    return result !== null;
  }

  count(tableName: string): number {
    assertTableName(tableName);
    const result = this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM "${tableName}"`,
    );
    return result?.count ?? 0;
  }

  truncate(tableName: string): void {
    assertTableName(tableName);
    this.execute(`DELETE FROM "${tableName}"`);
  }

  getPath(): string {
    return this.dbPath;
  }

  private closed = false;

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.db.close();
  }
}
