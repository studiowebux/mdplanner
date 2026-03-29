// SWOT entity registration for SQLite cache.
// Called by initServices() after repos are created.

import { ENTITIES, val } from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { SwotRepository } from "../../repositories/swot.repository.ts";
import type { Swot } from "../../types/swot.types.ts";

const TABLE = "swot";

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  strengths TEXT,
  weaknesses TEXT,
  opportunities TEXT,
  threats TEXT,
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
  s: Swot,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${TABLE} (id, title, date,
       strengths, weaknesses, opportunities, threats,
       project, notes, created_at, updated_at, created_by, updated_by, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(s.id),
      val(s.title),
      val(s.date),
      JSON.stringify(s.strengths),
      JSON.stringify(s.weaknesses),
      JSON.stringify(s.opportunities),
      JSON.stringify(s.threats),
      val(s.project),
      val(s.notes),
      val(s.createdAt),
      val(s.updatedAt),
      val(s.createdBy),
      val(s.updatedBy),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the SWOT cache entity. Call from initServices(). */
export function registerSwotEntity(repo: SwotRepository): void {
  const entity: EntityDef = {
    table: TABLE,
    schema: SCHEMA,
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
    sync: async (db, syncedAt) => {
      const items = await repo.findAll();
      for (const s of items) insertRow(db, s, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
