/**
 * Recording a payment must flow into the invoice's paidAmount (and thus the
 * customer billing rollup). This locks the link+sum+persist chain end-to-end:
 * PaymentService.create -> syncInvoicePaidAmount -> InvoiceService.updatePaidAmount
 * -> persisted paidAmount + status transition to "paid" when fully covered.
 *
 * Regression guard for the unusable raw-text invoiceId field: a payment whose
 * invoiceId is correct (as the new autocomplete guarantees) updates the invoice.
 */

import { assertEquals } from "@std/assert";
import {
  getInvoiceService,
  getPaymentService,
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
    amount: qty * rate,
  };
}

Deno.test("recording a payment updates the issued invoice's paidAmount and status", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-pay-rollup-" });
  initServices(dir, { cache: false });
  try {
    const quote = await getQuoteService().create({
      customerId: "cust_a",
      title: "Build",
      lineItems: [line("a", 2, 100)], // total 200
    });
    const invoice = await getInvoiceService().create({ quoteId: quote.id });
    const issued = await getInvoiceService().issue(invoice.id);
    assertEquals(issued?.total, 200, "frozen total is 200");
    assertEquals(issued?.paidAmount, 0, "nothing paid yet");

    await getPaymentService().create({
      invoiceId: invoice.id,
      amount: 200,
      date: "2026-06-22",
    });

    const paid = await getInvoiceService().getById(invoice.id);
    assertEquals(paid?.paidAmount, 200, "payment rolled into paidAmount");
    assertEquals(paid?.status, "paid", "fully-paid invoice flips to paid");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("a partial payment is summed and leaves the invoice sent", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-pay-rollup-" });
  initServices(dir, { cache: false });
  try {
    const quote = await getQuoteService().create({
      customerId: "cust_a",
      title: "Build",
      lineItems: [line("a", 2, 100)], // total 200
    });
    const invoice = await getInvoiceService().create({ quoteId: quote.id });
    await getInvoiceService().issue(invoice.id);

    await getPaymentService().create({
      invoiceId: invoice.id,
      amount: 50,
      date: "2026-06-22",
    });
    await getPaymentService().create({
      invoiceId: invoice.id,
      amount: 75,
      date: "2026-06-22",
    });

    const partial = await getInvoiceService().getById(invoice.id);
    assertEquals(partial?.paidAmount, 125, "both payments summed");
    assertEquals(partial?.status, "sent", "still owed -> stays sent");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
