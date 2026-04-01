// BillingRate entity registration for SQLite cache.
// Called by initServices() after repos are created.

import { ENTITIES, val } from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { BillingRateRepository } from "../../repositories/billing-rate.repository.ts";
import type { BillingRate } from "../../types/billing-rate.types.ts";

export const BILLING_RATE_TABLE = "billing_rates";

/** Deserialize a SQLite row to a BillingRate. */
export function rowToBillingRate(row: Record<string, unknown>): BillingRate {
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    unit: (row.unit as BillingRate["unit"]) ?? "h",
    rate: Number(row.rate) || 0,
    currency: row.currency as string | undefined,
    assignee: row.assignee as string | undefined,
    isDefault: row.is_default != null ? Boolean(row.is_default) : undefined,
    notes: row.notes as string | undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
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
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertBillingRateRow(
  db: CacheDatabase,
  r: BillingRate,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${BILLING_RATE_TABLE} (id, name, unit, rate,
       currency, assignee, is_default, notes,
       created_at, updated_at, created_by, updated_by, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(r.id),
      val(r.name),
      val(r.unit),
      r.rate,
      val(r.currency),
      val(r.assignee),
      r.isDefault ? 1 : 0,
      val(r.notes),
      val(r.createdAt),
      val(r.updatedAt),
      val(r.createdBy),
      val(r.updatedBy),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the billing rate cache entity. Call from initServices(). */
export function registerBillingRateEntity(
  repo: BillingRateRepository,
): void {
  const entity: EntityDef = {
    table: BILLING_RATE_TABLE,
    schema: BILLING_RATE_SCHEMA,
    fts: {
      type: "billing_rate",
      columns: ["id", "name", "notes"],
      titleCol: "name",
      contentCol: "notes",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAll();
      for (const r of items) insertBillingRateRow(db, r, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
