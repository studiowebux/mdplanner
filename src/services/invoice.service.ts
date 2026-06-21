// Invoice service — business logic over InvoiceRepository.
// Invoice = a frozen snapshot of its quote at issue (decision note_1782013833761):
//   - DRAFT (frozenAt null): customer, line items, totals, and footer are derived
//     live from the referenced quote at read time (a preview of the quote).
//   - ISSUED (frozenAt set, on Send): the quote snapshot is persisted on the
//     invoice and is immutable — later quote edits never change it.

import type { InvoiceRepository } from "../repositories/invoice.repository.ts";
import type {
  CreateInvoice,
  Invoice,
  ListInvoiceOptions,
  UpdateInvoice,
} from "../types/invoice.types.ts";
import type { Quote } from "../types/quote.types.ts";
import type { QuoteService } from "./quote.service.ts";
import { ciIncludes } from "../utils/string.ts";
import { computeLineAmount, round2 } from "../utils/billing.ts";
import { BaseService } from "./base.service.ts";

/** Invoice service: derives customer/line-items/totals from the referenced quote (hydrate), overdue/display-status derivation (isOverdue/displayStatus), and paid-amount sync (updatePaidAmount); filters by customerId, status, and text query (q). */
export class InvoiceService extends BaseService<
  Invoice,
  CreateInvoice,
  UpdateInvoice,
  ListInvoiceOptions
