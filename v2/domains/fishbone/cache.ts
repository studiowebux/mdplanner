// Fishbone entity registration for SQLite cache.
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
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${FISHBONE_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  project TEXT,
  causes TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertRow(
  db: CacheDatabase,
  f: Fishbone,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${FISHBONE_TABLE} (id, title, description,
       project, causes, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(f.id),
      val(f.title),
      val(f.description),
      val(f.project),
      json(f.causes),
      ...auditVals(f),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the fishbone cache entity. Call from initServices(). */
export function registerFishboneEntity(repo: FishboneRepository): void {
  const entity: EntityDef = {
    table: FISHBONE_TABLE,
    schema: SCHEMA,
    fts: {
      type: "fishbone",
      columns: ["id", "title", "description", "causes"],
      titleCol: "title",
      contentCol: "description",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAllFromDisk();
      for (const f of items) insertRow(db, f, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
