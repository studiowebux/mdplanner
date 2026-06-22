/**
 * The invoice detail page makes the quote->invoice snapshot model legible:
 * - a DRAFT shows a "not yet issued — live preview, Send to freeze" notice;
 * - an ISSUED (frozen) invoice shows an "Issued <date> — frozen snapshot" notice.
 *
 * Renders through the real detail route so the notice wiring is covered.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { invoicesRouter } from "../../src/views/invoices/routes.tsx";
import {
  getInvoiceService,
  getQuoteService,
  initServices,
} from "../../src/singletons/services.ts";

Deno.test("invoice detail shows a draft preview notice before issue", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-invoice-notice-" });
  initServices(dir, { cache: false });
  try {
    const quote = await getQuoteService().create({
      customerId: "cust_a",
      title: "Build",
      lineItems: [],
    });
    const invoice = await getInvoiceService().create({ quoteId: quote.id });

    const res = await invoicesRouter.request(`http://localhost/${invoice.id}`);
    assertEquals(res.status, 200);
    const html = await res.text();

    assertStringIncludes(html, "invoice-detail__issue-notice--draft");
    assertStringIncludes(html, "not yet issued");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("invoice detail does NOT show the draft notice for a sent invoice without a freeze stamp", async () => {
  // Legacy/pre-snapshot data: status sent but no frozenAt. Must read as issued,
  // never "Draft — not yet issued".
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-invoice-notice-" });
  initServices(dir, { cache: false });
  try {
    const quote = await getQuoteService().create({
      customerId: "cust_a",
      title: "Build",
      lineItems: [],
    });
    const invoice = await getInvoiceService().create({ quoteId: quote.id });
    await getInvoiceService().update(invoice.id, { status: "sent" });

    const res = await invoicesRouter.request(`http://localhost/${invoice.id}`);
    assertEquals(res.status, 200);
    const html = await res.text();

    assertStringIncludes(html, "invoice-detail__issue-notice--issued");
    assertEquals(html.includes("not yet issued"), false);
    assertEquals(html.includes("issue-notice--draft"), false);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("invoice detail shows a frozen-snapshot notice after issue", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-invoice-notice-" });
  initServices(dir, { cache: false });
  try {
    const quote = await getQuoteService().create({
      customerId: "cust_a",
      title: "Build",
      lineItems: [],
    });
    const invoice = await getInvoiceService().create({ quoteId: quote.id });
    await getInvoiceService().issue(invoice.id);

    const res = await invoicesRouter.request(`http://localhost/${invoice.id}`);
    assertEquals(res.status, 200);
    const html = await res.text();

    assertStringIncludes(html, "invoice-detail__issue-notice--frozen");
    assertStringIncludes(html, "frozen snapshot");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
