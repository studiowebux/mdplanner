/**
 * Editing a quote and clearing the Notes field (Edit Mode inline save) must
 * persist the empty value — not silently keep the previous text. The inline
 * PUT /:id/notes route sends the empty string explicitly (it does not collapse
 * to undefined, which mergeFields would skip), so the note is cleared.
 */

import { assert, assertEquals } from "@std/assert";
import { quotesRouter } from "../../src/views/quotes/routes.tsx";
import {
  getQuoteService,
  initServices,
} from "../../src/singletons/services.ts";

Deno.test("clearing a quote's notes inline persists the empty value", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-quote-notes-" });
  initServices(dir, { cache: false });
  try {
    const quote = await getQuoteService().create({
      customerId: "c1",
      title: "T",
      lineItems: [],
      notes: "keep me until cleared",
    });
    assertEquals(
      (await getQuoteService().getById(quote.id))?.notes,
      "keep me until cleared",
    );

    const fd = new FormData();
    fd.set("notes", "");
    const res = await quotesRouter.request(
      `http://localhost/${quote.id}/notes`,
      { method: "PUT", body: fd },
    );
    assertEquals(res.status, 200);

    const after = (await getQuoteService().getById(quote.id))?.notes;
    assert(!after, `notes should be cleared, got: ${JSON.stringify(after)}`);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
