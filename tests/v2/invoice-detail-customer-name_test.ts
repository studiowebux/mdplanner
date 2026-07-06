/**
 * The invoice DETAIL view must show the customer's NAME, not the raw customer
 * id. The list table/card and the print/export already resolve the name; the
 * detail page rendered `invoice.customerId` verbatim. renderDetail now resolves
 * the customer and passes `customerName` (falling back to the id when the
 * customer is missing/deleted).
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { invoicesRouter } from "../../src/views/invoices/routes.tsx";
import {
  getCustomerService,
  getInvoiceService,
  getQuoteService,
  initServices,
} from "../../src/singletons/services.ts";

Deno.test("invoice detail shows the customer name, not the id", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-invoice-cust-" });
  initServices(dir, { cache: false });
  try {
    const customer = await getCustomerService().create({ name: "Acme Corp" });
    const quote = await getQuoteService().create({
      customerId: customer.id,
      title: "Year 1 Plan",
      lineItems: [],
    });
    const invoice = await getInvoiceService().create({ quoteId: quote.id });

    const res = await invoicesRouter.request(`http://localhost/${invoice.id}`);
    assertEquals(res.status, 200);
    const html = await res.text();

    // The Customer info link shows the name.
    assertStringIncludes(
      html,
      `/customers/${customer.id}">Acme Corp`,
      "customer link text is the name",
    );
    assert(
      !html.includes(`/customers/${customer.id}">${customer.id}`),
      "raw customer id is not shown as the link text",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("invoice detail falls back to the id for a missing customer", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-invoice-cust2-" });
  initServices(dir, { cache: false });
  try {
    const quote = await getQuoteService().create({
      customerId: "customer_does_not_exist",
      title: "Orphan Invoice",
      lineItems: [],
    });
    const invoice = await getInvoiceService().create({ quoteId: quote.id });

    const res = await invoicesRouter.request(`http://localhost/${invoice.id}`);
    assertEquals(res.status, 200);
    const html = await res.text();
    assertStringIncludes(
      html,
      `/customers/customer_does_not_exist">customer_does_not_exist`,
      "falls back to the id when the customer cannot be resolved",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
