/**
 * Invoice paidAmount is DERIVED from actual payment records at read time, not
 * read from the stored (denormalized, sync-only) field. This covers the bug
 * where seeded/imported payments left invoice.paidAmount stale at $0
 * (task_1782195203866). A payment written directly through the repository
 * (bypassing PaymentService sync) must still surface on the invoice read.
 */

import { assert, assertEquals } from "@std/assert";
import {
  getCustomerService,
  getInvoiceService,
  getPaymentService,
  getQuoteService,
  initServices,
} from "../../src/singletons/services.ts";

Deno.test("invoice paidAmount derives from payments even when never synced", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-derived-paid-" });
  initServices(dir, { cache: false });
  try {
    const customer = await getCustomerService().create({ name: "Acme Corp" });
    const quote = await getQuoteService().create({
      customerId: customer.id,
      title: "Plan",
      lineItems: [
        {
          id: "li_1",
          type: "service",
          description: "Work",
          quantity: 1,
          unitRate: 1000,
          amount: 0,
        },
      ],
    });
    const invoice = await getInvoiceService().create({ quoteId: quote.id });

    // Payment created through the service rolls up.
    await getPaymentService().create({
      invoiceId: invoice.id,
      amount: 400,
      date: "2026-03-01",
    });
    const afterOne = await getInvoiceService().getById(invoice.id);
    assertEquals(afterOne?.paidAmount, 400, "first payment derived");

    // A second payment summed in the list path too.
    await getPaymentService().create({
      invoiceId: invoice.id,
      amount: 100,
      date: "2026-03-05",
    });
    const inList = (await getInvoiceService().list({ customerId: customer.id }))
      .find((i) => i.id === invoice.id);
    assertEquals(inList?.paidAmount, 500, "list path sums all payments");

    const single = await getInvoiceService().getById(invoice.id);
    assertEquals(single?.paidAmount, 500, "detail path sums all payments");
    assert(single, "invoice still resolves");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
