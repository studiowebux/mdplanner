// Invoice repository — markdown file CRUD under billing/invoices/.

import type {
  CreateInvoice,
  Invoice,
  UpdateInvoice,
} from "../types/invoice.types.ts";
import type { LineItem } from "../types/billing.types.ts";
import { mapArrayFromFm } from "../utils/frontmatter-mapper.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { INVOICE_TABLE, rowToInvoice } from "../domains/invoice/cache.ts";

const BODY_KEYS = ["id", "notes"] as const;

export class InvoiceRepository extends CachedMarkdownRepository<
  Invoice,
  CreateInvoice,
  UpdateInvoice
> {
  protected readonly tableName = INVOICE_TABLE;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "billing/invoices",
      idPrefix: "invoice",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, unknown>): Invoice {
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
      createdAt: now,
      updatedAt: now,
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Invoice | null {
    if (!fm.id && !fm.title) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    const bodyText = body.trim();
    const headingMatch = bodyText.match(/^#\s+(.+)$/m);
    const title = fm.title
      ? String(fm.title)
      : headingMatch
      ? headingMatch[1]
      : "";

    let notes: string | undefined;
    if (headingMatch) {
      const afterHeading = bodyText.replace(/^#\s+.+\n?/, "").trim();
      notes = afterHeading || undefined;
    } else {
      notes = bodyText || undefined;
    }

    const rawItems = Array.isArray(fm.lineItems)
      ? mapArrayFromFm(fm.lineItems as unknown[])
      : [];
    const lineItems: LineItem[] = rawItems.map((li) => ({
      id: String(li.id ?? ""),
      type: (li.type as LineItem["type"]) ?? "service",
      description: String(li.description ?? ""),
      group: li.group != null ? String(li.group) : undefined,
      quantity: li.quantity != null ? Number(li.quantity) : undefined,
      unit: li.unit != null ? String(li.unit) as LineItem["unit"] : undefined,
      unitRate: li.unitRate != null ? Number(li.unitRate) : undefined,
      discount: li.discount != null ? Number(li.discount) : undefined,
      discountType: li.discountType as LineItem["discountType"] ?? undefined,
      taxable: li.taxable != null ? Boolean(li.taxable) : undefined,
      optional: li.optional != null ? Boolean(li.optional) : undefined,
      rateId: li.rateId != null ? String(li.rateId) : undefined,
      taskId: li.taskId != null ? String(li.taskId) : undefined,
      notes: li.notes != null ? String(li.notes) : undefined,
      amount: Number(li.amount ?? 0),
    }));

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
    return this.serializeStandard(item, BODY_KEYS, this.buildBody(item));
  }

  private buildBody(item: Invoice): string {
    const parts: string[] = [`# ${item.title}`];
    if (item.notes) {
      parts.push("", item.notes);
    }
    return parts.join("\n");
  }
}
