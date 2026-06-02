// Eisenhower entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  ARCHIVE_COLS_DDL,
  archiveCols,
  archiveFieldsFromRow,
  archiveMigrations,
  archiveVals,
  auditCols,
  auditVals,
  ENTITIES,
  json,
  parseJson,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { EisenhowerRepository } from "../../repositories/eisenhower.repository.ts";
import type { Eisenhower } from "../../types/eisenhower.types.ts";

export const EISENHOWER_TABLE = "eisenhower";

/** Deserialize a SQLite row to an Eisenhower. */
export function rowToEisenhower(
  row: Record<string, string | number | null>,
): Eisenhower {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    date: (row.date as string) ?? "",
    urgentImportant: parseJson<string[]>(row.urgent_important) ?? [],
    notUrgentImportant: parseJson<string[]>(row.not_urgent_important) ?? [],
    urgentNotImportant: parseJson<string[]>(row.urgent_not_important) ?? [],
    notUrgentNotImportant: parseJson<string[]>(row.not_urgent_not_important) ??
      [],
    project: row.project as string | undefined,
    notes: row.notes as string | undefined,
    ...archiveFieldsFromRow(row),
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${EISENHOWER_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  urgent_important TEXT,
  not_urgent_important TEXT,
  urgent_not_important TEXT,
  not_urgent_not_important TEXT,
  project TEXT,
  notes TEXT,
  ${ARCHIVE_COLS_DDL},
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertRow(
  db: CacheDatabase,
  e: Eisenhower,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${EISENHOWER_TABLE} (id, title, date,
       urgent_important, not_urgent_important,
       urgent_not_important, not_urgent_not_important,
       project, notes,
       ${archiveCols()},
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(e.id),
      val(e.title),
      val(e.date),
      json(e.urgentImportant),
      json(e.notUrgentImportant),
      json(e.urgentNotImportant),
      json(e.notUrgentNotImportant),
      val(e.project),
      val(e.notes),
      ...archiveVals(e),
      ...auditVals(e),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the Eisenhower cache entity. Call from initServices(). */
export function registerEisenhowerEntity(repo: EisenhowerRepository): void {
  const entity: EntityDef = {
    table: EISENHOWER_TABLE,
    schema: SCHEMA,
    migrations: [
      ...archiveMigrations(EISENHOWER_TABLE),
    ],
    fts: {
      type: "eisenhower",
      columns: [
        "id",
        "title",
        "urgent_important",
        "not_urgent_important",
        "urgent_not_important",
        "not_urgent_not_important",
        "notes",
      ],
      titleCol: "title",
      contentCol: "notes",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAllFromDisk();
      for (const e of items) insertRow(db, e, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
