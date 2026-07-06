/**
 * The global htmx:confirm handler (htmx-triggers.js) defaults every hx-confirm
 * to a delete-styled modal ("Confirm delete" / "Delete") unless the element
 * sets data-confirm-title/data-confirm-label. The draft invoice Send button
 * must opt out so it shows a Send confirmation, not a deletion modal.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { invoicesRouter } from "../../src/views/invoices/routes.tsx";
import {
  getInvoiceService,
  getQuoteService,
  initServices,
} from "../../src/singletons/services.ts";

Deno.test("draft invoice Send button uses Send confirm labels, not delete", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-invoice-send-" });
  initServices(dir, { cache: false });
  try {
    const quote = await getQuoteService().create({
      customerId: "cust_x",
      title: "Year 1 Plan",
      lineItems: [],
    });
    const invoice = await getInvoiceService().create({ quoteId: quote.id });

    const res = await invoicesRouter.request(`http://localhost/${invoice.id}`);
    assertEquals(res.status, 200);
    const html = await res.text();

    assertStringIncludes(
      html,
      `/invoices/${invoice.id}/send`,
      "Send button present",
    );
    assertStringIncludes(html, 'data-confirm-title="Send Invoice"');
    assertStringIncludes(html, 'data-confirm-label="Send"');
    assert(
      !html.includes('data-confirm-label="Delete"'),
      "Send button must not fall back to the Delete confirm label",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
