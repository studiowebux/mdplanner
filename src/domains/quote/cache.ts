// Quote entity registration for SQLite cache.
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
  jsonVal,
  parseJson,
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
import type { QuoteRepository } from "../../repositories/quote.repository.ts";
import type { Quote } from "../../types/quote.types.ts";
import type { LineItem } from "../../types/billing.types.ts";
import type { PaymentScheduleItem } from "../../types/quote.types.ts";

export const QUOTE_TABLE = "quotes";

/** Deserialize a SQLite row to a Quote. */
export function rowToQuote(row: Record<string, string | number | null>): Quote {
  return {
    id: row.id as string,
    number: (row.number as string) ?? "",
    customerId: (row.customer_id as string) ?? "",
    projectId: row.project_id as string | undefined,
    portfolioItemId: row.portfolio_item_id as string | undefined,
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
    revisedFromId: row.revised_from_id as string | undefined,
    sentAt: row.sent_at as string | undefined,
    acceptedAt: row.accepted_at as string | undefined,
    ...archiveFieldsFromRow(row),
    ...auditFieldsFromRow(row),
  };
}

const QUOTE_SCHEMA = `CREATE TABLE IF NOT EXISTS ${QUOTE_TABLE} (
  id TEXT PRIMARY KEY,
  number TEXT,
  customer_id TEXT,
  project_id TEXT,
  portfolio_item_id TEXT,
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
  revised_from_id TEXT,
  sent_at TEXT,
  accepted_at TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertQuoteRow(
  db: CacheDatabase,
  q: Quote,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${QUOTE_TABLE} (id, number, customer_id, project_id,
       portfolio_item_id, title, status, currency, expires_at, line_items,
       payment_schedule, subtotal, tax, tax_rate, total, notes, footer, revision,
       converted_to_invoice, revised_from_id, sent_at, accepted_at,
       ${archiveCols()}, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(q.id),
      val(q.number),
      val(q.customerId),
      val(q.projectId),
      val(q.portfolioItemId),
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
      val(q.revisedFromId),
      val(q.sentAt),
      val(q.acceptedAt),
      ...archiveVals(q),
      ...auditVals(q),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the quote cache entity. Call from initServices(). */
export function registerQuoteEntity(repo: QuoteRepository): void {
  registerEntityCache({
    table: QUOTE_TABLE,
    schema: QUOTE_SCHEMA,
    migrations: [
      "ALTER TABLE quotes ADD COLUMN line_items TEXT",
      "ALTER TABLE quotes ADD COLUMN payment_schedule TEXT",
      "ALTER TABLE quotes ADD COLUMN project_id TEXT",
      "ALTER TABLE quotes ADD COLUMN portfolio_item_id TEXT",
      "ALTER TABLE quotes ADD COLUMN revised_from_id TEXT",
      ...archiveMigrations(QUOTE_TABLE),
    ],
    fts: {
      type: "quote",
      columns: ["id", "number", "title", "notes"],
      titleCol: "title",
      contentCol: "notes",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertQuoteRow,
  });
}
