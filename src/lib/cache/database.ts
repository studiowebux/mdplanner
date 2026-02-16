/**
 * SQLite Cache Database
 * Pattern: Repository pattern - database connection management
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

export class CacheDatabase {
  private db: DatabaseSync;
  private dbPath: string;

  constructor(dbPath: string = ".mdplanner.db") {
    this.dbPath = dbPath;
    this.db = new DatabaseSync(dbPath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA synchronous = NORMAL");
    this.db.exec("PRAGMA foreign_keys = ON");
  }

  /**
   * Execute a query and return all rows.
   */
  query<T = QueryResult>(sql: string, params: BindParams = []): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  /**
   * Execute a query and return first row or null.
   */
  queryOne<T = QueryResult>(sql: string, params: BindParams = []): T | null {
    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params);
    return (row as T) ?? null;
  }

  /**
   * Execute a statement (INSERT, UPDATE, DELETE).
   */
  execute(sql: string, params: BindParams = []): number {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params);
    return Number(result.changes);
  }

  /**
   * Execute multiple statements in a transaction.
   */
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

  /**
   * Execute raw SQL (for schema creation).
   */
  exec(sql: string): void {
    this.db.exec(sql);
  }

  /**
   * Check if a table exists.
   */
  tableExists(tableName: string): boolean {
    const result = this.queryOne<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName],
    );
    return result !== null;
  }

  /**
   * Get row count for a table.
   */
  count(tableName: string): number {
    const result = this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${tableName}`,
    );
    return result?.count ?? 0;
  }

  /**
   * Clear all data from a table.
   */
  truncate(tableName: string): void {
    this.execute(`DELETE FROM ${tableName}`);
  }

  /**
   * Get database file path.
   */
  getPath(): string {
    return this.dbPath;
  }

  /**
   * Close the database connection.
   */
  close(): void {
    this.db.close();
  }
}
