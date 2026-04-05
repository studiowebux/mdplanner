// Retrospective entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  auditCols,
  auditVals,
  ENTITIES,
  jsonVal,
  parseJson,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { RetrospectiveRepository } from "../../repositories/retrospective.repository.ts";
import type { Retrospective } from "../../types/retrospective.types.ts";

export const RETROSPECTIVE_TABLE = "retrospectives";

/** Deserialize a SQLite row to a Retrospective. */
export function rowToRetrospective(
  row: Record<string, unknown>,
): Retrospective {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    date: row.date as string | undefined,
    status: ((row.status as string) ?? "open") as "open" | "closed",
    continue: parseJson<string[]>(row.continue_items) ?? [],
    stop: parseJson<string[]>(row.stop_items) ?? [],
    start: parseJson<string[]>(row.start_items) ?? [],
    participants: parseJson<string[]>(row.participants_json) ?? [],
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

/** Flatten section arrays to searchable text for FTS. */
function sectionsToText(r: Retrospective): string {
  return [
    ...r.continue,
    ...r.stop,
    ...r.start,
    ...r.participants,
  ].join(" ");
}

const RETROSPECTIVE_SCHEMA =
  `CREATE TABLE IF NOT EXISTS ${RETROSPECTIVE_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  continue_items TEXT,
  stop_items TEXT,
  start_items TEXT,
  participants_json TEXT,
  sections_text TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertRetrospectiveRow(
  db: CacheDatabase,
  r: Retrospective,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${RETROSPECTIVE_TABLE} (id, title, date, status,
       continue_items, stop_items, start_items, participants_json, sections_text,
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(r.id),
      val(r.title),
      val(r.date),
      val(r.status),
      jsonVal(r.continue),
      jsonVal(r.stop),
      jsonVal(r.start),
      jsonVal(r.participants),
      sectionsToText(r),
      ...auditVals(r),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the retrospective cache entity. Call from initServices(). */
export function registerRetrospectiveEntity(
  repo: RetrospectiveRepository,
): void {
  const entity: EntityDef = {
    table: RETROSPECTIVE_TABLE,
    schema: RETROSPECTIVE_SCHEMA,
    fts: {
      type: "retrospective",
      columns: ["id", "title", "sections_text"],
      titleCol: "title",
      contentCol: "sections_text",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAll();
      for (const r of items) insertRetrospectiveRow(db, r, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
