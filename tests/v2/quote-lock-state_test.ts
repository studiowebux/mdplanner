/**
 * Non-draft quotes are locked: the detail page drops the "Edit Mode" toggle and
 * shows an obvious locked banner. A draft quote keeps Edit Mode and shows no
 * lock banner. Mirrors the invoice lock model — billing content is immutable
 * once a quote leaves draft (task_1781996970320).
 */

import { assert, assertEquals } from "@std/assert";
import { quotesRouter } from "../../src/views/quotes/routes.tsx";
import {
  getCustomerService,
  getQuoteService,
  initServices,
} from "../../src/singletons/services.ts";

Deno.test("draft quote shows Edit Mode, no lock banner", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-quote-lock-" });
  initServices(dir, { cache: false });
  try {
    const customer = await getCustomerService().create({ name: "Acme Corp" });
    const quote = await getQuoteService().create({
      customerId: customer.id,
      title: "Draft Plan",
      lineItems: [],
    });

    const res = await quotesRouter.request(`http://localhost/${quote.id}`);
    assertEquals(res.status, 200);
    const html = await res.text();

    assert(html.includes("Edit Mode"), "draft shows the Edit Mode toggle");
    assert(
      !html.includes("quote-detail__lock-notice"),
      "draft shows no lock banner",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("non-draft quote hides Edit Mode and shows lock banner", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-quote-lock-" });
  initServices(dir, { cache: false });
  try {
    const customer = await getCustomerService().create({ name: "Acme Corp" });
    const quote = await getQuoteService().create({
      customerId: customer.id,
      title: "Sent Plan",
      lineItems: [],
    });
    await getQuoteService().update(quote.id, { status: "sent" });

    const res = await quotesRouter.request(`http://localhost/${quote.id}`);
    assertEquals(res.status, 200);
    const html = await res.text();

    assert(!html.includes("Edit Mode"), "non-draft drops the Edit Mode toggle");
    assert(
      html.includes("quote-detail__lock-notice"),
      "non-draft shows the lock banner",
    );
    assert(html.includes("locked"), "lock banner explains the locked state");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
