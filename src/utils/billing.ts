// Shared billing utilities — totals calculation, rounding.
// Used by QuoteService and InvoiceService.

import type { LineItem } from "../types/billing.types.ts";
import type { PaymentScheduleItem } from "../types/quote.types.ts";

/** Round to 2 decimal places. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type ScheduleAllocation = {
  description: string;
  dueDate?: string | null;
  amount: number;
  paid: number;
  status: "paid" | "partial" | "due";
};

/**
 * Allocate an invoice's paid amount across a quote's payment-schedule milestones
 * as a waterfall (earlier milestones fill first), so each milestone shows its
 * paid vs due state from actual payments. Milestone amount = fixed `amount` or
 * `percent` of `total`.
 */
export function allocateSchedule(
  schedule: PaymentScheduleItem[],
  total: number,
  paidAmount: number,
): ScheduleAllocation[] {
  let remaining = round2(Math.max(0, paidAmount));
  return schedule.map((ps) => {
    const amount = round2(
      ps.amount ?? (ps.percent != null ? (total * ps.percent) / 100 : 0),
    );
    const paid = round2(Math.max(0, Math.min(amount, remaining)));
    remaining = round2(remaining - paid);
    const status: ScheduleAllocation["status"] = amount > 0 && paid >= amount
      ? "paid"
      : paid > 0
      ? "partial"
      : "due";
    return {
      description: ps.description,
      dueDate: ps.dueDate,
      amount,
      paid,
      status,
    };
  });
}

/** Compute per-line amount: (quantity × unitRate) - discount. */
export function computeLineAmount(li: LineItem): number {
  if (li.type === "text") return 0;
  const gross = (li.quantity ?? 0) * (li.unitRate ?? 0);
  if (!li.discount) return round2(gross);
  if (li.discountType === "percent") {
    return round2(gross * (1 - li.discount / 100));
  }
  return round2(gross - li.discount);
}
