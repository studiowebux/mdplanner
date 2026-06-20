/**
 * The invoice DETAIL view must show the linked quote's NUMBER, not the raw
 * quote id. renderDetail now resolves the quote and passes `quoteNumber`
 * (falling back to the id when the quote is missing/deleted).
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { invoicesRouter } from "../../src/views/invoices/routes.tsx";
import {
  getCustomerService,
  getInvoiceService,
  getQuoteService,
  initServices,
} from "../../src/singletons/services.ts";

Deno.test("invoice detail shows the linked quote number, not the id", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-invoice-quote-" });
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

    assertStringIncludes(
      html,
      `/quotes/${quote.id}">`,
      "quote link is present",
    );
    assertStringIncludes(html, quote.number, "quote number is rendered");
    assert(
      !html.includes(`/quotes/${quote.id}">${quote.id}`),
      "raw quote id is not shown as the link text",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
