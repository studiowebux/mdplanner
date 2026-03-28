// Goal entity registration for SQLite cache.
// Called by initServices() after repos are created.

import { ENTITIES, val } from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { GoalRepository } from "../../repositories/goal.repository.ts";
import type { Goal } from "../../types/goal.types.ts";

const GOAL_TABLE = "goals";

const GOAL_SCHEMA = `CREATE TABLE IF NOT EXISTS ${GOAL_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT,
  kpi TEXT,
  kpi_metric TEXT,
  kpi_target REAL,
  start_date TEXT,
  end_date TEXT,
  status TEXT,
  github_repo TEXT,
  github_milestone INTEGER,
  linked_portfolio_items TEXT,
  project TEXT,
  created TEXT,
  updated TEXT,
  synced_at TEXT
)`;

function insertGoalRow(
  db: CacheDatabase,
  g: Goal,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${GOAL_TABLE} (id, title, description, type,
       kpi, kpi_metric, kpi_target, start_date, end_date, status,
       github_repo, github_milestone, linked_portfolio_items,
       project, created, updated, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(g.id),
      val(g.title),
      val(g.description),
      val(g.type),
      val(g.kpi),
      val(g.kpiMetric),
      g.kpiTarget ?? null,
      val(g.startDate),
      val(g.endDate),
      val(g.status),
      val(g.githubRepo),
      g.githubMilestone ?? null,
      g.linkedPortfolioItems ? JSON.stringify(g.linkedPortfolioItems) : null,
      val(g.project),
      val(g.created),
      val(g.updated),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the goal cache entity. Call from initServices(). */
export function registerGoalEntity(repo: GoalRepository): void {
  const entity: EntityDef = {
    table: GOAL_TABLE,
    schema: GOAL_SCHEMA,
    fts: {
      type: "goal",
      columns: ["id", "title", "description"],
      titleCol: "title",
      contentCol: "description",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAll();
      for (const g of items) insertGoalRow(db, g, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
