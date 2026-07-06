/**
 * Unit tests for src/utils/utilization.ts — utilizationBand boundary mapping.
 * Bands: null→none, >100→over, >=80→ok, >=60→warn, else→under.
 */

import { assertEquals } from "@std/assert";
import { utilizationBand } from "../../src/utils/utilization.ts";

Deno.test("utilizationBand — null yields none", () => {
  assertEquals(utilizationBand(null), "none");
});

Deno.test("utilizationBand — under (<60)", () => {
  assertEquals(utilizationBand(0), "under");
  assertEquals(utilizationBand(59), "under");
  assertEquals(utilizationBand(59.99), "under");
  assertEquals(utilizationBand(-10), "under"); // negative clamps into under
});

Deno.test("utilizationBand — warn [60, 80)", () => {
  assertEquals(utilizationBand(60), "warn");
  assertEquals(utilizationBand(70), "warn");
  assertEquals(utilizationBand(79.99), "warn");
});

Deno.test("utilizationBand — ok [80, 100]", () => {
  assertEquals(utilizationBand(80), "ok");
  assertEquals(utilizationBand(90), "ok");
  assertEquals(utilizationBand(100), "ok"); // exactly 100 is healthy, not over
});

Deno.test("utilizationBand — over (>100)", () => {
  assertEquals(utilizationBand(100.01), "over");
  assertEquals(utilizationBand(101), "over");
  assertEquals(utilizationBand(250), "over");
});
