/**
 * Invoice = frozen snapshot of its quote at issue (decision note_1782013833761).
 *
 * - A DRAFT invoice (frozenAt null) derives its customer, line items, and totals
 *   live from the referenced quote — a preview that tracks quote edits.
 * - ISSUING the invoice (InvoiceService.issue, called by the Send route) captures
 *   an immutable snapshot: line items, totals, customer, currency, and footer are
 *   persisted on the invoice and `frozenAt` is set. After that, editing the quote
 *   no longer changes the invoice.
 * - Payments compute against the frozen total.
 *
 * This locks the freeze-at-issue behavior and the post-issue immutability.
 */

import { assert, assertEquals } from "@std/assert";
import {
  getInvoiceService,
  getQuoteService,
  initServices,
} from "../../src/singletons/services.ts";
import type { LineItem } from "../../src/types/billing.types.ts";

function line(id: string, qty: number, rate: number): LineItem {
  return {
    id,
    type: "line",
    description: `Item ${id}`,
    quantity: qty,
    unit: "unit",
    unitRate: rate,
    amount: qty * rate, // recomputed on read; required by the in-memory type
  };
}

Deno.test("draft invoice derives line items and total from the quote", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-invoice-snap-" });
  initServices(dir, { cache: false });
  try {
    const quote = await getQuoteService().create({
      customerId: "cust_a",
      title: "Build",
      lineItems: [line("a", 2, 100)],
    });
    const stored = await getQuoteService().getById(quote.id);
    const invoice = await getInvoiceService().create({ quoteId: quote.id });

    const draft = await getInvoiceService().getById(invoice.id);
    assertEquals(draft?.frozenAt ?? null, null, "draft is not frozen");
    assertEquals(draft?.customerId, "cust_a");
    assertEquals(draft?.lineItems.length, 1);
    assertEquals(draft?.total, stored?.total);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("issuing freezes the snapshot; later quote edits don't change it", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-invoice-snap-" });
  initServices(dir, { cache: false });
  try {
    const quote = await getQuoteService().create({
      customerId: "cust_a",
      title: "Build",
      lineItems: [line("a", 2, 100)],
    });
    const invoice = await getInvoiceService().create({ quoteId: quote.id });

    const issued = await getInvoiceService().issue(invoice.id);
    assert(issued?.frozenAt, "issued invoice is frozen");
    assertEquals(issued?.status, "sent");
    assertEquals(issued?.sentAt, issued?.frozenAt);
    const frozenTotal = issued?.total;
    const frozenItems = issued?.lineItems.length;
    assert(frozenTotal && frozenTotal > 0, "frozen total captured");

    // Mutate the quote AFTER issue — add an item and change pricing.
    await getQuoteService().update(quote.id, {
      lineItems: [line("a", 2, 100), line("b", 5, 50)],
    });

    const after = await getInvoiceService().getById(invoice.id);
    assertEquals(after?.total, frozenTotal, "total unchanged after quote edit");
    assertEquals(after?.lineItems.length, frozenItems, "items unchanged");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("issue is idempotent — re-issuing keeps the original snapshot", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-invoice-snap-" });
  initServices(dir, { cache: false });
  try {
    const quote = await getQuoteService().create({
      customerId: "cust_a",
      title: "Build",
      lineItems: [line("a", 1, 100)],
    });
    const invoice = await getInvoiceService().create({ quoteId: quote.id });
    const first = await getInvoiceService().issue(invoice.id);
    const firstFrozen = first?.frozenAt;

    await getQuoteService().update(quote.id, {
      lineItems: [line("a", 9, 100)],
    });
    const second = await getInvoiceService().issue(invoice.id);

    assertEquals(second?.frozenAt, firstFrozen, "frozenAt unchanged");
    assertEquals(second?.total, first?.total, "snapshot unchanged");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
