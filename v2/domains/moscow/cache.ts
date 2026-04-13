// MoSCoW entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  auditCols,
  auditVals,
  ENTITIES,
  json,
  parseJson,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { MoscowRepository } from "../../repositories/moscow.repository.ts";
import type { Moscow } from "../../types/moscow.types.ts";

export const MOSCOW_TABLE = "moscow";

/** Deserialize a SQLite row to a Moscow. */
export function rowToMoscow(row: Record<string, unknown>): Moscow {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    date: (row.date as string) ?? "",
    must: parseJson<string[]>(row.must) ?? [],
    should: parseJson<string[]>(row.should) ?? [],
    could: parseJson<string[]>(row.could) ?? [],
    wont: parseJson<string[]>(row.wont) ?? [],
    project: row.project as string | undefined,
    notes: row.notes as string | undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${MOSCOW_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  must TEXT,
  should TEXT,
  could TEXT,
  wont TEXT,
  project TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertRow(
  db: CacheDatabase,
  m: Moscow,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${MOSCOW_TABLE} (id, title, date,
       must, should, could, wont,
       project, notes, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(m.id),
      val(m.title),
      val(m.date),
      json(m.must),
      json(m.should),
      json(m.could),
      json(m.wont),
      val(m.project),
      val(m.notes),
      ...auditVals(m),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the MoSCoW cache entity. Call from initServices(). */
export function registerMoscowEntity(repo: MoscowRepository): void {
  const entity: EntityDef = {
    table: MOSCOW_TABLE,
    schema: SCHEMA,
    fts: {
      type: "moscow",
      columns: [
        "id",
        "title",
        "must",
        "should",
        "could",
        "wont",
        "notes",
      ],
      titleCol: "title",
      contentCol: "notes",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAll();
      for (const m of items) insertRow(db, m, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
