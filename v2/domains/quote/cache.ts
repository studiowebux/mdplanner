// Quote entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  auditCols,
  auditVals,
  ENTITIES,
  jsonVal,
  parseJson,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { QuoteRepository } from "../../repositories/quote.repository.ts";
import type { Quote } from "../../types/quote.types.ts";
import type { LineItem } from "../../types/billing.types.ts";
import type { PaymentScheduleItem } from "../../types/quote.types.ts";

export const QUOTE_TABLE = "quotes";

/** Deserialize a SQLite row to a Quote. */
export function rowToQuote(row: Record<string, unknown>): Quote {
  return {
    id: row.id as string,
    number: (row.number as string) ?? "",
    customerId: (row.customer_id as string) ?? "",
    title: (row.title as string) ?? "",
    status: (row.status as Quote["status"]) ?? "draft",
    currency: row.currency as string | undefined,
    expiresAt: row.expires_at as string | undefined,
    lineItems: parseJson<LineItem[]>(row.line_items) ?? [],
    paymentSchedule: parseJson<PaymentScheduleItem[]>(row.payment_schedule),
    subtotal: Number(row.subtotal) || 0,
    tax: row.tax != null ? Number(row.tax) : undefined,
    taxRate: row.tax_rate != null ? Number(row.tax_rate) : undefined,
    total: Number(row.total) || 0,
    notes: row.notes as string | undefined,
    footer: row.footer as string | undefined,
    revision: row.revision != null ? Number(row.revision) : undefined,
    convertedToInvoice: row.converted_to_invoice as string | undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    sentAt: row.sent_at as string | undefined,
    acceptedAt: row.accepted_at as string | undefined,
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const QUOTE_SCHEMA = `CREATE TABLE IF NOT EXISTS ${QUOTE_TABLE} (
  id TEXT PRIMARY KEY,
  number TEXT,
  customer_id TEXT,
  title TEXT NOT NULL,
  status TEXT,
  currency TEXT,
  expires_at TEXT,
  line_items TEXT,
  payment_schedule TEXT,
  subtotal REAL,
  tax REAL,
  tax_rate REAL,
  total REAL,
  notes TEXT,
  footer TEXT,
  revision INTEGER,
  converted_to_invoice TEXT,
  created_at TEXT,
  updated_at TEXT,
  sent_at TEXT,
  accepted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertQuoteRow(
  db: CacheDatabase,
  q: Quote,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${QUOTE_TABLE} (id, number, customer_id, title,
       status, currency, expires_at, line_items, payment_schedule,
       subtotal, tax, tax_rate, total, notes, footer, revision,
       converted_to_invoice, sent_at, accepted_at,
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(q.id),
      val(q.number),
      val(q.customerId),
      val(q.title),
      val(q.status),
      val(q.currency),
      val(q.expiresAt),
      jsonVal(q.lineItems),
      jsonVal(q.paymentSchedule),
      q.subtotal,
      q.tax ?? null,
      q.taxRate ?? null,
      q.total,
      val(q.notes),
      val(q.footer),
      q.revision ?? null,
      val(q.convertedToInvoice),
      val(q.sentAt),
      val(q.acceptedAt),
      ...auditVals(q),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the quote cache entity. Call from initServices(). */
export function registerQuoteEntity(repo: QuoteRepository): void {
  const entity: EntityDef = {
    table: QUOTE_TABLE,
    schema: QUOTE_SCHEMA,
    fts: {
      type: "quote",
      columns: ["id", "number", "title", "notes"],
      titleCol: "title",
      contentCol: "notes",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAll();
      for (const q of items) insertQuoteRow(db, q, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
