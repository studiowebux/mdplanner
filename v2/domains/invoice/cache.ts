// Invoice entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  ENTITIES,
  jsonVal,
  parseJson,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { InvoiceRepository } from "../../repositories/invoice.repository.ts";
import type { Invoice } from "../../types/invoice.types.ts";
import type { LineItem } from "../../types/billing.types.ts";

export const INVOICE_TABLE = "invoices";

/** Deserialize a SQLite row to an Invoice. */
export function rowToInvoice(row: Record<string, unknown>): Invoice {
  return {
    id: row.id as string,
    number: (row.number as string) ?? "",
    customerId: (row.customer_id as string) ?? "",
    quoteId: row.quote_id as string | undefined,
    title: (row.title as string) ?? "",
    status: (row.status as Invoice["status"]) ?? "draft",
    currency: row.currency as string | undefined,
    dueDate: row.due_date as string | undefined,
    paymentTerms: row.payment_terms as string | undefined,
    lineItems: parseJson<LineItem[]>(row.line_items) ?? [],
    subtotal: Number(row.subtotal) || 0,
    tax: row.tax != null ? Number(row.tax) : undefined,
    taxRate: row.tax_rate != null ? Number(row.tax_rate) : undefined,
    total: Number(row.total) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    notes: row.notes as string | undefined,
    footer: row.footer as string | undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    sentAt: row.sent_at as string | undefined,
    paidAt: row.paid_at as string | undefined,
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const INVOICE_SCHEMA = `CREATE TABLE IF NOT EXISTS ${INVOICE_TABLE} (
  id TEXT PRIMARY KEY,
  number TEXT,
  customer_id TEXT,
  quote_id TEXT,
  title TEXT NOT NULL,
  status TEXT,
  currency TEXT,
  due_date TEXT,
  payment_terms TEXT,
  line_items TEXT,
  subtotal REAL,
  tax REAL,
  tax_rate REAL,
  total REAL,
  paid_amount REAL,
  notes TEXT,
  footer TEXT,
  created_at TEXT,
  updated_at TEXT,
  sent_at TEXT,
  paid_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertInvoiceRow(
  db: CacheDatabase,
  inv: Invoice,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${INVOICE_TABLE} (id, number, customer_id, quote_id,
       title, status, currency, due_date, payment_terms, line_items,
       subtotal, tax, tax_rate, total, paid_amount, notes, footer,
       created_at, updated_at, sent_at, paid_at,
       created_by, updated_by, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(inv.id),
      val(inv.number),
      val(inv.customerId),
      val(inv.quoteId),
      val(inv.title),
      val(inv.status),
      val(inv.currency),
      val(inv.dueDate),
      val(inv.paymentTerms),
      jsonVal(inv.lineItems),
      inv.subtotal,
      inv.tax ?? null,
      inv.taxRate ?? null,
      inv.total,
      inv.paidAmount,
      val(inv.notes),
      val(inv.footer),
      val(inv.createdAt),
      val(inv.updatedAt),
      val(inv.sentAt),
      val(inv.paidAt),
      val(inv.createdBy),
      val(inv.updatedBy),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the invoice cache entity. Call from initServices(). */
export function registerInvoiceEntity(repo: InvoiceRepository): void {
  const entity: EntityDef = {
    table: INVOICE_TABLE,
    schema: INVOICE_SCHEMA,
    fts: {
      type: "invoice",
      columns: ["id", "number", "title", "notes"],
      titleCol: "title",
      contentCol: "notes",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAll();
      for (const inv of items) insertInvoiceRow(db, inv, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
