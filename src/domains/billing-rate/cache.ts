// BillingRate entity registration for SQLite cache.
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
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
import type { BillingRateRepository } from "../../repositories/billing-rate.repository.ts";
import type { BillingRate } from "../../types/billing-rate.types.ts";

export const BILLING_RATE_TABLE = "billing_rates";

/** Deserialize a SQLite row to a BillingRate. */
export function rowToBillingRate(
  row: Record<string, string | number | null>,
): BillingRate {
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    unit: (row.unit as BillingRate["unit"]) ?? "h",
    rate: Number(row.rate) || 0,
    currency: row.currency as string | undefined,
    assignee: row.assignee as string | undefined,
    isDefault: row.is_default != null ? Boolean(row.is_default) : undefined,
    notes: row.notes as string | undefined,
    ...archiveFieldsFromRow(row),
    ...auditFieldsFromRow(row),
  };
}

const BILLING_RATE_SCHEMA = `CREATE TABLE IF NOT EXISTS ${BILLING_RATE_TABLE} (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT,
  rate REAL,
  currency TEXT,
  assignee TEXT,
  is_default INTEGER,
  notes TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertBillingRateRow(
  db: CacheDatabase,
  r: BillingRate,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${BILLING_RATE_TABLE} (id, name, unit, rate,
       currency, assignee, is_default, notes,
       ${archiveCols()},
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(r.id),
      val(r.name),
      val(r.unit),
      r.rate,
      val(r.currency),
      val(r.assignee),
      r.isDefault ? 1 : 0,
      val(r.notes),
      ...archiveVals(r),
      ...auditVals(r),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the billing rate cache entity. Call from initServices(). */
export function registerBillingRateEntity(
  repo: BillingRateRepository,
): void {
  registerEntityCache({
    table: BILLING_RATE_TABLE,
    schema: BILLING_RATE_SCHEMA,
    fts: {
      type: "rate",
      columns: ["id", "name", "notes"],
      titleCol: "name",
      contentCol: "notes",
    },
    migrations: [
      ...archiveMigrations(BILLING_RATE_TABLE),
    ],
    source: () => repo.findAllFromDisk(),
    insert: insertBillingRateRow,
  });
}
