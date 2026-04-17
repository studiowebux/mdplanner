// Quote repository — markdown file CRUD under billing/quotes/.

import type {
  CreateQuote,
  PaymentScheduleItem,
  Quote,
  UpdateQuote,
} from "../types/quote.types.ts";
import type { LineItem } from "../types/billing.types.ts";
import { mapArrayFromFm } from "../utils/frontmatter-mapper.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { QUOTE_TABLE, rowToQuote } from "../domains/quote/cache.ts";
import { QUOTE_BODY_KEYS } from "../domains/quote/constants.ts";

export class QuoteRepository extends CachedMarkdownRepository<
  Quote,
  CreateQuote,
  UpdateQuote
> {
  protected readonly tableName = QUOTE_TABLE;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "billing/quotes",
      idPrefix: "quote",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, unknown>): Quote {
    return rowToQuote(row);
  }

  protected fromCreateInput(
    data: CreateQuote,
    id: string,
    now: string,
  ): Quote {
    return {
      ...data,
      id,
      number: "",
      status: data.status ?? "draft",
      lineItems: data.lineItems ?? [],
      subtotal: 0,
      total: 0,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Quote | null {
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

    const rawItems = Array.isArray(fm.line_items)
      ? mapArrayFromFm(fm.line_items as unknown[])
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

    const rawSchedule = Array.isArray(fm.payment_schedule)
      ? mapArrayFromFm(fm.payment_schedule as unknown[])
      : undefined;
    const paymentSchedule: PaymentScheduleItem[] | undefined = rawSchedule
      ?.map((ps) => ({
        description: String(ps.description ?? ""),
        percent: ps.percent != null ? Number(ps.percent) : undefined,
        amount: ps.amount != null ? Number(ps.amount) : undefined,
        dueDate: ps.dueDate != null ? String(ps.dueDate) : undefined,
      }));

    return {
      id,
      number: String(fm.number ?? ""),
      customerId: String(fm.customer_id ?? ""),
      title,
      status: (fm.status as Quote["status"]) ?? "draft",
      currency: fm.currency != null ? String(fm.currency) : undefined,
      expiresAt: fm.expires_at != null ? String(fm.expires_at) : undefined,
      lineItems,
      paymentSchedule: paymentSchedule?.length ? paymentSchedule : undefined,
      subtotal: Number(fm.subtotal ?? 0),
      tax: fm.tax != null ? Number(fm.tax) : undefined,
      taxRate: fm.tax_rate != null ? Number(fm.tax_rate) : undefined,
      total: Number(fm.total ?? 0),
      notes,
      footer: fm.footer != null ? String(fm.footer) : undefined,
      revision: fm.revision != null ? Number(fm.revision) : undefined,
      convertedToInvoice: fm.converted_toInvoice != null
        ? String(fm.converted_toInvoice)
        : undefined,
      createdAt: fm.created_at
        ? String(fm.created_at)
        : new Date().toISOString(),
      updatedAt: fm.updated_at
        ? String(fm.updated_at)
        : new Date().toISOString(),
      sentAt: fm.sent_at != null ? String(fm.sent_at) : undefined,
      acceptedAt: fm.accepted_at != null ? String(fm.accepted_at) : undefined,
      createdBy: fm.created_by != null ? String(fm.created_by) : undefined,
      updatedBy: fm.updated_by != null ? String(fm.updated_by) : undefined,
    };
  }

  protected serialize(item: Quote): string {
    return this.serializeStandard(item, QUOTE_BODY_KEYS, this.buildBody(item));
  }

  private buildBody(item: Quote): string {
    const parts: string[] = [`# ${item.title}`];
    if (item.notes) {
      parts.push("", item.notes);
    }
    return parts.join("\n");
  }
}
