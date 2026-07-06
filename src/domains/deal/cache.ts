// Deal entity registration for SQLite cache.
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
  json,
  parseJson,
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
import type { DealRepository } from "../../repositories/deal.repository.ts";
import type { Deal, DealStage } from "../../types/deal.types.ts";

export const DEAL_TABLE = "deals";

/** Deserialize a SQLite row to a Deal. */
export function rowToDeal(
  row: Record<string, string | number | null>,
): Deal {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    stage: (row.stage as DealStage) ?? "lead",
    value: row.value != null ? (row.value as number) : undefined,
    currency: row.currency as string | undefined,
    company: row.company as string | undefined,
    contact: row.contact as string | undefined,
    assignee: row.assignee as string | undefined,
    description: row.description as string | undefined,
    tags: parseJson<string[]>(row.tags) ?? [],
    closedAt: row.closed_at as string | undefined,
    ...archiveFieldsFromRow(row),
    ...auditFieldsFromRow(row),
  };
}

const DEAL_SCHEMA = `CREATE TABLE IF NOT EXISTS ${DEAL_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'lead',
  value REAL,
  currency TEXT,
  company TEXT,
  contact TEXT,
  assignee TEXT,
  description TEXT,
  tags TEXT,
  closed_at TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

export function insertDealRow(
  db: CacheDatabase,
  d: Deal,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${DEAL_TABLE} (id, title, stage, value, currency,
       company, contact, assignee, description, tags, closed_at,
       ${archiveCols()},
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(d.id),
      val(d.title),
      val(d.stage),
      d.value ?? null,
      val(d.currency),
      val(d.company),
      val(d.contact),
      val(d.assignee),
      val(d.description),
      json(d.tags ?? []),
      val(d.closedAt),
      ...archiveVals(d),
      ...auditVals(d),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the deal cache entity. Call from initServices(). */
export function registerDealEntity(repo: DealRepository): void {
  registerEntityCache({
    table: DEAL_TABLE,
    schema: DEAL_SCHEMA,
    migrations: [
      ...archiveMigrations(DEAL_TABLE),
    ],
    fts: {
      type: "deal",
      columns: ["id", "title", "company", "contact", "assignee", "description"],
      titleCol: "title",
      contentCol: "description",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertDealRow,
  });
}
