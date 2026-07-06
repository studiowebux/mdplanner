// Payment entity registration for SQLite cache.
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
import type { PaymentRepository } from "../../repositories/payment.repository.ts";
import type { Payment } from "../../types/payment.types.ts";

export const PAYMENT_TABLE = "payments";

/** Deserialize a SQLite row to a Payment. */
export function rowToPayment(
  row: Record<string, string | number | null>,
): Payment {
  return {
    id: row.id as string,
    invoiceId: (row.invoice_id as string) ?? "",
    amount: Number(row.amount) || 0,
    date: (row.date as string) ?? "",
    method: row.method as Payment["method"] | undefined,
    reference: row.reference as string | undefined,
    notes: row.notes as string | undefined,
    ...archiveFieldsFromRow(row),
    ...auditFieldsFromRow(row),
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
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertPaymentRow(
  db: CacheDatabase,
  p: Payment,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${PAYMENT_TABLE} (id, invoice_id, amount, date,
       method, reference, notes,
       ${archiveCols()}, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(p.id),
      val(p.invoiceId),
      p.amount,
      val(p.date),
      val(p.method),
      val(p.reference),
      val(p.notes),
      ...archiveVals(p),
      ...auditVals(p),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the payment cache entity. Call from initServices(). */
export function registerPaymentEntity(repo: PaymentRepository): void {
  registerEntityCache({
    table: PAYMENT_TABLE,
    schema: PAYMENT_SCHEMA,
    migrations: [
      ...archiveMigrations(PAYMENT_TABLE),
    ],
    fts: {
      type: "payment",
      columns: ["id", "reference", "notes"],
      titleCol: "reference",
      contentCol: "notes",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertPaymentRow,
  });
}
