/**
 * DRAFT invoices DERIVE the quote's `footer` (rendered under the "Terms"
 * heading) at read time — same as customer/line-items/totals — so later edits to
 * the quote's terms show up live until the invoice is issued. The invoice's own
 * footer, if set, overrides as a per-invoice term. (Once issued/frozen the
 * footer is part of the immutable snapshot — see invoice-snapshot_test.ts.)
 * These cases all operate on un-issued drafts.
 */

import { assertEquals } from "@std/assert";
import {
  getInvoiceService,
  getQuoteService,
  initServices,
} from "../../src/singletons/services.ts";

Deno.test("invoice derives the quote footer (Terms)", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-invoice-footer-" });
  initServices(dir, { cache: false });
  try {
    const footer = "Payment due within 30 days. Thank you for your business.";
    const quote = await getQuoteService().create({
      customerId: "cust_x",
      title: "Year 1 Plan",
      lineItems: [],
      footer,
    });
    const invoice = await getInvoiceService().create({ quoteId: quote.id });
    const hydrated = await getInvoiceService().getById(invoice.id);
    assertEquals(hydrated?.footer, footer);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("invoice footer reflects later edits to the quote footer", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-invoice-footer-" });
  initServices(dir, { cache: false });
  try {
    const quote = await getQuoteService().create({
      customerId: "cust_x",
      title: "Year 1 Plan",
      lineItems: [],
      footer: "Original terms",
    });
    const invoice = await getInvoiceService().create({ quoteId: quote.id });
    await getQuoteService().update(quote.id, { footer: "Updated terms" });
    const hydrated = await getInvoiceService().getById(invoice.id);
    assertEquals(hydrated?.footer, "Updated terms");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("invoice's own footer overrides the quote footer", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-invoice-footer-" });
  initServices(dir, { cache: false });
  try {
    const quote = await getQuoteService().create({
      customerId: "cust_x",
      title: "Year 1 Plan",
      lineItems: [],
      footer: "Quote terms",
    });
    const invoice = await getInvoiceService().create({
      quoteId: quote.id,
      footer: "Invoice-specific terms",
    });
    const hydrated = await getInvoiceService().getById(invoice.id);
    assertEquals(hydrated?.footer, "Invoice-specific terms");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("invoice footer stays empty when the quote has none", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-invoice-footer-" });
  initServices(dir, { cache: false });
  try {
    const quote = await getQuoteService().create({
      customerId: "cust_x",
      title: "Year 1 Plan",
      lineItems: [],
    });
    const invoice = await getInvoiceService().create({ quoteId: quote.id });
    const hydrated = await getInvoiceService().getById(invoice.id);
    assertEquals(hydrated?.footer ?? undefined, undefined);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
