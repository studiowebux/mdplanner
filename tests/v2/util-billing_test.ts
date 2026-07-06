/**
 * Unit tests for src/utils/billing.ts — per-line money math and 2dp rounding
 * shared by InvoiceService and QuoteService.
 *
 * LineItem objects are built minimally and cast through `unknown` since
 * computeLineAmount only reads type/quantity/unitRate/discount/discountType.
 */

import { assertEquals } from "@std/assert";
import { computeLineAmount, round2 } from "../../src/utils/billing.ts";
import type { LineItem } from "../../src/types/billing.types.ts";

function li(partial: Partial<LineItem>): LineItem {
  return partial as unknown as LineItem;
}

Deno.test("round2 — rounds to two decimals", () => {
  assertEquals(round2(1.234), 1.23);
  assertEquals(round2(1.236), 1.24);
  assertEquals(round2(10), 10);
  assertEquals(round2(0), 0);
  assertEquals(round2(99.999), 100);
});

Deno.test("round2 — negative values round toward +Infinity at .5 (Math.round)", () => {
  assertEquals(round2(-1.236), -1.24);
  assertEquals(round2(-1.234), -1.23);
});

Deno.test("computeLineAmount — quantity × unitRate", () => {
  assertEquals(
    computeLineAmount(li({ type: "service", quantity: 10, unitRate: 150 })),
    1500,
  );
  assertEquals(
    computeLineAmount(li({ type: "service", quantity: 3, unitRate: 33.333 })),
    100,
  );
});

Deno.test("computeLineAmount — text lines are always zero", () => {
  assertEquals(
    computeLineAmount(li({ type: "text", quantity: 5, unitRate: 100 })),
    0,
  );
});

Deno.test("computeLineAmount — missing quantity or unitRate defaults to 0", () => {
  assertEquals(computeLineAmount(li({ type: "service", unitRate: 100 })), 0);
  assertEquals(computeLineAmount(li({ type: "service", quantity: 5 })), 0);
  assertEquals(computeLineAmount(li({ type: "service" })), 0);
});

Deno.test("computeLineAmount — fixed discount subtracted from gross", () => {
  assertEquals(
    computeLineAmount(
      li({ type: "service", quantity: 10, unitRate: 100, discount: 50 }),
    ),
    950,
  );
});

Deno.test("computeLineAmount — percent discount", () => {
  assertEquals(
    computeLineAmount(li({
      type: "service",
      quantity: 10,
      unitRate: 100,
      discount: 10,
      discountType: "percent",
    })),
    900,
  );
  assertEquals(
    computeLineAmount(li({
      type: "service",
      quantity: 4,
      unitRate: 25,
      discount: 25,
      discountType: "percent",
    })),
    75,
  );
});

Deno.test("computeLineAmount — zero/absent discount is a no-op", () => {
  assertEquals(
    computeLineAmount(
      li({ type: "service", quantity: 2, unitRate: 100, discount: 0 }),
    ),
    200,
  );
});
