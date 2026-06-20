/**
 * The editable draft-quote line-items table (QuoteLineItemsSection) must show
 * per-group subtotal rows, matching the read-only/print LineItemsTable. Without
 * them the editor was inconsistent with the rendered/exported quote.
 */

import { assert } from "@std/assert";
import { QuoteLineItemsSection } from "../../src/views/components/quote-line-items-editor.tsx";
import { toHtml } from "../../src/utils/html.ts";
import type { Quote } from "../../src/types/quote.types.ts";

function quoteWith(lineItems: Quote["lineItems"]): Quote {
  return {
    id: "quote_test",
    number: "Q-2026-100",
    customerId: "customer_test",
    title: "Build",
    status: "draft",
    currency: "CAD",
    lineItems,
    subtotal: 0,
    tax: 0,
    taxRate: 0,
    total: 0,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  } as unknown as Quote;
}

Deno.test("editor renders per-group subtotals across multiple named groups", async () => {
  const quote = quoteWith(
    [
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
    ] as unknown as Quote["lineItems"],
  );

  const html = await toHtml(QuoteLineItemsSection({ quote }));
  assert(
    html.includes("line-items-table__group-subtotal"),
    "subtotal rows render in the editor when multiple named groups exist",
  );
  assert(html.includes("Phase 1 subtotal"), "first group subtotal label shown");
  assert(
    html.includes("Phase 2 subtotal"),
    "second group subtotal label shown",
  );
});

Deno.test("editor omits subtotals when there is a single group", async () => {
  const quote = quoteWith(
    [
      {
        id: "1",
        type: "service",
        description: "A",
        quantity: 1,
        unitRate: 10,
        amount: 10,
        group: "Phase 1",
      },
    ] as unknown as Quote["lineItems"],
  );

  const html = await toHtml(QuoteLineItemsSection({ quote }));
  assert(
    !html.includes("line-items-table__group-subtotal"),
    "no subtotal row for a single group",
  );
});
