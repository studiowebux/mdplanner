// Invoice repository — markdown file CRUD under billing/invoices/.

import type {
  CreateInvoice,
  Invoice,
  UpdateInvoice,
} from "../types/invoice.types.ts";
import { parseBillingBody, parseLineItems } from "../utils/billing-parse.ts";
import type { LineItem } from "../types/billing.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { INVOICE_TABLE, rowToInvoice } from "../domains/invoice/cache.ts";
import { INVOICE_BODY_KEYS } from "../domains/invoice/constants.ts";

import {
  fmNum,
  fmStr,
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
/** Persists Invoice entities as markdown with a SQLite cache mirror; line items live in the body. */
export class InvoiceRepository extends CachedMarkdownRepository<
  Invoice,
  CreateInvoice,
  UpdateInvoice
> {
  protected readonly tableName = INVOICE_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "billing/invoices",
      idPrefix: "invoice",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, string | number | null>): Invoice {
    return rowToInvoice(row);
  }

  protected fromCreateInput(
    data: CreateInvoice,
    id: string,
    now: string,
  ): Invoice {
    return {
      ...data,
      id,
      number: "",
      title: data.title ?? "",
      status: data.status ?? "draft",
      // A new invoice starts as a draft: no frozen snapshot, so customer/line
      // items/totals are derived live from the quote until it is issued.
      frozenAt: undefined,
      customerId: "",
      lineItems: [],
      subtotal: 0,
      total: 0,
      paidAmount: 0,
      ...stampAuditFields(now),
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Invoice | null {
    if (!fm.id && !fm.title) return null;
    const id = resolveEntityId(filename, fm);

    const { title, notes } = parseBillingBody(fm.title, body);

    // Frozen invoices persist their quote snapshot to frontmatter; drafts carry
    // empty snapshot fields and have them derived from the quote on read
    // (InvoiceService.hydrate). Either way we read whatever is stored.
    return {
      id,
      number: fmStr(fm, "number") ?? "",
      customerId: fmStr(fm, "customerId") ?? "",
      quoteId: fmStr(fm, "quoteId") ?? "",
      projectId: fmStr(fm, "projectId"),
      title,
      status: (fm.status as Invoice["status"]) ?? "draft",
      currency: fmStr(fm, "currency"),
      dueDate: fmStr(fm, "dueDate"),
      paymentTerms: fmStr(fm, "paymentTerms"),
      lineItems: parseLineItems(fm.lineItems),
      subtotal: fmNum(fm, "subtotal") ?? 0,
      tax: fmNum(fm, "tax"),
      taxRate: fmNum(fm, "taxRate"),
      total: fmNum(fm, "total") ?? 0,
      paidAmount: fmNum(fm, "paidAmount") ?? 0,
      description: fmStr(fm, "description"),
      notes,
      footer: fmStr(fm, "footer"),
      frozenAt: fmStr(fm, "frozenAt"),
      createdAt: fmStr(fm, "createdAt") ?? new Date().toISOString(),
      updatedAt: fmStr(fm, "updatedAt") ?? new Date().toISOString(),
      sentAt: fmStr(fm, "sentAt"),
      paidAt: fmStr(fm, "paidAt"),
      createdBy: fmStr(fm, "createdBy"),
      updatedBy: fmStr(fm, "updatedBy"),
    };
  }

  protected serialize(item: Invoice): string {
    // Per-line `amount` is derived (computeLineAmount) — strip it so it is never
    // persisted, mirroring the quote repository. Drafts persist empty snapshot
    // fields; issued (frozen) invoices persist the captured quote snapshot.
    const persisted: Invoice = {
      ...item,
      lineItems: item.lineItems.map(({ amount: _amount, ...li }) =>
        li as LineItem
      ),
    };
    return this.serializeStandard(
      persisted,
      INVOICE_BODY_KEYS,
      this.buildBody(item),
    );
  }

  private buildBody(item: Invoice): string {
    const parts: string[] = [`# ${item.title}`];
    if (item.notes) {
      parts.push("", item.notes);
    }
    return parts.join("\n");
  }
}
