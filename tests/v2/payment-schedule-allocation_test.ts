/**
 * allocateSchedule waterfalls an invoice's actual paid amount across a quote's
 * payment-schedule milestones, so each shows paid/partial/due. Coherence step 5
 * (note_1782101550180).
 */

import { assertEquals } from "@std/assert";
import { allocateSchedule } from "../../src/utils/billing.ts";
import type { PaymentScheduleItem } from "../../src/types/quote.types.ts";

const schedule: PaymentScheduleItem[] = [
  { description: "50% deposit", percent: 50 },
  { description: "Balance", percent: 50 },
];

Deno.test("nothing paid: both milestones due", () => {
  const r = allocateSchedule(schedule, 1000, 0);
  assertEquals(r.map((m) => m.status), ["due", "due"]);
  assertEquals(r.map((m) => m.amount), [500, 500]);
  assertEquals(r.map((m) => m.paid), [0, 0]);
});

Deno.test("partial payment fills earlier milestones first (waterfall)", () => {
  const r = allocateSchedule(schedule, 1000, 700);
  assertEquals(r[0].status, "paid");
  assertEquals(r[0].paid, 500);
  assertEquals(r[1].status, "partial");
  assertEquals(r[1].paid, 200);
});

Deno.test("fully paid: all milestones paid", () => {
  const r = allocateSchedule(schedule, 1000, 1000);
  assertEquals(r.map((m) => m.status), ["paid", "paid"]);
});

Deno.test("fixed amount overrides percent", () => {
  const r = allocateSchedule(
    [{ description: "Setup", amount: 300 }, {
      description: "Rest",
      percent: 70,
    }],
    1000,
    300,
  );
  assertEquals(r[0].amount, 300);
  assertEquals(r[0].status, "paid");
  assertEquals(r[1].amount, 700);
  assertEquals(r[1].status, "due");
});
