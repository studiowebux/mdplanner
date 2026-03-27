// Marketing Plan entity registration for SQLite cache.
// Called by initServices() after repos are created.

import { ENTITIES, val } from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { MarketingPlanRepository } from "../../repositories/marketing-plan.repository.ts";
import type { MarketingPlan } from "../../types/marketing-plan.types.ts";

const TABLE = "marketing_plans";

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${TABLE} (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT,
  budget_total REAL,
  budget_currency TEXT,
  start_date TEXT,
  end_date TEXT,
  target_audiences TEXT,
  channels TEXT,
  campaigns TEXT,
  linked_goals TEXT,
  project TEXT,
  responsible TEXT,
  team TEXT,
  hypothesis TEXT,
  learnings TEXT,
  notes TEXT,
  created TEXT,
  updated TEXT,
  synced_at TEXT
)`;

function insertRow(
  db: CacheDatabase,
  p: MarketingPlan,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${TABLE} (id, name, description, status,
       budget_total, budget_currency, start_date, end_date,
       target_audiences, channels, campaigns, linked_goals,
       project, responsible, team,
       hypothesis, learnings, notes, created, updated, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(p.id),
      val(p.name),
      val(p.description),
      val(p.status),
      p.budgetTotal ?? null,
      val(p.budgetCurrency),
      val(p.startDate),
      val(p.endDate),
      p.targetAudiences ? JSON.stringify(p.targetAudiences) : null,
      p.channels ? JSON.stringify(p.channels) : null,
      p.campaigns ? JSON.stringify(p.campaigns) : null,
      p.linkedGoals ? JSON.stringify(p.linkedGoals) : null,
      val(p.project),
      val(p.responsible),
      p.team ? JSON.stringify(p.team) : null,
      val(p.hypothesis),
      val(p.learnings),
      val(p.notes),
      val(p.created),
      val(p.updated),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the marketing plan cache entity. Call from initServices(). */
export function registerMarketingPlanEntity(
  repo: MarketingPlanRepository,
): void {
  const entity: EntityDef = {
    table: TABLE,
    schema: SCHEMA,
    fts: {
      type: "marketing_plan",
      columns: ["id", "name", "description", "notes"],
      titleCol: "name",
      contentCol: "notes",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAll();
      for (const p of items) insertRow(db, p, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
