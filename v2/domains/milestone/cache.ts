// Milestone entity registration for SQLite cache.
// Called by initServices() after repos are created.

import { ENTITIES, val } from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { MilestoneRepository } from "../../repositories/milestone.repository.ts";
import type { MilestoneBase } from "../../types/milestone.types.ts";
import { MILESTONE_SCHEMA, MILESTONE_TABLE } from "./constants.cache.ts";

/** Deserialize a SQLite row to a MilestoneBase. */
export function rowToMilestone(row: Record<string, unknown>): MilestoneBase {
  const m: MilestoneBase = {
    id: row.id as string,
    name: row.name as string,
    status: (row.status as MilestoneBase["status"]) ?? "open",
  };
  if (row.target != null) m.target = row.target as string;
  if (row.description != null) m.description = row.description as string;
  if (row.project != null) m.project = row.project as string;
  if (row.completed_at != null) m.completedAt = row.completed_at as string;
  if (row.created_at != null) m.createdAt = row.created_at as string;
  return m;
}

/** Insert or replace a MilestoneBase in the cache table. */
export function insertMilestoneRow(
  db: CacheDatabase,
  m: MilestoneBase,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${MILESTONE_TABLE} (id, name, status, target, description, project, completed_at, created_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(m.id),
      val(m.name),
      val(m.status),
      val(m.target),
      val(m.description),
      val(m.project),
      val(m.completedAt),
      val(m.createdAt),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the milestone cache entity. Call from initServices(). */
export function registerMilestoneEntity(repo: MilestoneRepository): void {
  const entity: EntityDef = {
    table: MILESTONE_TABLE,
    schema: MILESTONE_SCHEMA,
    fts: {
      type: "milestone",
      columns: ["id", "name", "description"],
      titleCol: "name",
      contentCol: "description",
    },
    sync: async (db, syncedAt) => {
      const milestones = await repo.findAllFromDisk();
      for (const m of milestones) insertMilestoneRow(db, m, syncedAt);
      return milestones.length;
    },
  };
  ENTITIES.push(entity);
}
