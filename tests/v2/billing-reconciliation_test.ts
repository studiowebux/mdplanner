/**
 * reconcileBilling is the single place quoted/invoiced/paid/outstanding are
 * derived (currency-aware). Coherence step 3 (note_1782101550180) — the customer
 * Billing section (and any future project view) render this, never re-sum.
 */

import { assertEquals } from "@std/assert";
import { reconcileBilling } from "../../src/utils/billing-reconciliation.ts";
import type { Quote } from "../../src/types/quote.types.ts";
import type { Invoice } from "../../src/types/invoice.types.ts";

function quote(total: number, currency?: string): Quote {
  return { total, currency } as Quote;
}
function invoice(
  total: number,
  paidAmount: number,
  currency?: string,
): Invoice {
  return { total, paidAmount, currency } as Invoice;
}

Deno.test("single-currency reconciliation: quoted/invoiced/paid/outstanding", () => {
  const r = reconcileBilling(
    [quote(1000, "CAD"), quote(500, "CAD")],
    [invoice(1000, 400, "CAD")],
  );
  assertEquals(r.quoted.subtotals, [{ currency: "CAD", amount: 1500 }]);
  assertEquals(r.invoiced.subtotals, [{ currency: "CAD", amount: 1000 }]);
  assertEquals(r.paid.subtotals, [{ currency: "CAD", amount: 400 }]);
  assertEquals(r.outstanding.subtotals, [{ currency: "CAD", amount: 600 }]);
  assertEquals(r.outstanding.mixed, false);
});

Deno.test("mixed-currency invoices flag mixed and keep per-currency outstanding", () => {
  const r = reconcileBilling(
    [],
    [invoice(1000, 1000, "CAD"), invoice(500, 100, "USD")],
  );
  assertEquals(r.invoiced.mixed, true);
  assertEquals(r.outstanding.subtotals, [
    { currency: "CAD", amount: 0 },
    { currency: "USD", amount: 400 },
  ]);
});

Deno.test("empty scope yields empty rollups", () => {
  const r = reconcileBilling([], []);
  assertEquals(r.quoted.subtotals, []);
  assertEquals(r.invoiced.mixed, false);
});
