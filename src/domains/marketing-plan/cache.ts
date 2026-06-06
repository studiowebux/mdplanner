// Marketing Plan entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  ARCHIVE_COLS_DDL,
  archiveCols,
  archiveFieldsFromRow,
  archiveMigrations,
  archiveVals,
  AUDIT_COLS_DDL,
  auditCols,
  auditVals,
  jsonVal,
  parseJson,
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
import type { MarketingPlanRepository } from "../../repositories/marketing-plan.repository.ts";
import type { MarketingPlan } from "../../types/marketing-plan.types.ts";

export const MARKETING_PLAN_TABLE = "marketing_plans";

/** Deserialize a SQLite row to a MarketingPlan. */
export function rowToMarketingPlan(
  row: Record<string, string | number | null>,
): MarketingPlan {
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    description: row.description as string | undefined,
    status: (row.status as MarketingPlan["status"]) ?? "draft",
    budgetTotal: row.budget_total != null
      ? Number(row.budget_total)
      : undefined,
    budgetCurrency: row.budget_currency as string | undefined,
    startDate: row.start_date as string | undefined,
    endDate: row.end_date as string | undefined,
    targetAudiences: parseJson(row.target_audiences),
    channels: parseJson(row.channels),
    campaigns: parseJson(row.campaigns),
    linkedGoals: parseJson<string[]>(row.linked_goals),
    project: row.project as string | undefined,
    responsible: row.responsible as string | undefined,
    team: parseJson<string[]>(row.team),
    hypothesis: parseJson(row.hypothesis),
    learnings: parseJson(row.learnings),
    notes: row.notes as string | undefined,
    ...archiveFieldsFromRow(row),
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${MARKETING_PLAN_TABLE} (
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
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertRow(
  db: CacheDatabase,
  p: MarketingPlan,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${MARKETING_PLAN_TABLE} (id, name, description, status,
       budget_total, budget_currency, start_date, end_date,
       target_audiences, channels, campaigns, linked_goals,
       project, responsible, team,
       hypothesis, learnings, notes, ${archiveCols()}, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(p.id),
      val(p.name),
      val(p.description),
      val(p.status),
      p.budgetTotal ?? null,
      val(p.budgetCurrency),
      val(p.startDate),
      val(p.endDate),
      jsonVal(p.targetAudiences),
      jsonVal(p.channels),
      jsonVal(p.campaigns),
      jsonVal(p.linkedGoals),
      val(p.project),
      val(p.responsible),
      jsonVal(p.team),
      val(p.hypothesis),
      val(p.learnings),
      val(p.notes),
      ...archiveVals(p),
      ...auditVals(p),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the marketing plan cache entity. Call from initServices(). */
export function registerMarketingPlanEntity(
  repo: MarketingPlanRepository,
): void {
  registerEntityCache({
    table: MARKETING_PLAN_TABLE,
    schema: SCHEMA,
    migrations: [
      ...archiveMigrations(MARKETING_PLAN_TABLE),
    ],
    fts: {
      type: "marketing_plan",
      columns: ["id", "name", "description", "notes"],
      titleCol: "name",
      contentCol: "notes",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertRow,
  });
}
