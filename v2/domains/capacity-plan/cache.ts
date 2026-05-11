// Capacity plan entity registration for SQLite cache.
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
import type { CapacityPlanRepository } from "../../repositories/capacity-plan.repository.ts";
import type { CapacityPlan } from "../../types/capacity-plan.types.ts";

export const CAPACITY_PLAN_TABLE = "capacity_plans";

/** Deserialize a SQLite row to a CapacityPlan. */
export function rowToCapacityPlan(
  row: Record<string, string | number | null>,
): CapacityPlan {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    date: (row.date as string) ?? "",
    budgetHours: row.budget_hours != null
      ? Number(row.budget_hours)
      : undefined,
    teamMembers: parseJson(row.team_members) ?? [],
    allocations: parseJson(row.allocations) ?? [],
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const CAPACITY_PLAN_SCHEMA =
  `CREATE TABLE IF NOT EXISTS ${CAPACITY_PLAN_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  budget_hours REAL,
  team_members TEXT,
  allocations TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertCapacityPlanRow(
  db: CacheDatabase,
  p: CapacityPlan,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${CAPACITY_PLAN_TABLE} (id, title, date,
       budget_hours, team_members, allocations,
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(p.id),
      val(p.title),
      val(p.date),
      p.budgetHours ?? null,
      jsonVal(p.teamMembers),
      jsonVal(p.allocations),
      ...auditVals(p),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the capacity plan cache entity. Call from initServices(). */
export function registerCapacityPlanEntity(repo: CapacityPlanRepository): void {
  const entity: EntityDef = {
    table: CAPACITY_PLAN_TABLE,
    schema: CAPACITY_PLAN_SCHEMA,
    fts: {
      type: "capacity_plan",
      columns: ["id", "title"],
      titleCol: "title",
      contentCol: "title",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAllFromDisk();
      for (const p of items) insertCapacityPlanRow(db, p, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
