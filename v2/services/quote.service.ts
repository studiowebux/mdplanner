// Quote service — business logic over QuoteRepository.
// Handles filtering, totals calculation, and auto-generated quote numbers.

import type { QuoteRepository } from "../repositories/quote.repository.ts";
import type {
  CreateQuote,
  ListQuoteOptions,
  Quote,
  UpdateQuote,
} from "../types/quote.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { computeLineAmount, round2 } from "../utils/billing.ts";
import { BaseService } from "./base.service.ts";

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
}
