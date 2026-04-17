// Shared billing totals summary — used by Quote and Invoice detail views.
// Renders subtotal, discount, tax, total, paid, and balance due.

import type { FC } from "hono/jsx";
import { formatCurrency } from "../../utils/format.ts";

type BillingTotalsProps = {
  subtotal: number;
  discount?: number | null;
  tax?: number | null;
  taxRate?: number | null;
  total: number;
  paidAmount?: number | null;
};

export const BillingTotals: FC<BillingTotalsProps> = ({
  subtotal,
  discount,
  tax,
  taxRate,
  total,
  paidAmount,
}) => {
  const balance = paidAmount != null ? total - paidAmount : undefined;

  return (
    <div class="billing-totals">
      <div class="billing-totals__row">
        <span class="billing-totals__label">Subtotal</span>
        <span class="billing-totals__value">
          {formatCurrency(subtotal) || "$0"}
        </span>
      </div>

      {discount != null && discount > 0 && (
        <div class="billing-totals__row">
          <span class="billing-totals__label">Discount</span>
          <span class="billing-totals__value billing-totals__value--discount">
            &minus;{formatCurrency(discount) || "$0"}
          </span>
        </div>
      )}

      {tax != null && tax > 0 && (
        <div class="billing-totals__row">
          <span class="billing-totals__label">
            Tax{taxRate ? ` (${taxRate}%)` : ""}
          </span>
          <span class="billing-totals__value">
            {formatCurrency(tax) || "$0"}
          </span>
        </div>
      )}

      <div class="billing-totals__row billing-totals__row--total">
        <span class="billing-totals__label">Total</span>
        <span class="billing-totals__value">
          {formatCurrency(total) || "$0"}
        </span>
      </div>

      {paidAmount != null && (
        <div class="billing-totals__row">
          <span class="billing-totals__label">Paid</span>
          <span class="billing-totals__value billing-totals__value--paid">
            {formatCurrency(paidAmount) || "$0"}
          </span>
        </div>
      )}

      {balance != null && balance > 0 && (
        <div class="billing-totals__row billing-totals__row--balance">
          <span class="billing-totals__label">Balance Due</span>
          <span class="billing-totals__value">
            {formatCurrency(balance) || "$0"}
          </span>
        </div>
      )}
    </div>
  );
};
