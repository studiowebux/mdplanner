// Canonical money util (zt54gz): parseMoney (string ↔ number, decimal-safe)
// and formatMoney (delegates to the one currency engine, always 2 decimals).

import { assertEquals } from "@std/assert";
import { formatMoney, parseMoney } from "../../src/utils/money.ts";
import { setFormatConfig } from "../../src/utils/format.ts";

Deno.test("parseMoney - preserves decimals without rounding", () => {
  assertEquals(parseMoney("0.99"), 0.99);
  assertEquals(parseMoney("12.50"), 12.5);
  assertEquals(parseMoney("100"), 100);
  assertEquals(parseMoney("0"), 0);
});

Deno.test("parseMoney - strips currency symbols and thousands separators", () => {
  assertEquals(parseMoney("$5.00"), 5);
  assertEquals(parseMoney("1,234.56"), 1234.56);
  assertEquals(parseMoney(" $ 1,000 "), 1000);
});

Deno.test("parseMoney - empty and non-numeric return undefined", () => {
  assertEquals(parseMoney(""), undefined);
  assertEquals(parseMoney("   "), undefined);
  assertEquals(parseMoney(null), undefined);
  assertEquals(parseMoney(undefined), undefined);
  assertEquals(parseMoney("abc"), undefined);
  assertEquals(parseMoney("-"), undefined);
  assertEquals(parseMoney("."), undefined);
});

Deno.test("parseMoney - negative values", () => {
  assertEquals(parseMoney("-42.10"), -42.1);
  assertEquals(parseMoney("-$42.10"), -42.1);
});

Deno.test("parseMoney - number passthrough, rejects non-finite", () => {
  assertEquals(parseMoney(7.25), 7.25);
  assertEquals(parseMoney(0), 0);
  assertEquals(parseMoney(Infinity), undefined);
  assertEquals(parseMoney(NaN), undefined);
});

Deno.test("formatMoney - currency, two decimals, zero and null", () => {
  setFormatConfig({ locale: "en-US", currency: "USD" });
  assertEquals(formatMoney(12.5), "$12.50");
  assertEquals(formatMoney(0.99), "$0.99");
  assertEquals(formatMoney(1234.56), "$1,234.56");
  assertEquals(formatMoney(0), "$0.00");
  assertEquals(formatMoney(null), "");
  assertEquals(formatMoney(undefined), "");
});
