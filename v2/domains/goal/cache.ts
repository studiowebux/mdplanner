// Goal entity registration for SQLite cache.
// Called by initServices() after repos are created.

import { ENTITIES, parseJson, val } from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { GoalRepository } from "../../repositories/goal.repository.ts";
import type { Goal } from "../../types/goal.types.ts";

export const GOAL_TABLE = "goals";

/** Deserialize a SQLite row to a Goal. */
export function rowToGoal(row: Record<string, unknown>): Goal {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    description: (row.description as string) ?? "",
    type: (row.type as Goal["type"]) ?? "project",
    kpi: (row.kpi as string) ?? "",
    kpiMetric: row.kpi_metric as string | undefined,
    kpiTarget: row.kpi_target != null ? Number(row.kpi_target) : undefined,
    startDate: (row.start_date as string) ?? "",
    endDate: (row.end_date as string) ?? "",
    status: (row.status as Goal["status"]) ?? "planning",
    githubRepo: row.github_repo as string | undefined,
    githubMilestone: row.github_milestone != null
      ? Number(row.github_milestone)
      : undefined,
    linkedPortfolioItems: parseJson<string[]>(row.linked_portfolio_items),
    project: row.project as string | undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

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
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
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
       project, created_at, updated_at, created_by, updated_by, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      val(g.createdAt),
      val(g.updatedAt),
      val(g.createdBy),
      val(g.updatedBy),
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
