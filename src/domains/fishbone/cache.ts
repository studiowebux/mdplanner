// Fishbone entity registration for SQLite cache.
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
import type { FishboneRepository } from "../../repositories/fishbone.repository.ts";
import type { Fishbone, FishboneCause } from "../../types/fishbone.types.ts";

export const FISHBONE_TABLE = "fishbone";

/** Deserialize a SQLite row to a Fishbone. */
export function rowToFishbone(
  row: Record<string, string | number | null>,
): Fishbone {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    description: row.description as string | undefined,
    project: row.project as string | undefined,
    causes: parseJson<FishboneCause[]>(row.causes) ?? [],
    ...archiveFieldsFromRow(row),
    ...auditFieldsFromRow(row),
  };
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${FISHBONE_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  project TEXT,
  causes TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertRow(
  db: CacheDatabase,
  f: Fishbone,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${FISHBONE_TABLE} (id, title, description,
       project, causes,
       ${archiveCols()},
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(f.id),
      val(f.title),
      val(f.description),
      val(f.project),
      json(f.causes),
      ...archiveVals(f),
      ...auditVals(f),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the fishbone cache entity. Call from initServices(). */
export function registerFishboneEntity(repo: FishboneRepository): void {
  registerEntityCache({
    table: FISHBONE_TABLE,
    schema: SCHEMA,
    migrations: [
      ...archiveMigrations(FISHBONE_TABLE),
    ],
    fts: {
      type: "fishbone",
      columns: ["id", "title", "description", "causes"],
      titleCol: "title",
      contentCol: "description",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertRow,
  });
}
