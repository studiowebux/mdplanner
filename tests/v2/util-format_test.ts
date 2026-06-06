/**
 * Unit tests for src/utils/format.ts — currency formatting and locale config.
 *
 * format.ts holds module-level locale/currency state; the mutation test runs
 * last and restores the en-US/USD defaults so other tests are unaffected.
 */

import { assertEquals } from "@std/assert";
import {
  formatCurrency,
  getLocale,
  setFormatConfig,
} from "../../src/utils/format.ts";

Deno.test("getLocale — default is en-US", () => {
  assertEquals(getLocale(), "en-US");
});

Deno.test("formatCurrency — default 0 decimals, USD", () => {
  assertEquals(formatCurrency(1000), "$1,000");
  assertEquals(formatCurrency(1234567), "$1,234,567");
  assertEquals(formatCurrency(0), "$0"); // 0 renders, not blank
});

Deno.test("formatCurrency — negative amounts", () => {
  assertEquals(formatCurrency(-500), "-$500");
});

Deno.test("formatCurrency — explicit decimals", () => {
  assertEquals(formatCurrency(1234.56, { decimals: 2 }), "$1,234.56");
  assertEquals(formatCurrency(1000, { decimals: 2 }), "$1,000.00");
});

Deno.test("formatCurrency — null/undefined yield empty string", () => {
  assertEquals(formatCurrency(null), "");
  assertEquals(formatCurrency(undefined), "");
});

Deno.test("setFormatConfig — overrides locale and currency, restorable", () => {
  try {
    setFormatConfig({ locale: "fr-FR", currency: "EUR" });
    assertEquals(getLocale(), "fr-FR");
    // EUR formatting renders a euro sign somewhere in the output.
    const out = formatCurrency(1000);
    assertEquals(out.includes("€"), true);
  } finally {
    setFormatConfig({ locale: "en-US", currency: "USD" });
    assertEquals(getLocale(), "en-US");
  }
});

Deno.test("setFormatConfig — partial update leaves the other field intact", () => {
  try {
    setFormatConfig({ currency: "GBP" });
    assertEquals(getLocale(), "en-US"); // unchanged
    assertEquals(formatCurrency(5).includes("£"), true);
  } finally {
    setFormatConfig({ locale: "en-US", currency: "USD" });
  }
});
