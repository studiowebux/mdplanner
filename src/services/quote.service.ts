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
import type { LineItem } from "../types/billing.types.ts";
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

  // ---------------------------------------------------------------------------
  // Derive-on-read — subtotal/tax/total and per-line amounts are never stored
  // (see QUOTE_BODY_KEYS / QuoteRepository.serialize). calculateTotals runs on
  // every read so callers always see correct computed values.
  // ---------------------------------------------------------------------------

  override async list(options?: ListQuoteOptions): Promise<Quote[]> {
    let items = (await this.quoteRepo.findAll()).map((q) =>
      this.calculateTotals(q)
    );
    if (options) items = this.applyFilters(items, options);
    return items;
  }

  override async listArchived(): Promise<Quote[]> {
    return (await super.listArchived()).map((q) => this.calculateTotals(q));
  }

  override async getById(id: string): Promise<Quote | null> {
    const quote = await super.getById(id);
    return quote ? this.calculateTotals(quote) : null;
  }

  override async getByName(name: string): Promise<Quote | null> {
    const quote = await super.getByName(name);
    return quote ? this.calculateTotals(quote) : null;
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
    if (!quote.number) {
      await this.quoteRepo.update(quote.id, {
        number: await this.generateNumber(),
      } as UpdateQuote);
    }
    return await this.getById(quote.id) ?? this.calculateTotals(quote);
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

  /**
   * Clone a non-draft quote into a new editable draft (the "Revise" action).
   * The source stays immutable — only domain fields are copied, never the id,
   * number (a fresh sequential one is generated), audit fields, or status. The
   * clone back-links to the source via `revisedFromId`, and its revision counter
   * continues from the source. Existing invoices keep pointing at the source id.
   */
  async reviseQuote(id: string): Promise<Quote | null> {
    const source = await this.getById(id);
    if (!source) return null;
    const clone = await this.create({
      customerId: source.customerId,
      projectId: source.projectId,
      portfolioItemId: source.portfolioItemId,
      title: source.title,
      status: "draft",
      currency: source.currency,
      expiresAt: source.expiresAt,
      // Strip derived per-line amounts — the repository recomputes them.
      lineItems: source.lineItems.map(({ amount: _amount, ...li }) =>
        li as LineItem
      ),
      paymentSchedule: source.paymentSchedule,
      taxRate: source.taxRate,
      notes: source.notes,
      footer: source.footer,
      revisedFromId: source.id,
    });
    return this.update(clone.id, { revision: (source.revision ?? 1) + 1 });
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
    return this.calculateTotals(updated);
  }

  // ---------------------------------------------------------------------------
  // Inline line-item editing (quote detail page) — index-addressed mutations.
  // Each persists via update({ lineItems }), which recomputes totals.
  // ---------------------------------------------------------------------------

  /** Set one editable field on a single line item, then recalc totals. */
  updateLineItemField(
    quote: Quote,
    index: number,
    field: "description" | "quantity" | "unitRate" | "group" | "type",
    raw: string,
  ): Promise<Quote | null> {
    const lineItems = quote.lineItems.map((li) => ({ ...li }));
    const item = lineItems[index];
    if (field === "description") {
      item.description = raw;
    } else if (field === "group") {
      item.group = raw.trim() || null;
    } else if (field === "type") {
      item.type = raw.trim() || "service";
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

  /**
   * Append a pre-built line item (e.g. billed time = hours × rate) and recalc
   * totals. Used by the "Add time" action; the caller resolves the task time
   * entries and billing rate.
   */
  addLineItemRow(
    quote: Quote,
    row: {
      description: string;
      quantity?: number;
      unit?: LineItem["unit"];
      unitRate?: number;
    },
  ): Promise<Quote | null> {
    const lineItems = [
      ...quote.lineItems.map((li) => ({ ...li })),
      {
        id: `li_${crypto.randomUUID().slice(0, 8)}`,
        type: "service" as const,
        description: row.description,
        quantity: row.quantity,
        unit: row.unit,
        unitRate: row.unitRate,
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

  /** Swap a line item with its neighbour (up = lower index, down = higher). */
  moveLineItem(
    quote: Quote,
    index: number,
    dir: "up" | "down",
  ): Promise<Quote | null> {
    const lineItems = quote.lineItems.map((li) => ({ ...li }));
    const swapIdx = dir === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= lineItems.length) {
      return Promise.resolve(quote);
    }
    [lineItems[index], lineItems[swapIdx]] = [
      lineItems[swapIdx],
      lineItems[index],
    ];
    return this.update(quote.id, { lineItems });
  }
}
