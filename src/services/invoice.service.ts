// Invoice service — business logic over InvoiceRepository.
// Invoices derive from a quote: customer, line items, totals, and footer (Terms)
// are hydrated from the referenced quote at read time (never stored on the
// invoice — the invoice's own footer, if set, overrides as a per-invoice term).

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
import { round2 } from "../utils/billing.ts";
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
  // Quote-derived hydration — the invoice owns no line items or totals.
  // ---------------------------------------------------------------------------

  /** Inject customer, line items, totals, and footer from a (pre-loaded) quote. */
  private hydrateWith(invoice: Invoice, quote: Quote | undefined): Invoice {
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

  /** Hydrate a single invoice from its referenced quote. */
  private async hydrate(invoice: Invoice): Promise<Invoice> {
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
}
