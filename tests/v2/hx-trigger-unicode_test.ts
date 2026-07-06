/**
 * HX-Trigger header values must be ASCII-safe. Toast messages containing
 * Unicode (em-dash, arrow, accents) previously threw "Value is not a valid
 * ByteString" when set as an HTTP header, 500ing the response before the toast
 * reached the client. escapeHeaderUnicode escapes those to \uXXXX, which is
 * valid in a header and round-trips through the client's JSON.parse.
 */

import { assert, assertEquals } from "@std/assert";
import { escapeHeaderUnicode, hxTrigger } from "../../src/utils/hx-trigger.ts";

function isAsciiHeaderSafe(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) > 0x7f) return false;
  }
  return true;
}

Deno.test("escapeHeaderUnicode output is pure ASCII", () => {
  const out = escapeHeaderUnicode("auth failed — check token → Settings");
  assert(isAsciiHeaderSafe(out), "must contain no chars above U+007F");
  assert(out.includes("\\u2014"), "em-dash escaped to \\u2014");
  assert(out.includes("\\u2192"), "arrow escaped to \\u2192");
});

Deno.test("escapeHeaderUnicode output is a valid HTTP header value", () => {
  // Headers() throws on invalid ByteString values — this is the regression.
  const value = hxTrigger("error", "Café — déjà vu → ok");
  const headers = new Headers();
  headers.set("HX-Trigger", value);
  assertEquals(headers.get("HX-Trigger"), value);
});

Deno.test("escaped header round-trips through JSON.parse to the original text", () => {
  const message = "Cloudflare auth failed — check token → Settings → Project";
  const parsed = JSON.parse(hxTrigger("error", message)) as {
    showToast: { type: string; message: string };
  };
  assertEquals(parsed.showToast.type, "error");
  assertEquals(parsed.showToast.message, message);
});

Deno.test("pure-ASCII messages pass through unchanged", () => {
  assertEquals(escapeHeaderUnicode("Record added"), "Record added");
});
