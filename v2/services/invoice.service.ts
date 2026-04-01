// Invoice service — business logic over InvoiceRepository.
// Handles filtering, totals calculation, number generation, and overdue detection.

import type { InvoiceRepository } from "../repositories/invoice.repository.ts";
import type {
  CreateInvoice,
  Invoice,
  ListInvoiceOptions,
  UpdateInvoice,
} from "../types/invoice.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { computeLineAmount, round2 } from "../utils/billing.ts";
import { BaseService } from "./base.service.ts";

export class InvoiceService extends BaseService<
  Invoice,
  CreateInvoice,
  UpdateInvoice,
  ListInvoiceOptions
> {
  constructor(private invoiceRepo: InvoiceRepository) {
    super(invoiceRepo);
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

  /** Recalculate all line amounts, subtotal, tax, and total. */
  calculateTotals(invoice: Invoice): Invoice {
    const lineItems = invoice.lineItems.map((li) => ({
      ...li,
      amount: computeLineAmount(li),
    }));

    const subtotal = round2(
      lineItems
        .filter((li) => li.type !== "text")
        .reduce((sum, li) => sum + li.amount, 0),
    );

    let tax: number | undefined;
    if (invoice.taxRate && invoice.taxRate > 0) {
      const taxableTotal = round2(
        lineItems
          .filter((li) => li.type !== "text" && li.taxable !== false)
          .reduce((sum, li) => sum + li.amount, 0),
      );
      tax = round2(taxableTotal * (invoice.taxRate / 100));
    }

    const total = round2(subtotal + (tax ?? 0));

    return { ...invoice, lineItems, subtotal, tax, total };
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

  /** Update paid amount and auto-transition status. */
  async updatePaidAmount(
    invoiceId: string,
    totalPaid: number,
  ): Promise<Invoice | null> {
    const invoice = await this.invoiceRepo.findById(invoiceId);
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
      updates.paidAt = undefined;
    }

    return this.invoiceRepo.update(invoiceId, updates as UpdateInvoice);
  }

  override async create(data: CreateInvoice): Promise<Invoice> {
    const invoice = await super.create(data);
    const number = invoice.number || await this.generateNumber();
    const withTotals = this.calculateTotals({ ...invoice, number });
    return (await this.invoiceRepo.update(invoice.id, withTotals)) ??
      withTotals;
  }

  override async update(
    id: string,
    data: UpdateInvoice,
  ): Promise<Invoice | null> {
    const updated = await super.update(id, data);
    if (!updated) return null;
    if (data.lineItems || data.taxRate !== undefined) {
      const withTotals = this.calculateTotals(updated);
      return (await this.invoiceRepo.update(id, withTotals)) ?? withTotals;
    }
    return updated;
  }
}
