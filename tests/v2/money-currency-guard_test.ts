/**
 * sumByCurrency groups monetary amounts per currency and flags mixed sets, so
 * rollups never present a single blended total across currencies (formatCurrency
 * renders one project currency). Coherence step 2 (note_1782101550180).
 */

import { assertEquals } from "@std/assert";
import {
  formatCurrencySubtotal,
  sumByCurrency,
} from "../../src/utils/money.ts";

Deno.test("single currency: one subtotal, not mixed", () => {
  const { subtotals, mixed } = sumByCurrency([
    { amount: 100, currency: "CAD" },
    { amount: 50, currency: "CAD" },
  ]);
  assertEquals(mixed, false);
  assertEquals(subtotals, [{ currency: "CAD", amount: 150 }]);
});

Deno.test("missing currency falls back to the provided default", () => {
  const { subtotals, mixed } = sumByCurrency(
    [{ amount: 100 }, { amount: 25, currency: "" }],
    "USD",
  );
  assertEquals(mixed, false);
  assertEquals(subtotals, [{ currency: "USD", amount: 125 }]);
});

Deno.test("mixed currencies: per-currency subtotals, sorted, flagged", () => {
  const { subtotals, mixed } = sumByCurrency([
    { amount: 100, currency: "USD" },
    { amount: 200, currency: "CAD" },
    { amount: 50, currency: "USD" },
  ]);
  assertEquals(mixed, true);
  assertEquals(subtotals, [
    { currency: "CAD", amount: 200 },
    { currency: "USD", amount: 150 },
  ]);
});

Deno.test("formatCurrencySubtotal shows the code only for an explicit currency", () => {
  assertEquals(
    formatCurrencySubtotal({ currency: "USD", amount: 1234 }),
    "1234.00 USD",
  );
  // No code → project-currency formatter (non-empty string).
  assertEquals(
    formatCurrencySubtotal({ currency: "", amount: 0 }).length > 0,
    true,
  );
});
