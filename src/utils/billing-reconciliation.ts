// The one place billing reconciliation numbers are derived. Views render the
// result; they never re-sum quotes/invoices/payments themselves. Currency-aware
// (see money.sumByCurrency): each rollup is grouped by currency and flags mixed
// sets so nothing is summed across currencies.

import { type CurrencySubtotal, sumByCurrency } from "./money.ts";
import type { Quote } from "../types/quote.types.ts";
import type { Invoice } from "../types/invoice.types.ts";

export type CurrencyTotals = { subtotals: CurrencySubtotal[]; mixed: boolean };

export type BillingReconciliation = {
  quoted: CurrencyTotals;
  invoiced: CurrencyTotals;
  paid: CurrencyTotals;
  outstanding: CurrencyTotals;
};

/**
 * Derive quoted → invoiced → paid → outstanding from a scope's quotes + invoices
 * (already filtered to a customer or project by the caller). `paid` is the sum
 * of `paidAmount` (which itself derives from recorded payments — the source of
 * truth), so this reconciles end-to-end. `outstanding` is invoiced − paid per
 * invoice, grouped by currency.
 */
export function reconcileBilling(
  quotes: Quote[],
  invoices: Invoice[],
): BillingReconciliation {
  return {
    quoted: sumByCurrency(
      quotes.map((q) => ({ amount: q.total, currency: q.currency })),
    ),
    invoiced: sumByCurrency(
      invoices.map((i) => ({ amount: i.total, currency: i.currency })),
    ),
    paid: sumByCurrency(
      invoices.map((i) => ({ amount: i.paidAmount, currency: i.currency })),
    ),
    outstanding: sumByCurrency(
      invoices.map((i) => ({
        amount: i.total - i.paidAmount,
        currency: i.currency,
      })),
    ),
  };
}
