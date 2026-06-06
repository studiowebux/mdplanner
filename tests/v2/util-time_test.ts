/**
 * Unit tests for src/utils/time.ts — date parsing and locale-aware display.
 *
 * Date.now()-dependent helpers (dueIn/timeAgo) are made deterministic by
 * stubbing Date.now to local midnight of 2026-06-01, so date-only diffs are
 * exact multiples of a day. variance/duration take explicit dates and are
 * naturally deterministic. The stub is always restored in `finally`.
 */

import { assert, assertEquals, assertMatch } from "@std/assert";
import {
  dueIn,
  duration,
  formatDate,
  parseDate,
  setTimeLocale,
  timeAgo,
  variance,
  varianceClass,
} from "../../src/utils/time.ts";

/** Run `fn` with Date.now() pinned to local midnight 2026-06-01. */
function withFixedNow(fn: () => void) {
  const realNow = Date.now;
  const fixed = new Date(2026, 5, 1).getTime(); // local midnight, June 1 2026
  Date.now = () => fixed;
  try {
    fn();
  } finally {
    Date.now = realNow;
  }
}

Deno.test("parseDate — YYYY-MM-DD parses as local midnight", () => {
  const d = parseDate("2026-06-06");
  assertEquals(d.getFullYear(), 2026);
  assertEquals(d.getMonth(), 5); // June (0-based)
  assertEquals(d.getDate(), 6);
  assertEquals(d.getHours(), 0);
  assertEquals(d.getMinutes(), 0);
});

Deno.test("parseDate — datetime strings keep their time", () => {
  const d = parseDate("2026-06-06T14:30:00");
  assertEquals(d.getHours(), 14);
  assertEquals(d.getMinutes(), 30);
});

Deno.test("parseDate — invalid input yields an Invalid Date", () => {
  assert(isNaN(parseDate("not-a-date").getTime()));
});

Deno.test("formatDate — date-only output is ISO YYYY-MM-DD", () => {
  assertEquals(formatDate("2026-03-15"), "2026-03-15");
});

Deno.test("formatDate — empty/nullish/invalid yields empty string", () => {
  assertEquals(formatDate(""), "");
  assertEquals(formatDate(null), "");
  assertEquals(formatDate(undefined), "");
  assertEquals(formatDate("garbage"), "");
});

Deno.test("formatDate — includeTime appends a time after the date", () => {
  const out = formatDate("2026-03-15T14:30:00", true);
  assert(out.startsWith("2026-03-15 "));
  assertMatch(out, /\d{1,2}:\d{2}/);
});

Deno.test("dueIn — future buckets", () => {
  withFixedNow(() => {
    assertEquals(dueIn("2026-06-01"), "today");
    assertEquals(dueIn("2026-06-02"), "tomorrow");
    assertEquals(dueIn("2026-06-06"), "in 5 days");
    assertEquals(dueIn("2026-06-20"), "in 19 days");
    assertEquals(dueIn("2026-07-01"), "in 1 month");
    assertEquals(dueIn("2026-08-01"), "in 2 months");
  });
});

Deno.test("dueIn — overdue buckets", () => {
  withFixedNow(() => {
    assertEquals(dueIn("2026-05-31"), "overdue by 1 day");
    assertEquals(dueIn("2026-05-20"), "overdue by 12 days");
    assertEquals(dueIn("2026-05-02"), "overdue by 1 month");
  });
});

Deno.test("dueIn — empty input yields empty string", () => {
  assertEquals(dueIn(""), "");
  assertEquals(dueIn(null), "");
  assertEquals(dueIn(undefined), "");
});

Deno.test("timeAgo — past buckets", () => {
  withFixedNow(() => {
    assertEquals(timeAgo("2026-06-01"), "today");
    assertEquals(timeAgo("2026-05-31"), "1 day ago");
    assertEquals(timeAgo("2026-05-20"), "12 days ago");
    assertEquals(timeAgo("2026-05-01"), "1 month ago");
    assertEquals(timeAgo("2025-06-01"), "1 year ago");
    assertEquals(timeAgo("2024-06-01"), "2 years ago");
  });
});

Deno.test("timeAgo — future date clamps to today", () => {
  withFixedNow(() => {
    assertEquals(timeAgo("2026-12-31"), "today");
  });
});

Deno.test("timeAgo — empty input yields empty string", () => {
  assertEquals(timeAgo(""), "");
  assertEquals(timeAgo(null), "");
});

Deno.test("variance — late, early, on time", () => {
  assertEquals(variance("2026-06-01", "2026-06-04"), "3 days late");
  assertEquals(variance("2026-06-04", "2026-06-01"), "3 days early");
  assertEquals(variance("2026-06-01", "2026-06-02"), "1 day late");
  assertEquals(variance("2026-06-02", "2026-06-01"), "1 day early");
  assertEquals(variance("2026-06-01", "2026-06-01"), "on time");
});

Deno.test("variance — missing dates yield empty string", () => {
  assertEquals(variance(null, "2026-06-01"), "");
  assertEquals(variance("2026-06-01", null), "");
  assertEquals(variance(undefined, undefined), "");
});

Deno.test("varianceClass — maps variance to CSS class", () => {
  assertEquals(varianceClass("2026-06-01", "2026-06-04"), "text-error"); // late
  assertEquals(varianceClass("2026-06-04", "2026-06-01"), "text-success"); // early
  assertEquals(varianceClass("2026-06-01", "2026-06-01"), "text-success"); // on time
  assertEquals(varianceClass(null, "2026-06-01"), "");
});

Deno.test("duration — day/month/year buckets", () => {
  assertEquals(duration("2026-06-01", "2026-06-01"), "same day");
  assertEquals(duration("2026-06-01", "2026-06-02"), "1 day");
  assertEquals(duration("2026-06-01", "2026-06-15"), "14 days");
  assertEquals(duration("2026-06-01", "2026-07-01"), "1 month");
  assertEquals(duration("2026-06-01", "2026-09-01"), "3 months");
  assertEquals(duration("2026-06-01", "2027-06-01"), "1 year");
});

Deno.test("duration — missing dates yield empty string", () => {
  assertEquals(duration(null, "2026-06-01"), "");
  assertEquals(duration("2026-06-01", undefined), "");
});

Deno.test("setTimeLocale — does not throw and display still works", () => {
  try {
    setTimeLocale("en-GB");
    const out = formatDate("2026-03-15T14:30:00", true);
    assert(out.startsWith("2026-03-15 "));
  } finally {
    setTimeLocale("en-US"); // restore module default for other tests
  }
});
