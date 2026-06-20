/**
 * The quote DETAIL view must show the customer's NAME, not the raw customer
 * id. The list card and the print view already resolve the name; the detail
 * page rendered `quote.customerId` verbatim. renderDetail now resolves the
 * customer and passes `customerName` (falling back to the id when the customer
 * is missing/deleted).
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { quotesRouter } from "../../src/views/quotes/routes.tsx";
import {
  getCustomerService,
  getQuoteService,
  initServices,
} from "../../src/singletons/services.ts";

Deno.test("quote detail shows the customer name, not the id", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-quote-cust-" });
  initServices(dir, { cache: false });
  try {
    const customer = await getCustomerService().create({ name: "Acme Corp" });
    const quote = await getQuoteService().create({
      customerId: customer.id,
      title: "Year 1 Plan",
      lineItems: [],
    });

    const res = await quotesRouter.request(`http://localhost/${quote.id}`);
    assertEquals(res.status, 200);
    const html = await res.text();

    assertStringIncludes(
      html,
      `/customers/${customer.id}">`,
      "customer link is present",
    );
    assertStringIncludes(html, "Acme Corp", "customer name is rendered");
    assert(
      !html.includes(`/customers/${customer.id}">${customer.id}`),
      "raw customer id is not shown as the link text",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("quote detail falls back to the id for a missing customer", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-quote-cust2-" });
  initServices(dir, { cache: false });
  try {
    const quote = await getQuoteService().create({
      customerId: "customer_does_not_exist",
      title: "Orphan Quote",
      lineItems: [],
    });

    const res = await quotesRouter.request(`http://localhost/${quote.id}`);
    assertEquals(res.status, 200);
    const html = await res.text();
    assertStringIncludes(
      html,
      `/customers/customer_does_not_exist">`,
      "falls back to the id when the customer cannot be resolved",
    );
    assertStringIncludes(html, "customer_does_not_exist");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
