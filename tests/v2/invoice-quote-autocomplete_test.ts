/**
 * The invoice form selects a QUOTE via autocomplete (decision note_1781464477815,
 * re-scoped task_1781387288289). The customer is NOT entered on the invoice — it
 * derives from the quote. So:
 * - The `quoteId` form field is an autocomplete bound to the "quotes-by-id" source.
 * - There is NO `customerId` (or line-item) field on the invoice form.
 * - resolveFormValues maps the stored quote id to a "number — title (customer)"
 *   label so the edit form's autocomplete search box shows a name, not a raw id.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { invoiceConfig } from "../../src/domains/invoice/config.tsx";
import { INVOICE_FORM_FIELDS } from "../../src/domains/invoice/constants.tsx";
import {
  getCustomerService,
  getQuoteService,
  initServices,
} from "../../src/singletons/services.ts";

Deno.test("invoice quoteId field is a required quotes autocomplete", () => {
  const field = INVOICE_FORM_FIELDS.find((f) => f.name === "quoteId");
  assert(field, "quoteId field exists");
  assert(
    field.type === "autocomplete" && field.source === "quotes-by-id",
    "quoteId must be a quotes-by-id autocomplete",
  );
  assert(field.required, "quoteId is required");
});

Deno.test("invoice form has no customerId or lineItems field (derived from the quote)", () => {
  assertEquals(
    INVOICE_FORM_FIELDS.find((f) => f.name === "customerId"),
    undefined,
    "customer is derived from the quote, not entered",
  );
  assertEquals(
    INVOICE_FORM_FIELDS.find((f) => f.name === "lineItems"),
    undefined,
    "line items are derived from the quote, not entered",
  );
});

Deno.test("invoice resolveFormValues maps quote id to a number/title/customer label", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-invoice-quote-ac-" });
  initServices(dir, { cache: false });
  try {
    const customer = await getCustomerService().create({ name: "Acme Corp" });
    const quote = await getQuoteService().create({
      customerId: customer.id,
      title: "Annual Plan",
      lineItems: [],
    });

    const resolved = await invoiceConfig.resolveFormValues!({
      quoteId: quote.id,
      title: "Invoice 1",
    });
    assertStringIncludes(resolved.quoteId, quote.number);
    assertStringIncludes(resolved.quoteId, "Annual Plan");
    assertStringIncludes(resolved.quoteId, "Acme Corp");

    // Empty quoteId is left untouched (nothing to resolve).
    const empty = await invoiceConfig.resolveFormValues!({ quoteId: "" });
    assertEquals(empty.quoteId, "");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
