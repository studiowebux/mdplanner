// Idea entity registration for SQLite cache.
// Called by initServices() after repos are created.

import { ENTITIES, val } from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { IdeaRepository } from "../../repositories/idea.repository.ts";
import type { Idea } from "../../types/idea.types.ts";

const IDEA_TABLE = "ideas";

const IDEA_SCHEMA = `CREATE TABLE IF NOT EXISTS ${IDEA_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT,
  category TEXT,
  priority TEXT,
  project TEXT,
  start_date TEXT,
  end_date TEXT,
  resources TEXT,
  subtasks TEXT,
  links TEXT,
  implemented_at TEXT,
  cancelled_at TEXT,
  created TEXT,
  updated TEXT,
  synced_at TEXT
)`;

function insertIdeaRow(
  db: CacheDatabase,
  i: Idea,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${IDEA_TABLE} (id, title, description, status,
       category, priority, project, start_date, end_date, resources,
       subtasks, links, implemented_at, cancelled_at,
       created, updated, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(i.id),
      val(i.title),
      val(i.description),
      val(i.status),
      val(i.category),
      val(i.priority),
      val(i.project),
      val(i.startDate),
      val(i.endDate),
      val(i.resources),
      i.subtasks ? JSON.stringify(i.subtasks) : null,
      i.links ? JSON.stringify(i.links) : null,
      val(i.implementedAt),
      val(i.cancelledAt),
      val(i.created),
      val(i.updated),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the idea cache entity. Call from initServices(). */
export function registerIdeaEntity(repo: IdeaRepository): void {
  const entity: EntityDef = {
    table: IDEA_TABLE,
    schema: IDEA_SCHEMA,
    fts: {
      type: "idea",
      columns: ["id", "title", "description"],
      titleCol: "title",
      contentCol: "description",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAll();
      for (const i of items) insertIdeaRow(db, i, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
