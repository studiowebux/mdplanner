/**
 * The invoice LIST table must show the customer's NAME, not the raw customer
 * id. Resolution runs through `invoiceToRow` + the `_customerNames` map that
 * `extractFilterOptions` populates on every list render path (/, /view, /more).
 * Falls back to the id when the customer is missing/deleted.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { invoicesRouter } from "../../src/views/invoices/routes.tsx";
import {
  getCustomerService,
  getInvoiceService,
  getQuoteService,
  initServices,
} from "../../src/singletons/services.ts";

Deno.test("invoice list shows the customer name, not the id", async () => {
  const dir = await Deno.makeTempDir({
    prefix: "mdplanner-invoice-list-cust-",
  });
  initServices(dir, { cache: false });
  try {
    const customer = await getCustomerService().create({ name: "Acme Corp" });
    const quote = await getQuoteService().create({
      customerId: customer.id,
      title: "Year 1 Plan",
      lineItems: [],
    });
    await getInvoiceService().create({ quoteId: quote.id });

    const res = await invoicesRouter.request("http://localhost/");
    assertEquals(res.status, 200);
    const html = await res.text();

    assertStringIncludes(
      html,
      `/customers/${customer.id}">Acme Corp`,
      "list row customer link text is the name",
    );
    assert(
      !html.includes(`/customers/${customer.id}">${customer.id}`),
      "raw customer id is not shown as the list link text",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("invoice list falls back to the id for a missing customer", async () => {
  const dir = await Deno.makeTempDir({
    prefix: "mdplanner-invoice-list-cust2-",
  });
  initServices(dir, { cache: false });
  try {
    const quote = await getQuoteService().create({
      customerId: "customer_does_not_exist",
      title: "Orphan Invoice",
      lineItems: [],
    });
    await getInvoiceService().create({ quoteId: quote.id });

    const res = await invoicesRouter.request("http://localhost/");
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
