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
      number: fmStr(fm, "number") ?? "",
      customerId: fmStr(fm, "customerId") ?? "",
      quoteId: fmStr(fm, "quoteId"),
      title,
      status: (fm.status as Invoice["status"]) ?? "draft",
      currency: fmStr(fm, "currency"),
      dueDate: fmStr(fm, "dueDate"),
      paymentTerms: fmStr(fm, "paymentTerms"),
      lineItems,
      subtotal: fmNum(fm, "subtotal") ?? 0,
      tax: fmNum(fm, "tax"),
      taxRate: fmNum(fm, "taxRate"),
      total: fmNum(fm, "total") ?? 0,
      paidAmount: fmNum(fm, "paidAmount") ?? 0,
      notes,
      footer: fmStr(fm, "footer"),
      createdAt: fmStr(fm, "createdAt") ?? new Date().toISOString(),
      updatedAt: fmStr(fm, "updatedAt") ?? new Date().toISOString(),
      sentAt: fmStr(fm, "sentAt"),
      paidAt: fmStr(fm, "paidAt"),
      createdBy: fmStr(fm, "createdBy"),
      updatedBy: fmStr(fm, "updatedBy"),
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
