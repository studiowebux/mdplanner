/**
 * "Add time" turns a task's time entries (× a billing rate) into a quote line
 * item on a draft quote. Coherence step 4 (note_1782101550180).
 */

import { assert, assertEquals } from "@std/assert";
import { quotesRouter } from "../../src/views/quotes/routes.tsx";
import {
  getBillingRateService,
  getQuoteService,
  getTaskService,
  initServices,
} from "../../src/singletons/services.ts";

async function postAddTime(
  quoteId: string,
  fields: Record<string, string>,
): Promise<Response> {
  const body = new URLSearchParams(fields);
  return await quotesRouter.request(`http://localhost/${quoteId}/add-time`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
}

Deno.test("add-time appends a billed line item (hours × rate) to a draft quote", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-add-time-" });
  initServices(dir, { cache: false });
  try {
    const quote = await getQuoteService().create({
      customerId: "cust_a",
      title: "Q",
      lineItems: [],
    });
    const rate = await getBillingRateService().create({
      name: "Senior",
      unit: "h",
      rate: 100,
    });
    const task = await getTaskService().create({
      title: "Build feature",
      section: "Todo",
    });
    await getTaskService().update(task.id, {
      time_entries: [
        { id: "t1", date: "2026-06-01", hours: 3 },
        { id: "t2", date: "2026-06-10", hours: 2 },
      ],
    });

    const res = await postAddTime(quote.id, {
      taskId: task.id,
      billingRateId: rate.id,
    });
    assertEquals(res.status, 200);

    const updated = await getQuoteService().getById(quote.id);
    assertEquals(updated?.lineItems.length, 1);
    const li = updated!.lineItems[0];
    assertEquals(li.quantity, 5, "total hours");
    assertEquals(li.unitRate, 100);
    assertEquals(li.unit, "h");
    assert(li.description.includes("Build feature"));
    assertEquals(updated?.total, 500, "5h × 100 = 500");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("add-time respects a date range and rejects an empty range", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-add-time-" });
  initServices(dir, { cache: false });
  try {
    const quote = await getQuoteService().create({
      customerId: "cust_a",
      title: "Q",
      lineItems: [],
    });
    const rate = await getBillingRateService().create({
      name: "Std",
      unit: "h",
      rate: 50,
    });
    const task = await getTaskService().create({
      title: "Work",
      section: "Todo",
    });
    await getTaskService().update(task.id, {
      time_entries: [
        { id: "t1", date: "2026-06-01", hours: 4 },
        { id: "t2", date: "2026-07-01", hours: 9 },
      ],
    });

    // Only June → 4h.
    await postAddTime(quote.id, {
      taskId: task.id,
      billingRateId: rate.id,
      from: "2026-06-01",
      to: "2026-06-30",
    });
    let updated = await getQuoteService().getById(quote.id);
    assertEquals(updated?.lineItems[0].quantity, 4);

    // A range with no entries is rejected (422), no line item added.
    const res = await postAddTime(quote.id, {
      taskId: task.id,
      billingRateId: rate.id,
      from: "2026-01-01",
      to: "2026-01-31",
    });
    assertEquals(res.status, 422);
    updated = await getQuoteService().getById(quote.id);
    assertEquals(updated?.lineItems.length, 1, "no extra row added");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
