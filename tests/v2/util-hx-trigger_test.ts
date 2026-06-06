/**
 * Unit tests for src/utils/hx-trigger.ts — HX-Trigger header builder.
 */

import { assertEquals } from "@std/assert";
import { hxTrigger } from "../../src/utils/hx-trigger.ts";

Deno.test("hxTrigger — success payload fires toast + closes sidenav", () => {
  const parsed = JSON.parse(hxTrigger("success", "Saved"));
  assertEquals(parsed, {
    showToast: { type: "success", message: "Saved" },
    closeSidenav: true,
  });
});

Deno.test("hxTrigger — error payload", () => {
  const parsed = JSON.parse(hxTrigger("error", "Validation failed"));
  assertEquals(parsed.showToast.type, "error");
  assertEquals(parsed.showToast.message, "Validation failed");
  assertEquals(parsed.closeSidenav, true);
});

Deno.test("hxTrigger — output is valid JSON for the HX-Trigger header", () => {
  const out = hxTrigger("success", 'has "quotes" and \\ backslash');
  // Must round-trip without throwing — header value must be valid JSON.
  const parsed = JSON.parse(out);
  assertEquals(parsed.showToast.message, 'has "quotes" and \\ backslash');
});

Deno.test("hxTrigger — empty message is preserved", () => {
  const parsed = JSON.parse(hxTrigger("success", ""));
  assertEquals(parsed.showToast.message, "");
});
