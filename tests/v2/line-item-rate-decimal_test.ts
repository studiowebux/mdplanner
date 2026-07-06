/**
 * Line-item number inputs must accept decimal values (e.g. invoice rate 12.50).
 * Regression for: invoice line-item rate input rejected decimals because the
 * `<input type="number">` defaulted to step=1. The shared array-table number
 * renderer (used by invoice/quote lineItems via BASE_LINE_ITEM_FIELDS) must
 * emit step="any".
 */

import { assert } from "@std/assert";
import { toHtml } from "../../src/utils/html.ts";
import { ArrayTableRowField } from "../../src/components/ui/form-builder.tsx";

Deno.test("array-table unitRate number input allows decimals (step=any)", async () => {
  const html = await toHtml(
    ArrayTableRowField({
      section: "lineItems",
      idx: 0,
      field: { type: "number", name: "unitRate", label: "Rate" },
      value: "12.50",
    }),
  );
  assert(html.includes('type="number"'), "renders a number input");
  assert(html.includes('step="any"'), "number input must allow decimals");
  assert(html.includes('value="12.50"'), "preserves the decimal value");
});
