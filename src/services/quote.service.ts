// Quote service — business logic over QuoteRepository.
// Handles filtering, totals calculation, and auto-generated quote numbers.

import type { QuoteRepository } from "../repositories/quote.repository.ts";
import type {
  CreateQuote,
  ListQuoteOptions,
  Quote,
  QuoteRevision,
  UpdateQuote,
} from "../types/quote.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { computeLineAmount, round2 } from "../utils/billing.ts";
import { BaseService } from "./base.service.ts";

/** Quote service: CRUD plus total calculation, sending (sendQuote), revision history (getRevisions), and line-item editing; filters by customerId, status, and text query (q). */
export class QuoteService extends BaseService<
  Quote,
  CreateQuote,
  UpdateQuote,
  ListQuoteOptions
> {
  constructor(private quoteRepo: QuoteRepository) {
    super(quoteRepo);
  }

  protected applyFilters(
    quotes: Quote[],
    options: ListQuoteOptions,
  ): Quote[] {
    if (options.status) {
      quotes = quotes.filter((q) => q.status === options.status);
    }
    if (options.customerId) {
      quotes = quotes.filter((q) => q.customerId === options.customerId);
    }
    if (options.q) {
      quotes = quotes.filter((q) =>
        ciIncludes(q.title, options.q!) ||
        ciIncludes(q.number, options.q!) ||
        ciIncludes(q.notes, options.q!)
      );
    }
    return quotes;
  }

  /** Recalculate all line amounts, subtotal, tax, and total. */
  calculateTotals(quote: Quote): Quote {
    const lineItems = quote.lineItems.map((li) => ({
      ...li,
      amount: computeLineAmount(li),
    }));

    // Subtotal: sum of non-optional line amounts
    const subtotal = round2(
      lineItems
        .filter((li) => li.type !== "text" && !li.optional)
        .reduce((sum, li) => sum + li.amount, 0),
    );

    // Tax: applied only to taxable non-optional lines
    let tax: number | undefined;
    if (quote.taxRate && quote.taxRate > 0) {
      const taxableTotal = round2(
        lineItems
          .filter((li) =>
            li.type !== "text" && !li.optional && li.taxable !== false
          )
          .reduce((sum, li) => sum + li.amount, 0),
      );
      tax = round2(taxableTotal * (quote.taxRate / 100));
    }

    const total = round2(subtotal + (tax ?? 0));

    return { ...quote, lineItems, subtotal, tax, total };
  }

  /** Generate next sequential quote number for the current year. */
  private async generateNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `Q-${year}-`;
    const all = await this.quoteRepo.findAll();
    let max = 0;
    for (const q of all) {
      if (q.number.startsWith(prefix)) {
        const n = parseInt(q.number.slice(prefix.length), 10);
        if (n > max) max = n;
      }
    }
    return `${prefix}${String(max + 1).padStart(3, "0")}`;
  }

  override async create(data: CreateQuote): Promise<Quote> {
    const quote = await super.create(data);
    const number = quote.number || await this.generateNumber();
    const withTotals = this.calculateTotals({ ...quote, number });
    return (await this.quoteRepo.update(quote.id, withTotals)) ?? withTotals;
  }

  /** Snapshot the current quote state, then transition to sent. */
  async sendQuote(quote: Quote, sentBy = "system"): Promise<Quote | null> {
    const nextRevision = (quote.revision ?? 0) + 1;
    const snapshot: QuoteRevision = {
      revisionNumber: nextRevision,
      snapshotAt: new Date().toISOString(),
      total: quote.total,
      subtotal: quote.subtotal,
      currency: quote.currency,
      lineItemCount: quote.lineItems.length,
      sentBy,
    };
    await this.quoteRepo.appendRevision(quote.id, snapshot);

    return this.update(quote.id, {
      status: "sent",
      sentAt: snapshot.snapshotAt,
      revision: nextRevision,
    });
  }

  /** Return revision history for a quote. */
  getRevisions(id: string): Promise<QuoteRevision[]> {
    return this.quoteRepo.getRevisions(id);
  }

  override async update(
    id: string,
    data: UpdateQuote,
  ): Promise<Quote | null> {
    const updated = await super.update(id, data);
    if (!updated) return null;
    if (data.lineItems || data.taxRate !== undefined) {
      const withTotals = this.calculateTotals(updated);
      return (await this.quoteRepo.update(id, withTotals)) ?? withTotals;
    }
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Inline line-item editing (quote detail page) — index-addressed mutations.
  // Each persists via update({ lineItems }), which recomputes totals.
  // ---------------------------------------------------------------------------

  /** Set one editable field on a single line item, then recalc totals. */
  updateLineItemField(
    quote: Quote,
    index: number,
    field: "description" | "quantity" | "unitRate",
    raw: string,
  ): Promise<Quote | null> {
    const lineItems = quote.lineItems.map((li) => ({ ...li }));
    const item = lineItems[index];
    if (field === "description") {
      item.description = raw;
    } else {
      const trimmed = raw.trim();
      item[field] = trimmed === "" ? undefined : Number(trimmed);
      if (item[field] != null && Number.isNaN(item[field])) {
        item[field] = undefined;
      }
    }
    return this.update(quote.id, { lineItems });
  }

  /** Append a blank service line item, then recalc totals. */
  addLineItem(quote: Quote): Promise<Quote | null> {
    const lineItems = [
      ...quote.lineItems.map((li) => ({ ...li })),
      {
        id: `li_${crypto.randomUUID().slice(0, 8)}`,
        type: "service" as const,
        description: "",
        quantity: undefined,
        unit: undefined,
        unitRate: undefined,
        amount: 0,
      },
    ];
    return this.update(quote.id, { lineItems });
  }

  /** Remove a single line item by index, then recalc totals. */
  removeLineItem(quote: Quote, index: number): Promise<Quote | null> {
    const lineItems = quote.lineItems
      .filter((_, i) => i !== index)
      .map((li) => ({ ...li }));
    return this.update(quote.id, { lineItems });
  }
}
