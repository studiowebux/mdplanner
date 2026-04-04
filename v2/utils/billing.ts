// Shared billing utilities — totals calculation, rounding.
// Used by QuoteService and InvoiceService.

import type { LineItem } from "../types/billing.types.ts";

/** Round to 2 decimal places. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
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
