// Strategic Levels entity registration for SQLite cache.

import {
  ARCHIVE_COLS_DDL,
  archiveCols,
  archiveFieldsFromRow,
  archiveMigrations,
  archiveVals,
  AUDIT_COLS_DDL,
  auditCols,
  auditVals,
  json,
  parseJson,
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
import type { StrategicLevelsRepository } from "../../repositories/strategic-levels.repository.ts";
import type {
  StrategicLevel,
  StrategicLevelsBuilder,
} from "../../types/strategic-levels.types.ts";
import { LEVEL_ORDER } from "../../types/strategic-levels.types.ts";

export const STRATEGIC_LEVELS_TABLE = "strategic_levels";

/** Deserialize a SQLite row to a StrategicLevelsBuilder. */
export function rowToStrategicLevelsBuilder(
  row: Record<string, string | number | null>,
): StrategicLevelsBuilder {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    date: (row.date as string) ?? new Date().toISOString().slice(0, 10),
    levels: parseJson<StrategicLevel[]>(row.levels) ?? [],
    ...archiveFieldsFromRow(row),
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${STRATEGIC_LEVELS_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  levels TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertRow(
  db: CacheDatabase,
  r: StrategicLevelsBuilder,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${STRATEGIC_LEVELS_TABLE} (id, title, date, levels,
       ${archiveCols()}, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(r.id),
      val(r.title),
      val(r.date),
      json(r.levels),
      ...archiveVals(r),
      ...auditVals(r),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the strategic levels cache entity. Call from initServices(). */
export function registerStrategicLevelsEntity(
  repo: StrategicLevelsRepository,
): void {
  registerEntityCache({
    table: STRATEGIC_LEVELS_TABLE,
    schema: SCHEMA,
    migrations: [
      ...archiveMigrations(STRATEGIC_LEVELS_TABLE),
    ],
    fts: {
      type: "strategic_builder",
      columns: ["id", "title"],
      titleCol: "title",
      contentCol: "title",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertRow,
  });
}

// ---------------------------------------------------------------------------
// Level type label helpers (used by views)
// ---------------------------------------------------------------------------

export const LEVEL_LABELS: Record<string, string> = Object.fromEntries(
  LEVEL_ORDER.map((l) => [l, l.charAt(0).toUpperCase() + l.slice(1)]),
);
