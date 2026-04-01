// Invoice repository — markdown file CRUD under billing/invoices/.

import type {
  CreateInvoice,
  Invoice,
  UpdateInvoice,
} from "../types/invoice.types.ts";
import type { LineItem } from "../types/billing.types.ts";
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

    // Parse line items — handle v1 format (rate → unitRate, no type)
    const rawItems = Array.isArray(fm.lineItems ?? fm.line_items)
      ? (fm.lineItems ?? fm.line_items) as Record<string, unknown>[]
      : [];
    const lineItems: LineItem[] = rawItems.map((li) => ({
      id: String(li.id ?? ""),
      type: (li.type as LineItem["type"]) ?? "service",
      description: String(li.description ?? ""),
      group: li.group != null ? String(li.group) : undefined,
      quantity: li.quantity != null ? Number(li.quantity) : undefined,
      unit: li.unit != null ? String(li.unit) as LineItem["unit"] : undefined,
      unitRate: li.unitRate != null
        ? Number(li.unitRate)
        : li.unit_rate != null
        ? Number(li.unit_rate)
        : li.rate != null
        ? Number(li.rate)
        : undefined,
      discount: li.discount != null ? Number(li.discount) : undefined,
      discountType: li.discountType as LineItem["discountType"] ??
        li.discount_type as LineItem["discountType"] ?? undefined,
      taxable: li.taxable != null ? Boolean(li.taxable) : undefined,
      optional: li.optional != null ? Boolean(li.optional) : undefined,
      rateId: li.rateId != null || li.rate_id != null
        ? String(li.rateId ?? li.rate_id)
        : undefined,
      taskId: li.taskId != null || li.task_id != null
        ? String(li.taskId ?? li.task_id)
        : undefined,
      notes: li.notes != null ? String(li.notes) : undefined,
      amount: Number(li.amount ?? 0),
    }));

    return {
      id,
      number: String(fm.number ?? ""),
      customerId: String(fm.customerId ?? fm.customer_id ?? ""),
      quoteId: fm.quoteId != null
        ? String(fm.quoteId)
        : fm.quote_id != null
        ? String(fm.quote_id)
        : undefined,
      title,
      status: (fm.status as Invoice["status"]) ?? "draft",
      currency: fm.currency != null ? String(fm.currency) : undefined,
      dueDate: fm.dueDate != null
        ? String(fm.dueDate)
        : fm.due_date != null
        ? String(fm.due_date)
        : undefined,
      paymentTerms: fm.paymentTerms != null
        ? String(fm.paymentTerms)
        : fm.payment_terms != null
        ? String(fm.payment_terms)
        : undefined,
      lineItems,
      subtotal: Number(fm.subtotal ?? 0),
      tax: fm.tax != null ? Number(fm.tax) : undefined,
      taxRate: fm.taxRate != null
        ? Number(fm.taxRate)
        : fm.tax_rate != null
        ? Number(fm.tax_rate)
        : undefined,
      total: Number(fm.total ?? 0),
      paidAmount: Number(fm.paidAmount ?? fm.paid_amount ?? 0),
      notes,
      footer: fm.footer != null ? String(fm.footer) : undefined,
      createdAt: fm.created_at
        ? String(fm.created_at)
        : new Date().toISOString(),
      updatedAt: fm.updated_at
        ? String(fm.updated_at)
        : new Date().toISOString(),
      sentAt: fm.sent_at != null
        ? String(fm.sent_at)
        : fm.sentAt != null
        ? String(fm.sentAt)
        : undefined,
      paidAt: fm.paid_at != null
        ? String(fm.paid_at)
        : fm.paidAt != null
        ? String(fm.paidAt)
        : undefined,
      createdBy: fm.created_by != null ? String(fm.created_by) : undefined,
      updatedBy: fm.updated_by != null ? String(fm.updated_by) : undefined,
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
