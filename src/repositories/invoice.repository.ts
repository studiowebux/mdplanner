// Invoice repository — markdown file CRUD under billing/invoices/.

import type {
  CreateInvoice,
  Invoice,
  UpdateInvoice,
} from "../types/invoice.types.ts";
import { parseBillingBody } from "../utils/billing-parse.ts";
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
      // Derived from the referenced quote at read time — never stored.
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

    return {
      id,
      number: fmStr(fm, "number") ?? "",
      // Derived from the referenced quote at read time (InvoiceService.hydrate).
      customerId: "",
      quoteId: fmStr(fm, "quoteId") ?? "",
      projectId: fmStr(fm, "projectId"),
      title,
      status: (fm.status as Invoice["status"]) ?? "draft",
      currency: fmStr(fm, "currency"),
      dueDate: fmStr(fm, "dueDate"),
      paymentTerms: fmStr(fm, "paymentTerms"),
      lineItems: [],
      subtotal: 0,
      tax: undefined,
      taxRate: undefined,
      total: 0,
      paidAmount: fmNum(fm, "paidAmount") ?? 0,
      description: fmStr(fm, "description"),
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
