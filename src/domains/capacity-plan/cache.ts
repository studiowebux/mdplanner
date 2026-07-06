// Capacity plan entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  ARCHIVE_COLS_DDL,
  archiveCols,
  archiveFieldsFromRow,
  archiveMigrations,
  archiveVals,
  AUDIT_COLS_DDL,
  auditCols,
  auditFieldsFromRow,
  auditVals,
  jsonVal,
  parseJson,
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
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
    startDate: (row.start_date as string) ?? undefined,
    endDate: (row.end_date as string) ?? undefined,
    budgetHours: row.budget_hours != null
      ? Number(row.budget_hours)
      : undefined,
    teamMembers: parseJson(row.team_members) ?? [],
    allocations: parseJson(row.allocations) ?? [],
    ...archiveFieldsFromRow(row),
    ...auditFieldsFromRow(row),
  };
}

const CAPACITY_PLAN_SCHEMA =
  `CREATE TABLE IF NOT EXISTS ${CAPACITY_PLAN_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  budget_hours REAL,
  team_members TEXT,
  allocations TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

const CAPACITY_PLAN_MIGRATIONS = [
  `ALTER TABLE ${CAPACITY_PLAN_TABLE} ADD COLUMN start_date TEXT`,
  `ALTER TABLE ${CAPACITY_PLAN_TABLE} ADD COLUMN end_date TEXT`,
  ...archiveMigrations(CAPACITY_PLAN_TABLE),
];

function insertCapacityPlanRow(
  db: CacheDatabase,
  p: CapacityPlan,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${CAPACITY_PLAN_TABLE} (id, title, start_date, end_date,
       budget_hours, team_members, allocations,
       ${archiveCols()},
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(p.id),
      val(p.title),
      val(p.startDate),
      val(p.endDate),
      p.budgetHours ?? null,
      jsonVal(p.teamMembers),
      jsonVal(p.allocations),
      ...archiveVals(p),
      ...auditVals(p),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the capacity plan cache entity. Call from initServices(). */
export function registerCapacityPlanEntity(repo: CapacityPlanRepository): void {
  registerEntityCache({
    table: CAPACITY_PLAN_TABLE,
    schema: CAPACITY_PLAN_SCHEMA,
    migrations: CAPACITY_PLAN_MIGRATIONS,
    fts: {
      type: "capacity_plan",
      columns: ["id", "title"],
      titleCol: "title",
      contentCol: "title",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertCapacityPlanRow,
  });
}
