// Invoice repository — markdown file CRUD under billing/invoices/.

import type {
  CreateInvoice,
  Invoice,
  UpdateInvoice,
} from "../types/invoice.types.ts";
import { parseBillingBody, parseLineItems } from "../utils/billing-parse.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { INVOICE_TABLE, rowToInvoice } from "../domains/invoice/cache.ts";
import { INVOICE_BODY_KEYS } from "../domains/invoice/constants.ts";

import {
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
      status: data.status ?? "draft",
      lineItems: data.lineItems ?? [],
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
    const lineItems = parseLineItems(fm.lineItems);

    return {
      id,
      number: String(fm.number ?? ""),
      customerId: String(fm.customerId ?? ""),
      quoteId: fm.quoteId != null ? String(fm.quoteId) : undefined,
      title,
      status: (fm.status as Invoice["status"]) ?? "draft",
      currency: fm.currency != null ? String(fm.currency) : undefined,
      dueDate: fm.dueDate != null ? String(fm.dueDate) : undefined,
      paymentTerms: fm.paymentTerms != null
        ? String(fm.paymentTerms)
        : undefined,
      lineItems,
      subtotal: Number(fm.subtotal ?? 0),
      tax: fm.tax != null ? Number(fm.tax) : undefined,
      taxRate: fm.taxRate != null ? Number(fm.taxRate) : undefined,
      total: Number(fm.total ?? 0),
      paidAmount: Number(fm.paidAmount ?? 0),
      notes,
      footer: fm.footer != null ? String(fm.footer) : undefined,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      sentAt: fm.sentAt != null ? String(fm.sentAt) : undefined,
      paidAt: fm.paidAt != null ? String(fm.paidAt) : undefined,
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  protected serialize(item: Invoice): string {
    return this.serializeStandard(
      item,
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
