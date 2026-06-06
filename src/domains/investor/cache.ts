// Investor entity registration for SQLite cache.
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
import type { InvestorRepository } from "../../repositories/investor.repository.ts";
import type { Investor } from "../../types/investor.types.ts";

export const INVESTOR_TABLE = "investor";

/** Deserialize a SQLite row to an Investor. */
export function rowToInvestor(
  row: Record<string, string | number | null>,
): Investor {
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    type: (row.type as Investor["type"]) ?? "vc",
    stage: (row.stage as Investor["stage"]) ?? "lead",
    status: (row.status as Investor["status"]) ?? "not_started",
    amountTarget: row.amount_target != null
      ? Number(row.amount_target)
      : undefined,
    contact: row.contact as string | undefined,
    introDate: row.intro_date as string | undefined,
    lastContact: row.last_contact as string | undefined,
    notes: row.notes as string | undefined,
    tags: parseJson<string[]>(row.tags) ?? [],
    ...archiveFieldsFromRow(row),
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${INVESTOR_TABLE} (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  stage TEXT,
  status TEXT,
  amount_target REAL,
  contact TEXT,
  intro_date TEXT,
  last_contact TEXT,
  notes TEXT,
  tags TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertRow(
  db: CacheDatabase,
  inv: Investor,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${INVESTOR_TABLE} (id, name, type, stage, status,
       amount_target, contact, intro_date, last_contact, notes, tags,
       ${archiveCols()},
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(inv.id),
      val(inv.name),
      val(inv.type),
      val(inv.stage),
      val(inv.status),
      inv.amountTarget ?? null,
      val(inv.contact),
      val(inv.introDate),
      val(inv.lastContact),
      val(inv.notes),
      json(inv.tags),
      ...archiveVals(inv),
      ...auditVals(inv),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the investor cache entity. Call from initServices(). */
export function registerInvestorEntity(repo: InvestorRepository): void {
  registerEntityCache({
    table: INVESTOR_TABLE,
    schema: SCHEMA,
    migrations: [
      ...archiveMigrations(INVESTOR_TABLE),
    ],
    fts: {
      type: "investor",
      columns: ["id", "name", "contact", "notes"],
      titleCol: "name",
      contentCol: "notes",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertRow,
  });
}
