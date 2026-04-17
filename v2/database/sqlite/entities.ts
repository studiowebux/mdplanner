/**
 * Entity Registry
 * Pattern: Registry pattern — single source of truth for all cached entities
 *
 * To add a new entity:
 *   1. Add one EntityDef object to the ENTITIES array below.
 *   2. That is the entire interface.
 *
 * schema.ts, sync.ts, and search.ts iterate this array.
 * No other files need to change.
 */

import { log } from "../../singletons/logger.ts";
import type { BindValue, CacheDatabase } from "./database.ts";

// ============================================================
// Types
// ============================================================

export type FTSConfig = {
  /** SearchResult.type value (e.g. "task", "note") */
  type: string;
  /** Columns in the FTS virtual table; must match base table columns */
  columns: string[];
  /** Which column becomes SearchResult.title */
  titleCol: string;
  /** Which column is used for snippet() */
  contentCol: string;
};

/**
 * Sync function signature for v2. Each entity provides a function that
 * reads from v2 services and populates the cache table. Returns row count.
 * syncedAt: ISO timestamp stamped on each row for version-based cleanup.
 */
export type TableSyncer = (
  db: CacheDatabase,
  syncedAt: string,
) => Promise<number>;

export type EntityDef = {
  table: string;
  /** Full CREATE TABLE IF NOT EXISTS ... SQL */
  schema: string;
  /** Present = FTS enabled; absent = cached only */
  fts?: FTSConfig;
  sync: TableSyncer;
  /** Called after a successful sync for this table — repos use this to clear their listDirty flag. */
  onSyncComplete?: () => void;
  /** SQL statements run after schema creation for idempotent column migrations. Errors are silently ignored (column may already exist). */
  migrations?: string[];
};

// ============================================================
// Helpers (exported so schema.ts / sync.ts can reuse them)
// ============================================================

// deno-lint-ignore no-explicit-any
export function val(v: any): BindValue {
  if (v === undefined) return null;
  if (v === null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return v;
  if (v instanceof Uint8Array) return v;
  return String(v);
}

// deno-lint-ignore no-explicit-any
export function json(v: any): string {
  return JSON.stringify(v ?? []);
}

/**
 * Serialize a nullable array or object to JSON, returning null when absent.
 * Use in cache INSERT functions for optional columns.
 * `parseJson` treats both null and "[]" as undefined on read, so empty
 * arrays stored as null vs "[]" are semantically equivalent.
 */
export function jsonVal(v: unknown): string | null {
  if (v == null) return null;
  return JSON.stringify(v);
}

/** Column fragment for the four standard audit fields. */
export function auditCols(): string {
  return "created_at, updated_at, created_by, updated_by";
}

/** Values for the four standard audit fields, matching auditCols() order. */
export function auditVals(e: {
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
}): BindValue[] {
  return [
    val(e.createdAt),
    val(e.updatedAt),
    val(e.createdBy),
    val(e.updatedBy),
  ];
}

/** Parse a JSON string from a cache column back to a typed value. */
export function parseJson<T>(v: unknown): T | undefined {
  if (v == null || v === "[]" || v === "null") return undefined;
  try {
    const parsed = JSON.parse(v as string);
    return Array.isArray(parsed) && parsed.length === 0 ? undefined : parsed;
  } catch (err) {
    log.warn("[cache] JSON parse failed:", err);
    return undefined;
  }
}

// ============================================================
// FTS SQL generators
// ============================================================

export function buildFtsSql(def: EntityDef): string {
  const { table, fts } = def;
  if (!fts) return "";
  const colList = fts.columns.join(", ");
  const newVals = fts.columns.map((c) => `new.${c}`).join(", ");
  const oldVals = fts.columns.map((c) => `old.${c}`).join(", ");
  return `
CREATE VIRTUAL TABLE IF NOT EXISTS ${table}_fts USING fts5(
  ${fts.columns.join(",\n  ")},
  content='${table}',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS ${table}_ai AFTER INSERT ON ${table} BEGIN
  INSERT INTO ${table}_fts(rowid, ${colList})
  VALUES (new.rowid, ${newVals});
END;

CREATE TRIGGER IF NOT EXISTS ${table}_ad AFTER DELETE ON ${table} BEGIN
  INSERT INTO ${table}_fts(${table}_fts, rowid, ${colList})
  VALUES ('delete', old.rowid, ${oldVals});
END;

CREATE TRIGGER IF NOT EXISTS ${table}_au AFTER UPDATE ON ${table} BEGIN
  INSERT INTO ${table}_fts(${table}_fts, rowid, ${colList})
  VALUES ('delete', old.rowid, ${oldVals});
  INSERT INTO ${table}_fts(rowid, ${colList})
  VALUES (new.rowid, ${newVals});
END;
`.trim();
}

export function buildFtsDropSql(def: EntityDef): string {
  const { table, fts } = def;
  if (!fts) return "";
  return `
DROP TRIGGER IF EXISTS ${table}_ai;
DROP TRIGGER IF EXISTS ${table}_ad;
DROP TRIGGER IF EXISTS ${table}_au;
DROP TABLE IF EXISTS ${table}_fts;
`.trim();
}

// ============================================================
// Files table — shared file-to-entity mapping
// ============================================================

/**
 * Central mapping from (entity_type, entity_id) to filesystem location.
 * Enables O(1) file lookup by ID, change detection via content_hash,
 * and raw markdown access for MCP tools.
 */
/**
 * Staleness rule: during fullSync, each entity syncer touches `last_synced_at`
 * on every file row it processes. After sync completes, rows where
 * `last_synced_at < sync_started_at` are stale (file deleted or renamed).
 * Consumers query `stale = 1` to list orphans; a periodic sweep can purge them.
 */
export const FILES_SCHEMA = `CREATE TABLE IF NOT EXISTS files (
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  raw_content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_synced_at TEXT DEFAULT CURRENT_TIMESTAMP,
  stale INTEGER DEFAULT 0,
  PRIMARY KEY (entity_type, entity_id)
)`;

export const FILES_INDEX = `CREATE INDEX IF NOT EXISTS idx_files_path
  ON files(file_path);
CREATE INDEX IF NOT EXISTS idx_files_stale
  ON files(stale) WHERE stale = 1`;

// ============================================================
// Entity Registry
// ============================================================

export const ENTITIES: EntityDef[] = [
  // Entities are registered by domain modules.
  // Import and push into this array from domain-specific files,
  // or add inline definitions below.
];
