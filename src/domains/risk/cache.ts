// Risk entity registration for SQLite cache.
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
  json,
  parseJson,
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
import type { RiskRepository } from "../../repositories/risk.repository.ts";
import type { Risk } from "../../types/risk.types.ts";

export const RISK_TABLE = "risk";

/** Deserialize a SQLite row to a Risk. */
export function rowToRisk(row: Record<string, string | number | null>): Risk {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    description: row.description as string | undefined,
    category: (row.category as Risk["category"]) ?? "other",
    likelihood: Number(row.likelihood ?? 3),
    impact: Number(row.impact ?? 3),
    status: (row.status as Risk["status"]) ?? "open",
    mitigation: row.mitigation as string | undefined,
    owner: row.owner as string | undefined,
    project: row.project as string | undefined,
    tags: parseJson<string[]>(row.tags) ?? [],
    ...archiveFieldsFromRow(row),
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${RISK_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  likelihood INTEGER,
  impact INTEGER,
  status TEXT,
  mitigation TEXT,
  owner TEXT,
  project TEXT,
  tags TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertRow(db: CacheDatabase, r: Risk, syncedAt?: string): void {
  db.execute(
    `INSERT OR REPLACE INTO ${RISK_TABLE} (id, title, description,
       category, likelihood, impact, status, mitigation, owner, project, tags,
       ${archiveCols()}, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(r.id),
      val(r.title),
      val(r.description),
      val(r.category),
      r.likelihood,
      r.impact,
      val(r.status),
      val(r.mitigation),
      val(r.owner),
      val(r.project),
      json(r.tags),
      ...archiveVals(r),
      ...auditVals(r),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the risk cache entity. Call from initServices(). */
export function registerRiskEntity(repo: RiskRepository): void {
  registerEntityCache({
    table: RISK_TABLE,
    schema: SCHEMA,
    migrations: [
      ...archiveMigrations(RISK_TABLE),
    ],
    fts: {
      type: "risk",
      columns: ["id", "title", "description", "mitigation", "owner"],
      titleCol: "title",
      contentCol: "description",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertRow,
  });
}