> {
  constructor(
    private invoiceRepo: InvoiceRepository,
    private quoteService: QuoteService,
  ) {
    super(invoiceRepo);
  }

  // ---------------------------------------------------------------------------
  // Hydration — issued invoices use their own frozen snapshot; drafts derive
  // their content live from the referenced quote.
  // ---------------------------------------------------------------------------

  /** Recompute per-line amounts (stripped on serialize) for a frozen snapshot. */
  private withLineAmounts(invoice: Invoice): Invoice {
    return {
      ...invoice,
      lineItems: invoice.lineItems.map((li) => ({
        ...li,
        amount: computeLineAmount(li),
      })),
    };
  }

  /**
   * For a frozen invoice, return its stored snapshot as-is (amounts recomputed).
   * For a draft, inject customer, line items, totals, and footer from the
   * (pre-loaded) quote.
   */
  private hydrateWith(invoice: Invoice, quote: Quote | undefined): Invoice {
    if (invoice.frozenAt) return this.withLineAmounts(invoice);
    if (!quote) {
      return {
        ...invoice,
        lineItems: [],
        subtotal: 0,
        tax: undefined,
        taxRate: undefined,
        total: 0,
      };
    }
    return {
      ...invoice,
      customerId: quote.customerId,
      projectId: invoice.projectId ?? quote.projectId,
      currency: invoice.currency ?? quote.currency,
      footer: invoice.footer ?? quote.footer,
      lineItems: quote.lineItems.filter((li) => !li.optional),
      subtotal: quote.subtotal,
      tax: quote.tax,
      taxRate: quote.taxRate,
      total: quote.total,
    };
  }

  /** Hydrate a single invoice (frozen snapshot, or live from its quote). */
  private async hydrate(invoice: Invoice): Promise<Invoice> {
    if (invoice.frozenAt) return this.withLineAmounts(invoice);
    const quote = invoice.quoteId
      ? await this.quoteService.getById(invoice.quoteId) ?? undefined
      : undefined;
    return this.hydrateWith(invoice, quote);
  }

  /** Hydrate a batch of invoices with a single quote lookup. */
  private async hydrateAll(invoices: Invoice[]): Promise<Invoice[]> {
    const quotes = await this.quoteService.list();
    const byId = new Map(quotes.map((q) => [q.id, q]));
    return invoices.map((inv) => this.hydrateWith(inv, byId.get(inv.quoteId)));
  }

  override async list(options?: ListInvoiceOptions): Promise<Invoice[]> {
    let items = await this.hydrateAll(await this.invoiceRepo.findAll());
    if (options) items = this.applyFilters(items, options);
    return items;
  }

  override async listArchived(): Promise<Invoice[]> {
    return this.hydrateAll(await super.listArchived());
  }

  override async getById(id: string): Promise<Invoice | null> {
    const invoice = await super.getById(id);
    return invoice ? this.hydrate(invoice) : null;
  }

  /** Raw stored markdown for an invoice (the local-state content to checksum). */
  getRawMarkdown(id: string): Promise<string | null> {
    return this.invoiceRepo.findRawById(id);
  }

  override async getByName(name: string): Promise<Invoice | null> {
    const invoice = await super.getByName(name);
    return invoice ? this.hydrate(invoice) : null;
  }

  protected applyFilters(
    invoices: Invoice[],
    options: ListInvoiceOptions,
  ): Invoice[] {
    if (options.status) {
      invoices = invoices.filter((i) => {
        // Include overdue in "sent" filter (overdue is computed from sent)
        if (options.status === "overdue") return this.isOverdue(i);
        if (options.status === "sent") {
          return i.status === "sent" && !this.isOverdue(i);
        }
        return i.status === options.status;
      });
    }
    if (options.customerId) {
      invoices = invoices.filter((i) => i.customerId === options.customerId);
    }
    if (options.q) {
      invoices = invoices.filter((i) =>
        ciIncludes(i.title, options.q!) ||
        ciIncludes(i.number, options.q!) ||
        ciIncludes(i.notes, options.q!)
      );
    }
    return invoices;
  }

  /** Check if an invoice is overdue (sent + past due date). */
  isOverdue(invoice: Invoice): boolean {
    if (invoice.status !== "sent") return false;
    if (!invoice.dueDate) return false;
    const today = new Date().toISOString().slice(0, 10);
    return invoice.dueDate < today;
  }

  /** Get display status (includes computed "overdue"). */
  displayStatus(invoice: Invoice): string {
    if (this.isOverdue(invoice)) return "overdue";
    return invoice.status;
  }

  /** Generate next sequential invoice number for the current year. */
  private async generateNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const all = await this.invoiceRepo.findAll();
    let max = 0;
    for (const inv of all) {
      if (inv.number.startsWith(prefix)) {
        const n = parseInt(inv.number.slice(prefix.length), 10);
        if (n > max) max = n;
      }
    }
    return `${prefix}${String(max + 1).padStart(3, "0")}`;
  }

  /** Update paid amount and auto-transition status (uses the quote-derived total). */
  async updatePaidAmount(
    invoiceId: string,
    totalPaid: number,
  ): Promise<Invoice | null> {
    const invoice = await this.getById(invoiceId);
    if (!invoice) return null;

    const paidAmount = round2(totalPaid);
    const updates: Record<string, unknown> = { paidAmount };

    if (paidAmount >= invoice.total && invoice.status === "sent") {
      updates.status = "paid";
      updates.paidAt = new Date().toISOString();
    } else if (
      paidAmount < invoice.total && invoice.status === "paid"
    ) {
      updates.status = "sent";
      updates.paidAt = null;
    }

    await this.invoiceRepo.update(invoiceId, updates as UpdateInvoice);
    return this.getById(invoiceId);
  }

  override async create(data: CreateInvoice): Promise<Invoice> {
    const quote = await this.quoteService.getById(data.quoteId);
    if (!quote) throw new Error(`Quote '${data.quoteId}' not found`);

    const created = await super.create({
      ...data,
      title: data.title || quote.title,
      currency: data.currency ?? quote.currency,
      projectId: data.projectId ?? quote.projectId,
    });
    const number = created.number || await this.generateNumber();
    await this.invoiceRepo.update(created.id, { number } as UpdateInvoice);
    return await this.getById(created.id) ?? created;
  }

  /**
   * Issue a draft invoice: capture an immutable snapshot of the referenced
   * quote (customer, line items, totals, currency, footer) onto the invoice,
   * mark it `sent`, and stamp `frozenAt`/`sentAt`. After this, later quote
   * edits no longer affect the invoice. Idempotent — re-issuing returns the
   * already-frozen invoice unchanged.
   */
  async issue(invoiceId: string): Promise<Invoice | null> {
    const stored = await super.getById(invoiceId);
    if (!stored) return null;
    if (stored.frozenAt) return this.getById(invoiceId);

    const quote = stored.quoteId
      ? await this.quoteService.getById(stored.quoteId)
      : null;
    if (!quote) throw new Error(`Quote '${stored.quoteId}' not found`);

    const now = new Date().toISOString();
    const snapshot: Record<string, unknown> = {
      customerId: quote.customerId,
      currency: stored.currency ?? quote.currency,
      footer: stored.footer ?? quote.footer,
      lineItems: quote.lineItems.filter((li) => !li.optional),
      subtotal: quote.subtotal,
      tax: quote.tax,
      taxRate: quote.taxRate,
      total: quote.total,
      status: "sent",
      sentAt: now,
      frozenAt: now,
    };
    await this.invoiceRepo.update(invoiceId, snapshot as UpdateInvoice);
    return this.getById(invoiceId);
  }
}
