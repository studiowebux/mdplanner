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

    const rawSchedule = Array.isArray(fm.paymentSchedule)
      ? mapArrayFromFm(fm.paymentSchedule as unknown[])
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
      customerId: String(fm.customerId ?? ""),
      title,
      status: (fm.status as Quote["status"]) ?? "draft",
      currency: fm.currency != null ? String(fm.currency) : undefined,
      expiresAt: fm.expiresAt != null ? String(fm.expiresAt) : undefined,
      lineItems,
      paymentSchedule: paymentSchedule?.length ? paymentSchedule : undefined,
      subtotal: Number(fm.subtotal ?? 0),
      tax: fm.tax != null ? Number(fm.tax) : undefined,
      taxRate: fm.taxRate != null ? Number(fm.taxRate) : undefined,
      total: Number(fm.total ?? 0),
      notes,
      footer: fm.footer != null ? String(fm.footer) : undefined,
      revision: fm.revision != null ? Number(fm.revision) : undefined,
      convertedToInvoice: fm.convertedToInvoice != null
        ? String(fm.convertedToInvoice)
        : undefined,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      sentAt: fm.sentAt != null ? String(fm.sentAt) : undefined,
      acceptedAt: fm.acceptedAt != null ? String(fm.acceptedAt) : undefined,
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
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
