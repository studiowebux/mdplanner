// SWOT entity registration for SQLite cache.
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
import type { SwotRepository } from "../../repositories/swot.repository.ts";
import type { Swot } from "../../types/swot.types.ts";

export const SWOT_TABLE = "swot";

/** Deserialize a SQLite row to a Swot. */
export function rowToSwot(row: Record<string, string | number | null>): Swot {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    date: (row.date as string) ?? "",
    strengths: parseJson<string[]>(row.strengths) ?? [],
    weaknesses: parseJson<string[]>(row.weaknesses) ?? [],
    opportunities: parseJson<string[]>(row.opportunities) ?? [],
    threats: parseJson<string[]>(row.threats) ?? [],
    project: row.project as string | undefined,
    notes: row.notes as string | undefined,
    ...archiveFieldsFromRow(row),
    ...auditFieldsFromRow(row),
  };
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${SWOT_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  strengths TEXT,
  weaknesses TEXT,
  opportunities TEXT,
  threats TEXT,
  project TEXT,
  notes TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertRow(
  db: CacheDatabase,
  s: Swot,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${SWOT_TABLE} (id, title, date,
       strengths, weaknesses, opportunities, threats,
       project, notes, ${archiveCols()}, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(s.id),
      val(s.title),
      val(s.date),
      json(s.strengths),
      json(s.weaknesses),
      json(s.opportunities),
      json(s.threats),
      val(s.project),
      val(s.notes),
      ...archiveVals(s),
      ...auditVals(s),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the SWOT cache entity. Call from initServices(). */
export function registerSwotEntity(repo: SwotRepository): void {
  registerEntityCache({
    table: SWOT_TABLE,
    schema: SCHEMA,
    migrations: [
      ...archiveMigrations(SWOT_TABLE),
    ],
    fts: {
      type: "swot",
      columns: [
        "id",
        "title",
        "strengths",
        "weaknesses",
        "opportunities",
        "threats",
        "notes",
      ],
      titleCol: "title",
      contentCol: "notes",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertRow,
  });
}
