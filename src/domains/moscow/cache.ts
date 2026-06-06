// MoSCoW entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  ARCHIVE_COLS_DDL,
  archiveCols,
  archiveFieldsFromRow,
  archiveMigrations,
  archiveVals,
  AUDIT_COLS_DDL,
  auditCols,
  auditFieldsFromRow,
  auditVals,
  json,
  parseJson,
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
import type { MoscowRepository } from "../../repositories/moscow.repository.ts";
import type { Moscow } from "../../types/moscow.types.ts";

export const MOSCOW_TABLE = "moscow";

/** Deserialize a SQLite row to a Moscow. */
export function rowToMoscow(
  row: Record<string, string | number | null>,
): Moscow {
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
    ...archiveFieldsFromRow(row),
    ...auditFieldsFromRow(row),
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
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertRow(
  db: CacheDatabase,
  m: Moscow,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${MOSCOW_TABLE} (id, title, date,
       must, should, could, wont,
       project, notes, ${archiveCols()}, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ...archiveVals(m),
      ...auditVals(m),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the MoSCoW cache entity. Call from initServices(). */
export function registerMoscowEntity(repo: MoscowRepository): void {
  registerEntityCache({
    table: MOSCOW_TABLE,
    schema: SCHEMA,
    migrations: [
      ...archiveMigrations(MOSCOW_TABLE),
    ],
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
    source: () => repo.findAllFromDisk(),
    insert: insertRow,
  });
}
