/**
 * Unit tests for habit UTC date-key helpers (domains/habit/dates.ts).
 * These must be timezone-independent so completion keys, the heatmap grid, and
 * "today" never drift with the host process timezone.
 */

import { assertEquals, assertMatch } from "@std/assert";
import { currentMonthDays, todayKey } from "../../src/domains/habit/dates.ts";

Deno.test("todayKey - returns the UTC YYYY-MM-DD key", () => {
  const key = todayKey();
  assertMatch(key, /^\d{4}-\d{2}-\d{2}$/);
  assertEquals(key, new Date().toISOString().slice(0, 10));
});

Deno.test("currentMonthDays - covers the whole current UTC month, in order", () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const days = currentMonthDays();
  assertEquals(days.length, daysInMonth);

  // First and last cells line up with the UTC month bounds.
  const mm = String(month + 1).padStart(2, "0");
  assertEquals(days[0], { date: `${year}-${mm}-01`, day: 1 });
  assertEquals(days[daysInMonth - 1], {
    date: `${year}-${mm}-${String(daysInMonth).padStart(2, "0")}`,
    day: daysInMonth,
  });

  // Every cell's `day` matches the day-of-month in its key (no off-by-one).
  for (const { date, day } of days) {
    assertEquals(Number(date.slice(8, 10)), day);
    assertMatch(date, /^\d{4}-\d{2}-\d{2}$/);
  }
});

Deno.test("currentMonthDays - todayKey is one of the generated cells", () => {
  const key = todayKey();
  const dates = currentMonthDays().map((d) => d.date);
  assertEquals(dates.includes(key), true);
});
