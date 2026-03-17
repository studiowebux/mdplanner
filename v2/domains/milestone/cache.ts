/**
 * Milestone entity registration for SQLite cache.
 * Import this module at startup to register the milestone entity.
 */

import { ENTITIES, val } from "../../database/sqlite/mod.ts";
import { getMilestoneService } from "../../singletons/services.ts";
import type { EntityDef } from "../../database/sqlite/mod.ts";

const milestoneEntity: EntityDef = {
  table: "milestones",
  schema: `CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT,
  target TEXT,
  description TEXT,
  project TEXT,
  completed_at TEXT,
  created_at TEXT,
  task_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0
)`,
  fts: {
    type: "milestone",
    columns: ["id", "name", "description"],
    titleCol: "name",
    contentCol: "description",
  },
  sync: async (db) => {
    const milestones = await getMilestoneService().list();
    db.execute("DELETE FROM milestones");
    for (const m of milestones) {
      db.execute(
        `INSERT INTO milestones (id, name, status, target, description, project, completed_at, created_at, task_count, completed_count, progress)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          val(m.id),
          val(m.name),
          val(m.status),
          val(m.target),
          val(m.description),
          val(m.project),
          val(m.completedAt),
          val(m.createdAt),
          m.taskCount,
          m.completedCount,
          m.progress,
        ],
      );
    }
    return milestones.length;
  },
};

ENTITIES.push(milestoneEntity);
