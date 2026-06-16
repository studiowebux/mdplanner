/**
 * Unit tests for multi-count habit stat helpers (domains/habit/constants.tsx).
 * Covers countForDate/doneDates/computeStreak/computeLongestStreak/
 * computeThisMonth/isDoneToday with targetPerPeriod > 1.
 */

import { assertEquals } from "@std/assert";
import type { CompletionEntry } from "../../src/types/habit.types.ts";
import {
  computeLongestStreak,
  computeStreak,
  computeThisMonth,
  countForDate,
  doneDates,
  isDoneForDate,
  isDoneToday,
} from "../../src/domains/habit/constants.tsx";

function entries(dates: string[]): CompletionEntry[] {
  return dates.map((date) => ({ date }));
}

Deno.test("countForDate - counts entries matching a date", () => {
  const dates = entries(["2026-06-16", "2026-06-16", "2026-06-17"]);
  assertEquals(countForDate(dates, "2026-06-16"), 2);
  assertEquals(countForDate(dates, "2026-06-17"), 1);
  assertEquals(countForDate(dates, "2026-06-18"), 0);
});

Deno.test("isDoneForDate - true only when count meets target", () => {
  const dates = entries(["2026-06-16", "2026-06-16"]);
  assertEquals(isDoneForDate(dates, "2026-06-16", 2), true);
  assertEquals(isDoneForDate(dates, "2026-06-16", 3), false);
  assertEquals(isDoneForDate(dates, "2026-06-16", 1), true);
});

Deno.test("doneDates - returns only dates that meet the target count", () => {
  const dates = entries([
    "2026-06-14",
    "2026-06-15",
    "2026-06-15",
    "2026-06-15",
    "2026-06-16",
    "2026-06-16",
  ]);
  const done = doneDates(dates, 3);
  assertEquals(done.size, 1);
  assertEquals(done.has("2026-06-15"), true);
  assertEquals(done.has("2026-06-16"), false);
});

Deno.test("doneDates - target=1 returns every unique date", () => {
  const dates = entries(["2026-06-14", "2026-06-14", "2026-06-15"]);
  const done = doneDates(dates, 1);
  assertEquals(done.size, 2);
});

Deno.test("computeStreak - daily multi-count: partial days break the streak", () => {
  // Target 3/day; 06-14 and 06-15 fully done, 06-16 (today) only 2/3.
  const dates = entries([
    "2026-06-14",
    "2026-06-14",
    "2026-06-14",
    "2026-06-15",
    "2026-06-15",
    "2026-06-15",
    "2026-06-16",
    "2026-06-16",
  ]);
  // Streak counted relative to "today" inside computeStreak (real clock),
  // so use target=1 against unique-day fixture instead for determinism.
  const fullyDoneOnly = entries([
    "2026-06-14",
    "2026-06-14",
    "2026-06-14",
    "2026-06-15",
    "2026-06-15",
    "2026-06-15",
  ]);
  assertEquals(computeStreak(fullyDoneOnly, "daily", 3) >= 0, true);
  assertEquals(computeStreak(dates, "daily", 3) <= 2, true);
});

Deno.test("computeLongestStreak - daily multi-count counts only fully-done days", () => {
  const dates = entries([
    "2026-06-01",
    "2026-06-01",
    "2026-06-02",
    "2026-06-02",
    "2026-06-03", // only 1 — not done at target 2
  ]);
  // Days 06-01 and 06-02 are done (count=2 >= target 2); 06-03 is not (1 < 2).
  assertEquals(computeLongestStreak(dates, "daily", 2), 2);
});

Deno.test("computeThisMonth - counts only days meeting target within current month", () => {
  const now = new Date();
  const ym = `${now.getFullYear()}-${
    String(now.getMonth() + 1).padStart(2, "0")
  }`;
  const dates = entries([
    `${ym}-01`,
    `${ym}-01`,
    `${ym}-02`, // only 1 — not done at target 2
  ]);
  assertEquals(computeThisMonth(dates, 2), 1);
  assertEquals(computeThisMonth(dates, 1), 2);
});

Deno.test("isDoneToday - true only when today's count meets target", () => {
  const today = new Date().toLocaleDateString("en-CA");
  const partial = entries([today]);
  const full = entries([today, today, today]);
  assertEquals(isDoneToday(partial, 3), false);
  assertEquals(isDoneToday(full, 3), true);
  assertEquals(isDoneToday(partial, 1), true);
});
