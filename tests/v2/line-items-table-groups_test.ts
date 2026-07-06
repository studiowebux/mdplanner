/**
 * The quote/invoice line-items viewer must render line-item GROUPS — group
 * label header rows (and per-group subtotals when more than one named group).
 * LineItemsTable.groupItems groups by the `group` field preserving order;
 * both the detail and print views use this component.
 */

import { assert } from "@std/assert";
import { LineItemsTable } from "../../src/views/components/line-items-table.tsx";
import { toHtml } from "../../src/utils/html.ts";
import type { LineItem } from "../../src/types/billing.types.ts";

Deno.test("LineItemsTable renders group headers and per-group subtotals", async () => {
  const items: LineItem[] = [
    {
      id: "1",
      type: "service",
      description: "A",
      quantity: 1,
      unitRate: 10,
      amount: 10,
      group: "Phase 1",
    },
    {
      id: "2",
      type: "service",
      description: "B",
      quantity: 2,
      unitRate: 20,
      amount: 40,
      group: "Phase 2",
    },
  ];

  const html = await toHtml(LineItemsTable({ items }));
  assert(
    html.includes("line-items-table__group-header"),
    "group header rows render",
  );
  assert(html.includes("Phase 1"), "first group label is shown");
  assert(html.includes("Phase 2"), "second group label is shown");
  assert(
    html.includes("line-items-table__group-subtotal"),
    "per-group subtotals render when multiple named groups exist",
  );
});
