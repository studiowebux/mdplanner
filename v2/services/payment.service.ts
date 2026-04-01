// Payment service — business logic over PaymentRepository.
// Syncs invoice paidAmount on create/delete.

import type { PaymentRepository } from "../repositories/payment.repository.ts";
import type {
  CreatePayment,
  ListPaymentOptions,
  Payment,
  UpdatePayment,
} from "../types/payment.types.ts";
import { ciEquals, ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class PaymentService extends BaseService<
  Payment,
  CreatePayment,
  UpdatePayment,
  ListPaymentOptions
> {
  constructor(private paymentRepo: PaymentRepository) {
    super(paymentRepo);
  }

  protected applyFilters(
    payments: Payment[],
    options: ListPaymentOptions,
  ): Payment[] {
    if (options.invoiceId) {
      payments = payments.filter((p) => p.invoiceId === options.invoiceId);
    }
    if (options.method) {
      payments = payments.filter((p) => ciEquals(p.method, options.method));
    }
    if (options.q) {
      payments = payments.filter((p) =>
        ciIncludes(p.reference, options.q!) ||
        ciIncludes(p.notes, options.q!)
      );
    }
    return payments;
  }

  /** Get all payments for a specific invoice. */
  async getPaymentsForInvoice(invoiceId: string): Promise<Payment[]> {
    return this.list({ invoiceId });
  }

  /** Sum all payments for an invoice. */
  async sumForInvoice(invoiceId: string): Promise<number> {
    const payments = await this.getPaymentsForInvoice(invoiceId);
    return payments.reduce((sum, p) => sum + p.amount, 0);
  }

  /** Recalculate invoice paidAmount after payment change. */
  private async syncInvoicePaidAmount(invoiceId: string): Promise<void> {
    // Lazy import to avoid circular dependency
    const { getInvoiceService } = await import(
      "../singletons/services.ts"
    );
    const totalPaid = await this.sumForInvoice(invoiceId);
    await getInvoiceService().updatePaidAmount(invoiceId, totalPaid);
  }

  override async create(data: CreatePayment): Promise<Payment> {
    const payment = await super.create(data);
    await this.syncInvoicePaidAmount(payment.invoiceId);
    return payment;
  }

  override async delete(id: string): Promise<boolean> {
    const payment = await this.paymentRepo.findById(id);
    if (!payment) return false;
    const success = await super.delete(id);
    if (success) {
      await this.syncInvoicePaidAmount(payment.invoiceId);
    }
    return success;
  }
}
