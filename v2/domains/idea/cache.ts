// Idea entity registration for SQLite cache.
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
import type { IdeaRepository } from "../../repositories/idea.repository.ts";
import type { Idea } from "../../types/idea.types.ts";

export const IDEA_TABLE = "ideas";

/** Deserialize a SQLite row to an Idea. */
export function rowToIdea(row: Record<string, string | number | null>): Idea {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    status: (row.status as Idea["status"]) ?? "new",
    category: row.category as string | undefined,
    priority: row.priority as Idea["priority"] | undefined,
    project: row.project as string | undefined,
    submittedBy: row.submitted_by as string | undefined,
    startDate: row.start_date as string | undefined,
    endDate: row.end_date as string | undefined,
    resources: row.resources as string | undefined,
    subtasks: parseJson<string[]>(row.subtasks),
    description: row.description as string | undefined,
    links: parseJson<string[]>(row.links),
    implementedAt: row.implemented_at as string | undefined,
    cancelledAt: row.cancelled_at as string | undefined,
    archived: row.archived === 1 || row.archived === "1" ? true : undefined,
    archivedAt: row.archived_at as string | undefined,
    archivedBy: row.archived_by as string | undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const IDEA_SCHEMA = `CREATE TABLE IF NOT EXISTS ${IDEA_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT,
  category TEXT,
  priority TEXT,
  project TEXT,
  submitted_by TEXT,
  start_date TEXT,
  end_date TEXT,
  resources TEXT,
  subtasks TEXT,
  links TEXT,
  implemented_at TEXT,
  cancelled_at TEXT,
  archived INTEGER DEFAULT 0,
  archived_at TEXT,
  archived_by TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertIdeaRow(
  db: CacheDatabase,
  i: Idea,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${IDEA_TABLE} (id, title, description, status,
       category, priority, project, submitted_by, start_date, end_date, resources,
       subtasks, links, implemented_at, cancelled_at,
       archived, archived_at, archived_by,
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(i.id),
      val(i.title),
      val(i.description),
      val(i.status),
      val(i.category),
      val(i.priority),
      val(i.project),
      val(i.submittedBy),
      val(i.startDate),
      val(i.endDate),
      val(i.resources),
      jsonVal(i.subtasks),
      jsonVal(i.links),
      val(i.implementedAt),
      val(i.cancelledAt),
      i.archived ? 1 : 0,
      val(i.archivedAt),
      val(i.archivedBy),
      ...auditVals(i),
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
    migrations: [
      `ALTER TABLE ${IDEA_TABLE} ADD COLUMN submitted_by TEXT`,
      `ALTER TABLE ${IDEA_TABLE} ADD COLUMN archived INTEGER DEFAULT 0`,
      `ALTER TABLE ${IDEA_TABLE} ADD COLUMN archived_at TEXT`,
      `ALTER TABLE ${IDEA_TABLE} ADD COLUMN archived_by TEXT`,
    ],
    sync: async (db, syncedAt) => {
      const items = await repo.findAllFromDisk();
      for (const i of items) insertIdeaRow(db, i, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
