/**
 * SQLite Cache Schema
 * Pattern: Repository pattern — schema definition
 *
 * Delegates to ENTITIES registry. Adding a new entity requires
 * only a new entry in entities.ts — no changes here.
 */

import type { CacheDatabase } from "./database.ts";
import {
  buildFtsDropSql,
  buildFtsSql,
  ENTITIES,
  FILES_INDEX,
  FILES_SCHEMA,
} from "./entities.ts";

export function initSchema(db: CacheDatabase): void {
  db.exec(FILES_SCHEMA);
  db.exec(FILES_INDEX);
  db.exec(META_SQL);
  for (const entity of ENTITIES) {
    db.exec(entity.schema);
    for (const sql of entity.migrations ?? []) {
      try {
        db.exec(sql);
      } catch {
        // Column already exists — safe to ignore
      }
    }
  }
  for (const entity of ENTITIES) {
    if (entity.fts) {
      db.exec(buildFtsSql(entity));
    }
  }
}

export function dropSchema(db: CacheDatabase): void {
  for (const entity of [...ENTITIES].reverse()) {
    if (entity.fts) {
      db.exec(buildFtsDropSql(entity));
    }
  }
  for (const entity of [...ENTITIES].reverse()) {
    db.exec(`DROP TABLE IF EXISTS "${entity.table}"`);
  }
  db.exec("DROP TABLE IF EXISTS files");
  db.exec("DROP TABLE IF EXISTS cache_meta");
}

const META_SQL = `
CREATE TABLE IF NOT EXISTS cache_meta (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)`;
