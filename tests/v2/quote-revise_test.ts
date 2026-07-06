/**
 * Revising a non-draft quote (task_1781996985844) clones it into a NEW editable
 * draft with a fresh sequential number and a `revisedFromId` back-link. The
 * source quote stays immutable (status + id unchanged), so any invoice created
 * from it is unaffected. The route guards on status and redirects to the clone.
 */

import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { quotesRouter } from "../../src/views/quotes/routes.tsx";
import {
  getCustomerService,
  getQuoteService,
  initServices,
} from "../../src/singletons/services.ts";

Deno.test("reviseQuote clones a sent quote into a new draft with back-link", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-quote-revise-" });
  initServices(dir, { cache: false });
  try {
    const service = getQuoteService();
    const customer = await getCustomerService().create({ name: "Acme Corp" });
    const source = await service.create({
      customerId: customer.id,
      title: "Year 1 Plan",
      footer: "Net 30",
      lineItems: [
        {
          id: "li_1",
          type: "service",
          description: "Design",
          quantity: 2,
          unitRate: 100,
          amount: 0,
        },
      ],
    });
    await service.update(source.id, { status: "sent", revision: 1 });

    const clone = await service.reviseQuote(source.id);
    assert(clone, "clone returned");
    assertEquals(clone!.status, "draft", "clone is a draft");
    assertEquals(clone!.revisedFromId, source.id, "clone back-links to source");
    assertNotEquals(clone!.id, source.id, "clone has a new id");
    assertNotEquals(clone!.number, source.number, "clone has a new number");
    assertEquals(clone!.lineItems.length, 1, "line items copied");
    assertEquals(clone!.footer, "Net 30", "footer copied");
    assertEquals(clone!.revision, 2, "revision continues from source");

    // Source stays immutable.
    const reloaded = await service.getById(source.id);
    assertEquals(reloaded!.status, "sent", "source status unchanged");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("POST /:id/revise redirects to the clone; rejects drafts", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-quote-revise-" });
  initServices(dir, { cache: false });
  try {
    const service = getQuoteService();
    const customer = await getCustomerService().create({ name: "Acme Corp" });
    const draft = await service.create({
      customerId: customer.id,
      title: "Draft Plan",
      lineItems: [],
    });

    // Draft cannot be revised.
    const rejected = await quotesRouter.request(
      `http://localhost/${draft.id}/revise`,
      { method: "POST" },
    );
    assertEquals(rejected.status, 422, "draft revise is rejected");

    await service.update(draft.id, { status: "accepted" });
    const res = await quotesRouter.request(
      `http://localhost/${draft.id}/revise`,
      { method: "POST" },
    );
    assertEquals(res.status, 204);
    const redirect = res.headers.get("HX-Redirect");
    assert(redirect, "HX-Redirect present");
    assert(redirect!.startsWith("/quotes/"), "redirects to a quote");
    assertNotEquals(redirect, `/quotes/${draft.id}`, "redirects to the clone");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
