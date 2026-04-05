// Payment entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  auditCols,
  auditVals,
  ENTITIES,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { PaymentRepository } from "../../repositories/payment.repository.ts";
import type { Payment } from "../../types/payment.types.ts";

export const PAYMENT_TABLE = "payments";

/** Deserialize a SQLite row to a Payment. */
export function rowToPayment(row: Record<string, unknown>): Payment {
  return {
    id: row.id as string,
    invoiceId: (row.invoice_id as string) ?? "",
    amount: Number(row.amount) || 0,
    date: (row.date as string) ?? "",
    method: row.method as Payment["method"] | undefined,
    reference: row.reference as string | undefined,
    notes: row.notes as string | undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const PAYMENT_SCHEMA = `CREATE TABLE IF NOT EXISTS ${PAYMENT_TABLE} (
  id TEXT PRIMARY KEY,
  invoice_id TEXT,
  amount REAL,
  date TEXT,
  method TEXT,
  reference TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertPaymentRow(
  db: CacheDatabase,
  p: Payment,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${PAYMENT_TABLE} (id, invoice_id, amount, date,
       method, reference, notes,
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(p.id),
      val(p.invoiceId),
      p.amount,
      val(p.date),
      val(p.method),
      val(p.reference),
      val(p.notes),
      ...auditVals(p),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the payment cache entity. Call from initServices(). */
export function registerPaymentEntity(repo: PaymentRepository): void {
  const entity: EntityDef = {
    table: PAYMENT_TABLE,
    schema: PAYMENT_SCHEMA,
    fts: {
      type: "payment",
      columns: ["id", "reference", "notes"],
      titleCol: "reference",
      contentCol: "notes",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAll();
      for (const p of items) insertPaymentRow(db, p, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
